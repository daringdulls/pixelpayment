// Guest registration (POST /api/stays).
// Head office and cashiers go straight to the ledger as before. Outlet staff are tried against the ledger
// first; if it refuses them, the stay is created through the pixel_stay_create database function
// (server-side secret key), after this server has checked the caller is a member of the workspace.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function guests(req, res, { endpoint, key }) {
  const ledger = (p, init = {}) => {
    const target = new URL(endpoint + '/functions/v1/cozy-guest-ledger');
    target.searchParams.set('path', p);
    return fetch(target, { ...init, headers: { Authorization: req.headers.authorization, apikey: key, 'Content-Type': 'application/json' } });
  };
  const relay = async (upstream) => res.status(upstream.status).setHeader('Content-Type', 'application/json').send(await upstream.text());

  try {
    const me = await ledger('/api/data');
    const ws = await me.json().catch(() => ({}));
    if (!me.ok) return res.status(me.status).json({ error: ws.error || 'Unable to verify your access.' });
    const role = ws.member?.role;
    if (role !== 'admin' && role !== 'outlet') return res.status(403).json({ error: 'Your login has no role in this workspace yet.' });

    const b = req.body || {};
    const stay = {
      guest_name: String(b.guest_name || '').trim(),
      room: String(b.room || '').trim(),
      property: String(b.property || '').trim(),
      arrival: String(b.arrival || ''),
      departure: String(b.departure || ''),
    };
    if (!stay.guest_name || stay.guest_name.length > 200) return res.status(400).json({ error: 'Enter the guest’s name.' });
    if (!stay.room || stay.room.length > 40) return res.status(400).json({ error: 'Enter the room number.' });
    if (!stay.property || stay.property.length > 200) return res.status(400).json({ error: 'Enter the property.' });
    if (!ISO.test(stay.arrival) || !ISO.test(stay.departure)) return res.status(400).json({ error: 'Enter valid arrival and departure dates.' });
    if (stay.departure < stay.arrival) return res.status(400).json({ error: 'Departure can’t be before arrival.' });

    // Several outlets may meet the same guest: don't open a second folio for someone already in house.
    const norm = (v) => String(v || '').trim().toLowerCase();
    const dup = (ws.stays || []).find((s) => s.status === 'active' && norm(s.room) === norm(stay.room)
      && norm(s.property) === norm(stay.property) && norm(s.guest_name) === norm(stay.guest_name));
    if (dup) return res.status(409).json({ error: `${dup.guest_name} is already registered in room ${dup.room}. Choose them from the guest list.` });

    const direct = await ledger('/api/stays', { method: 'POST', body: JSON.stringify(stay) });
    if (direct.ok || role === 'admin' || ![401, 403].includes(direct.status)) return relay(direct);

    // Outlet staff refused by the ledger: register through the database function instead.
    const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!service) return res.status(503).json({ error: 'Outlet guest registration needs SUPABASE_SECRET_KEY in the Vercel environment variables.' });
    const r = await fetch(endpoint + '/rest/v1/rpc/pixel_stay_create', {
      method: 'POST',
      headers: { apikey: service, ...(service.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + service }), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_guest_name: stay.guest_name, p_room: stay.room, p_property: stay.property,
        p_arrival: stay.arrival, p_departure: stay.departure, p_actor: ws.email || 'outlet staff',
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      const missing = r.status === 404 || /PGRST202|Could not find the function/i.test(JSON.stringify(err));
      return res.status(missing ? 503 : 400).json({ error: missing ? 'Registering guests from an outlet needs the one-time database setup (the pixel_bill_admin SQL script).' : (err.message || 'Could not register the guest.') });
    }
    return res.status(200).json({ ok: true, id: await r.json().catch(() => null) });
  } catch {
    return res.status(503).json({ error: 'The shared database is temporarily unavailable. Please try again shortly.' });
  }
}
