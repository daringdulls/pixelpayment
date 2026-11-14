// Workspace branding (logo, colour, company details) used on folios and invoices.
// Stored in public.pixel_branding (RLS on, no policies): only this server can read/write it.
// Any signed-in workspace member can read it; only head office administrators can change it.

const TEXT_LIMITS = {
  legal_name: 160, address: 400, phone: 60, email: 120, website: 160, tax_id: 80,
  payment_info: 800, terms: 1200, tagline: 120,
};
const MAX_LOGO = 300 * 1024; // characters of data URL

export async function branding(req, res, path, { endpoint, key }) {
  const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) return res.status(503).json({ error: 'Branding needs SUPABASE_SECRET_KEY in the Vercel environment variables.' });

  const ledger = (p) => {
    const target = new URL(endpoint + '/functions/v1/cozy-guest-ledger');
    target.searchParams.set('path', p);
    return fetch(target, { headers: { Authorization: req.headers.authorization, apikey: key, 'Content-Type': 'application/json' } });
  };
  const rest = (query, init = {}) => fetch(endpoint + '/rest/v1/pixel_branding' + query, {
    ...init,
    headers: {
      apikey: service,
      ...(service.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + service }),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const notSetUp = (r, body) => r.status === 404 || /pixel_branding|PGRST205|42P01/.test(JSON.stringify(body || {}));
  const setupError = 'Branding is not set up yet. Run the pixel_branding SQL script once in the Supabase SQL editor.';

  try {
    const me = await ledger('/api/data');
    const ws = await me.json().catch(() => ({}));
    if (!me.ok) return res.status(me.status).json({ error: ws.error || 'Unable to verify your access.' });

    if (path === '/api/branding') {
      const r = await rest('?select=brand,updated_at&id=eq.default');
      const body = await r.json().catch(() => null);
      if (!r.ok) return res.status(notSetUp(r, body) ? 503 : 502).json({ error: notSetUp(r, body) ? setupError : 'Could not load branding.' });
      return res.status(200).json({ brand: (body && body[0] && body[0].brand) || {}, updated_at: body && body[0] ? body[0].updated_at : null });
    }

    if (path === '/api/branding-save') {
      if (ws.member?.role !== 'admin') return res.status(403).json({ error: 'Only head office administrators can change branding.' });
      const b = req.body || {};
      const brand = {};
      for (const [field, max] of Object.entries(TEXT_LIMITS)) {
        const v = String(b[field] ?? '').trim();
        if (v.length > max) return res.status(400).json({ error: `${field.replace('_', ' ')} is too long (max ${max} characters).` });
        brand[field] = v;
      }
      const color = String(b.color || '').trim();
      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: 'Brand colour must be a hex colour like #0E6B55.' });
      brand.color = color;
      const logo = String(b.logo || '');
      if (logo) {
        const okData = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo);
        if (!okData) return res.status(400).json({ error: 'The logo must be a PNG, JPG or WebP image.' });
        if (logo.length > MAX_LOGO) return res.status(400).json({ error: 'The logo is too large. Use an image under about 200 KB.' });
      }
      brand.logo = logo;
      const row = { id: 'default', brand, updated_at: new Date().toISOString(), updated_by: ws.email || null };
      const r = await rest('?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        return res.status(notSetUp(r, body) ? 503 : 502).json({ error: notSetUp(r, body) ? setupError : 'Could not save branding.' });
      }
      return res.status(200).json({ brand });
    }

    return res.status(404).json({ error: 'Not found.' });
  } catch {
    return res.status(503).json({ error: 'The shared database is temporarily unavailable. Please try again shortly.' });
  }
}
