// Outlet rate cards (price lists used to build itemised bills).
// Stored in public.pixel_rate_cards (see supabase/migrations/*_pixel_rate_cards.sql),
// which has RLS on and no policies, so only this server (secret key) can read or write it.
// Access: head office can read/edit every outlet in the workspace; outlet staff only their own outlet.

const MAX_ITEMS = 500;

export async function rates(req, res, path, { endpoint, key }) {
  const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) return res.status(503).json({ error: 'Rate cards need SUPABASE_SECRET_KEY in the Vercel environment variables.' });

  const ledger = (p) => {
    const target = new URL(endpoint + '/functions/v1/cozy-guest-ledger');
    target.searchParams.set('path', p);
    return fetch(target, { headers: { Authorization: req.headers.authorization, apikey: key, 'Content-Type': 'application/json' } });
  };
  const rest = (query, init = {}) => fetch(endpoint + '/rest/v1/pixel_rate_cards' + query, {
    ...init,
    headers: {
      apikey: service,
      ...(service.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + service }),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const notSetUp = (r, body) => r.status === 404 || /pixel_rate_cards|PGRST205|42P01/.test(JSON.stringify(body || {}));
  const setupError = 'Rate cards are not set up yet. Run the pixel_rate_cards SQL script once in the Supabase SQL editor.';

  try {
    // Who is calling, and which outlets may they see?
    const me = await ledger('/api/data');
    const ws = await me.json().catch(() => ({}));
    if (!me.ok) return res.status(me.status).json({ error: ws.error || 'Unable to verify your access.' });
    const outletIds = (ws.outlets || []).map((o) => String(o.id));
    const admin = ws.member?.role === 'admin';
    const allowed = admin ? outletIds : outletIds.filter((id) => id === String(ws.member?.outlet_id || ''));

    if (path === '/api/rates') {
      if (!allowed.length) return res.status(200).json({ cards: [] });
      const list = allowed.map((id) => '"' + id.replace(/["\\]/g, '') + '"').join(',');
      const r = await rest('?select=outlet_id,currency,fx_rate,items,updated_at,updated_by&outlet_id=in.(' + encodeURIComponent(list) + ')');
      const body = await r.json().catch(() => null);
      if (!r.ok) return res.status(notSetUp(r, body) ? 503 : 502).json({ error: notSetUp(r, body) ? setupError : 'Could not load rate cards.' });
      return res.status(200).json({ cards: body || [] });
    }

    if (path === '/api/rates-save') {
      const b = req.body || {};
      const outletId = String(b.outlet_id || '');
      if (!allowed.includes(outletId)) return res.status(403).json({ error: 'You can only edit your own outlet’s rate card.' });
      const cur = String(b.currency || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(cur)) return res.status(400).json({ error: 'Currency must be a 3-letter code, e.g. USD.' });
      const fx = Number(b.fx_rate);
      if (!(fx > 0 && fx < 1e6)) return res.status(400).json({ error: 'Exchange rate must be a positive number.' });
      if (!Array.isArray(b.items) || b.items.length > MAX_ITEMS) return res.status(400).json({ error: `A rate card can hold up to ${MAX_ITEMS} items.` });
      const items = [];
      for (const it of b.items) {
        const name = String(it?.name || '').trim().slice(0, 120);
        const price = Math.round(Number(it?.price) * 100) / 100;
        if (!name) return res.status(400).json({ error: 'Every item needs a name.' });
        if (!Number.isFinite(price) || Math.abs(price) > 1e6) return res.status(400).json({ error: `Check the price of “${name}”.` });
        items.push({
          id: String(it.id || '').slice(0, 40) || Math.random().toString(36).slice(2, 10),
          category: String(it.category || '').trim().slice(0, 60),
          name,
          price,
        });
      }
      const card = { outlet_id: outletId, currency: cur, fx_rate: fx, items, updated_at: new Date().toISOString(), updated_by: ws.email || null };
      const r = await rest('?on_conflict=outlet_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(card) });
      const body = await r.json().catch(() => null);
      if (!r.ok) return res.status(notSetUp(r, body) ? 503 : 502).json({ error: notSetUp(r, body) ? setupError : 'Could not save the rate card.' });
      return res.status(200).json({ card: Array.isArray(body) && body[0] ? body[0] : card });
    }

    return res.status(404).json({ error: 'Not found.' });
  } catch {
    return res.status(503).json({ error: 'The shared database is temporarily unavailable. Please try again shortly.' });
  }
}
