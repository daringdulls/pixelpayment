// Head-office corrections: edit/delete invoices, edit/void payment receipts, reopen/delete folios.
// The caller must be a workspace administrator (checked against the ledger's own /api/data).
// Writes go through two database functions created by supabase/migrations/*_pixel_bill_admin.sql,
// called with the server-side secret key; browsers cannot call them.

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const METHODS = ['Bank transfer', 'Cash', 'Card', 'Cheque'];

export async function bills(req, res, path, { endpoint, key }) {
  const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) return res.status(503).json({ error: 'Corrections need SUPABASE_SECRET_KEY in the Vercel environment variables.' });

  const ledger = (p) => {
    const target = new URL(endpoint + '/functions/v1/cozy-guest-ledger');
    target.searchParams.set('path', p);
    return fetch(target, { headers: { Authorization: req.headers.authorization, apikey: key, 'Content-Type': 'application/json' } });
  };
  const rpc = (fn, args) => fetch(endpoint + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: service, ...(service.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + service }), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const setupError = 'Corrections need a one-time database setup (the pixel_bill_admin SQL script).';

  try {
    const me = await ledger('/api/data');
    const ws = await me.json().catch(() => ({}));
    if (!me.ok) return res.status(me.status).json({ error: ws.error || 'Unable to verify your access.' });
    if (ws.member?.role !== 'admin') return res.status(403).json({ error: 'Only head office administrators can make corrections.' });

    const b = req.body || {};
    const actor = ws.email || 'head office';
    const isBill = path === '/api/bill-update' || path === '/api/bill-delete';
    const bill = isBill ? (ws.bills || []).find((x) => String(x.id) === String(b.id)) : null;
    if (isBill && !bill) return res.status(404).json({ error: 'That invoice no longer exists.' });
    const paid = bill ? (ws.payments || []).filter((p) => String(p.bill_id) === String(bill.id)).reduce((t, p) => t + (p.amount || 0), 0) : 0;

    let r;
    if (path === '/api/payment-update' || path === '/api/payment-void') {
      // A receipt is one guest payment; split payments share a settlement_id.
      const key = String(b.receipt || '');
      const pays = (ws.payments || []).filter((p) => String(p.settlement_id || p.id) === key);
      if (!key || !pays.length) return res.status(404).json({ error: 'That payment no longer exists.' });
      const label = pays[0].reference || 'payment';
      if (path === '/api/payment-void') {
        const reason = String(b.reason || '').trim();
        if (reason.length < 3 || reason.length > 200) return res.status(400).json({ error: 'Give a short reason for voiding this payment.' });
        r = await rpc('pixel_payment_void', { p_ids: pays.map((p) => String(p.id)), p_label: label, p_reason: reason, p_actor: actor });
      } else {
        const reference = String(b.reference || '').trim();
        if (!ISO.test(String(b.date || ''))) return res.status(400).json({ error: 'Enter a valid payment date.' });
        if (!METHODS.includes(b.method)) return res.status(400).json({ error: 'Choose a payment method.' });
        if (!reference || reference.length > 100) return res.status(400).json({ error: 'Enter a reference (up to 100 characters).' });
        r = await rpc('pixel_payment_update', { p_ids: pays.map((p) => String(p.id)), p_date: b.date, p_method: b.method, p_reference: reference, p_actor: actor });
      }
    } else if (path === '/api/stay-reopen' || path === '/api/stay-delete') {
      const stay = (ws.stays || []).find((s) => String(s.id) === String(b.stay_id));
      if (!stay) return res.status(404).json({ error: 'That folio no longer exists.' });
      if (path === '/api/stay-reopen') {
        if (stay.status === 'active') return res.status(409).json({ error: 'This folio is already open.' });
        r = await rpc('pixel_stay_reopen', { p_id: String(stay.id), p_actor: actor });
      } else {
        if (String(b.confirm || '').trim().toUpperCase() !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm.' });
        r = await rpc('pixel_stay_delete', { p_id: String(stay.id), p_actor: actor });
      }
    } else if (path === '/api/bill-delete') {
      if (paid > 0) return res.status(409).json({ error: 'This invoice has payments recorded against it, so it can’t be deleted. Void the payment first, or edit the amount instead.' });
      r = await rpc('pixel_bill_delete', { p_id: bill.id, p_actor: actor });
    } else {
      const number = String(b.number || '').trim();
      const notes = String(b.notes || '').trim();
      const cents = Math.round(Number(b.amount) * 100);
      const stay = (ws.stays || []).find((s) => String(s.id) === String(b.stay_id));
      if (!number || number.length > 60) return res.status(400).json({ error: 'Enter an invoice number (up to 60 characters).' });
      if ((ws.bills || []).some((x) => x.id !== bill.id && x.outlet_id === bill.outlet_id && String(x.number).toLowerCase() === number.toLowerCase())) {
        return res.status(409).json({ error: `Invoice number ${number} is already used by this outlet.` });
      }
      if (!ISO.test(String(b.date || '')) || !ISO.test(String(b.due || ''))) return res.status(400).json({ error: 'Enter valid invoice and due dates.' });
      if (b.due < b.date) return res.status(400).json({ error: 'The due date can’t be before the invoice date.' });
      if (!(cents > 0) || cents > 1e10) return res.status(400).json({ error: 'Enter an amount greater than zero.' });
      if (cents < paid) return res.status(400).json({ error: 'The amount can’t be lower than what has already been collected on this invoice.' });
      if (!notes || notes.length > 2000) return res.status(400).json({ error: 'Enter a description (up to 2000 characters).' });
      if (!stay) return res.status(400).json({ error: 'Choose the guest stay for this invoice.' });
      r = await rpc('pixel_bill_update', {
        p_id: bill.id, p_number: number, p_date: b.date, p_due: b.due, p_amount_cents: cents, p_notes: notes,
        p_stay_id: stay.id, p_customer: stay.guest_name, p_actor: actor,
      });
    }
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      const missing = r.status === 404 || /PGRST202|Could not find the function/i.test(JSON.stringify(body));
      return res.status(missing ? 503 : 400).json({ error: missing ? setupError : (body.message || 'The change could not be saved.') });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: 'The shared database is temporarily unavailable. Please try again shortly.' });
  }
}
