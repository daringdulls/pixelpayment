// Front-office cashiers.
// The ledger service only knows two roles (admin, outlet). A cashier is stored there as "admin" so they
// can see every guest folio and collect payment, and is listed in public.pixel_staff_roles so this
// server can keep them out of head-office-only areas (staff logins, settings, outlets, rates, corrections).

const service = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const headers = (key, extra = {}) => ({ apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + key }), ...extra });

// Paths a cashier may not use (edge-function actions plus this server's own head-office routes).
export const CASHIER_BLOCKED = new Set([
  '/api/members', '/api/settings', '/api/outlets',
  '/api/staff-create', '/api/staff-reset', '/api/staff-rename',
  '/api/rates-save', '/api/branding-save',
  '/api/bill-update', '/api/bill-delete', '/api/payment-update', '/api/payment-void', '/api/stay-reopen', '/api/stay-delete',
]);

// Email claim of the caller's JWT. Not verified here: the ledger service verifies the signature on every
// call, so a forged token can't get past it, and a cashier can't drop their own email without forging one.
export function jwtEmail(authorization) {
  try {
    const part = String(authorization || '').replace(/^Bearer /, '').split('.')[1];
    const json = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return String(json.email || '').toLowerCase();
  } catch { return ''; }
}

let cache = { at: 0, set: null };
export function forgetCashiers() { cache = { at: 0, set: null }; }

// Set of cashier emails. Empty when the table hasn't been created yet; throws on other failures
// so callers can refuse a blocked action rather than let it through.
export async function cashierEmails(endpoint) {
  if (cache.set && Date.now() - cache.at < 15000) return cache.set;
  const key = service();
  if (!key) return new Set();
  const r = await fetch(endpoint + '/rest/v1/pixel_staff_roles?select=email,role', { headers: headers(key) });
  if (r.status === 404) return new Set();
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    if (/PGRST205|does not exist|Could not find the table/i.test(JSON.stringify(body))) return new Set();
    throw new Error('roles');
  }
  const set = new Set((body || []).filter((x) => x.role === 'cashier').map((x) => String(x.email).toLowerCase()));
  cache = { at: Date.now(), set };
  return set;
}

// Writes to the role table (server-side secret key only).
export async function setCashier(endpoint, email, on) {
  const key = service();
  const url = endpoint + '/rest/v1/pixel_staff_roles' + (on ? '' : '?email=eq.' + encodeURIComponent(email));
  const r = await fetch(url, on
    ? { method: 'POST', headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify({ email, role: 'cashier' }) }
    : { method: 'DELETE', headers: headers(key) });
  forgetCashiers();
  return r;
}
export async function renameCashier(endpoint, from, to) {
  const key = service();
  const r = await fetch(endpoint + '/rest/v1/pixel_staff_roles?email=eq.' + encodeURIComponent(from), {
    method: 'PATCH', headers: headers(key, { 'Content-Type': 'application/json' }), body: JSON.stringify({ email: to }),
  });
  forgetCashiers();
  return r;
}
