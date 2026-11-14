// Staff login management: create username/password logins and reset passwords.
// Requires SUPABASE_SECRET_KEY (new sb_secret_… key) or legacy SUPABASE_SERVICE_ROLE_KEY.
// Server-side only, never sent to the browser.
// Every request is checked against the caller's workspace membership first:
// only head office administrators may manage logins, and only for their own workspace.

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export async function staff(req, res, path, { endpoint, key, domain }) {
  const service = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) {
    return res.status(503).json({ error: 'Username logins are not switched on yet. Add SUPABASE_SECRET_KEY to the Vercel project environment variables, then redeploy.' });
  }

  const callerAuth = req.headers.authorization;
  const ledger = (p, init = {}) => {
    const target = new URL(endpoint + '/functions/v1/cozy-guest-ledger');
    target.searchParams.set('path', p);
    return fetch(target, { ...init, headers: { Authorization: callerAuth, apikey: key, 'Content-Type': 'application/json' } });
  };
  const authAdmin = (p, init = {}) => fetch(endpoint + '/auth/v1/admin/' + p, {
    ...init,
    // New sb_secret_ keys go in the apikey header only; legacy service_role JWTs also go in Authorization.
    headers: { apikey: service, ...(service.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + service }), 'Content-Type': 'application/json' },
  });

  try {
    // 1. Verify the caller is an administrator of this workspace (as the database sees it).
    const me = await ledger('/api/data');
    const workspace = await me.json().catch(() => ({}));
    if (!me.ok) return res.status(me.status).json({ error: workspace.error || 'Unable to verify your access.' });
    if (workspace.member?.role !== 'admin') return res.status(403).json({ error: 'Only head office administrators can manage staff logins.' });

    const members = (workspace.members || []).map((m) => String(m.email || '').toLowerCase());
    const body = req.body || {};
    const password = String(body.password || '');
    if (password.length < 12 || password.length > 72) return res.status(400).json({ error: 'Passwords must be between 12 and 72 characters.' });

    // 2a. Create a username login and assign its role.
    if (path === '/api/staff-create') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!USERNAME.test(username)) {
        return res.status(400).json({ error: 'Usernames are 3–32 characters (letters, numbers, dots, dashes or underscores) and start with a letter or number.' });
      }
      if (!['admin', 'outlet'].includes(body.role)) return res.status(400).json({ error: 'Choose a role.' });
      const email = username + '@' + domain;
      if (members.includes(email)) return res.status(409).json({ error: 'That username is already in use.' });

      const created = await authAdmin('users', {
        method: 'POST',
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, created_via: 'pixel-payment' } }),
      });
      const user = await created.json().catch(() => ({}));
      if (!created.ok) {
        const taken = created.status === 422 || /already/i.test(user.msg || user.message || '');
        return res.status(taken ? 409 : 502).json({ error: taken ? 'That username is already in use.' : (user.msg || user.message || 'Could not create the login.') });
      }

      const assign = await ledger('/api/members', { method: 'POST', body: JSON.stringify({ email, role: body.role, outlet_id: body.outlet_id }) });
      if (!assign.ok) {
        const err = await assign.json().catch(() => ({}));
        await authAdmin('users/' + user.id, { method: 'DELETE' }); // roll back the orphaned login
        return res.status(assign.status).json({ error: err.error || 'Could not assign the role.' });
      }
      return res.status(200).json({ ok: true, username });
    }

    // 2b. Reset the password of an existing workspace member.
    if (path === '/api/staff-reset') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!members.includes(email)) return res.status(404).json({ error: 'That person is not a member of this workspace.' });
      let found = null;
      for (let page = 1; page <= 50 && !found; page++) {
        const r = await authAdmin(`users?page=${page}&per_page=200`);
        const json = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(502).json({ error: 'Could not look up the login.' });
        const list = json.users || [];
        found = list.find((u) => String(u.email || '').toLowerCase() === email) || null;
        if (list.length < 200) break;
      }
      if (!found) return res.status(404).json({ error: 'This person has not created their login yet.' });
      const updated = await authAdmin('users/' + found.id, { method: 'PUT', body: JSON.stringify({ password }) });
      if (!updated.ok) return res.status(502).json({ error: 'Could not update the password.' });
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'Not found.' });
  } catch {
    return res.status(503).json({ error: 'The shared database is temporarily unavailable. Please try again shortly.' });
  }
}
