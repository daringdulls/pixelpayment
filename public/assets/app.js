/*
 * Pixel Payment — staff workspace frontend.
 *
 * Talks to the same backend as the previous build:
 *   GET  /api/config            -> { url, key } for Supabase auth
 *   GET  /api/data              -> workspace snapshot (bearer token attached)
 *   POST /api/<action>          -> stays | outlets | bills | members | payments | settle |
 *                                  settings | approve | approve-stay | checkout | link-bill
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants & helpers
   * ------------------------------------------------------------------ */
  const TZ = 'Indian/Maldives';
  const STATUSES = ['Pending review', 'Unpaid', 'Partially paid', 'Paid', 'Overdue'];
  const METHODS = ['Bank transfer', 'Cash', 'Card', 'Cheque'];

  const ICONS = {
    logo: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    guests: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    invoices: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    payments: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    outlets: '<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M5 13.5V20h14v-6.5"/><path d="M10 20v-4h4v4"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    settings: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M8 16H3v5"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    hash: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>',
  };
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const shiftDate = (iso, days) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtShort = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const money = (cents) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((cents || 0) / 100);
  const compact = (cents) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format((cents || 0) / 100);
  const initials = (s) => String(s || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const sum = (rows, key = 'amount') => rows.reduce((t, r) => t + (r[key] || 0), 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const nights = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));

  function relTime(ts) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h ago';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' d ago';
    return fmtDateTime(ts);
  }

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */
  const nativeFetch = globalThis.fetch.bind(globalThis);
  let sb = null;            // Supabase client
  let data = null;          // current workspace snapshot (live or demo)
  let liveData = null;      // last live snapshot
  let demo = false;
  let demoFull = null;      // full demo dataset (head office view)
  let demoRole = 'admin';   // demo: 'admin' or 'outlet'
  let usernameDomain = 'pixelpayment.local';
  let rateCards = {};       // outlet_id -> { currency, fx_rate, items: [{ id, category, name, price }] }
  let rateError = '';
  let brand = {};           // workspace branding: logo, color, legal_name, address, phone, email, website, tax_id, payment_info, terms, tagline
  let brandError = '';
  const brandColor = () => (/^#[0-9a-f]{6}$/i.test(brand.color || '') ? brand.color : '#0F6E6A');
  function inkOn(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? '#0f1a24' : '#ffffff';
  }
  const legalName = () => brand.legal_name || data.settings.company;
  const docStyle = () => `style="--doc-accent:${brandColor()};--doc-on-accent:${inkOn(brandColor())}"`;
  const brandContacts = () => [brand.phone, brand.email, brand.website].filter(Boolean).map(esc).join(' · ');
  // Two-currency support (USD and MVR). The rate is MVR per 1 USD, set by head office.
  const fxRate = () => Number(brand.fx_usd_mvr) || 0;
  const altCurrency = () => (currency() === 'USD' ? 'MVR' : currency() === 'MVR' ? 'USD' : null);
  const billCurrencies = () => (altCurrency() ? [currency(), altCurrency()] : [currency()]);
  const r2 = (x) => Math.round(x * 100) / 100;
  function convert(a, from, to, rate = fxRate()) {
    if (from === to) return a;
    if (!rate) return NaN;
    if (from === 'USD' && to === 'MVR') return a * rate;
    if (from === 'MVR' && to === 'USD') return a / rate;
    return NaN;
  }
  const fxText = (rate = fxRate()) => `1 USD = ${rate} MVR`;
  const fxLine = (rate = fxRate()) => `Exchange rate: ${fxText(rate)}`;
  const altAmount = (cents) => (altCurrency() && fxRate() ? `${altCurrency()} ${money(Math.round(convert(cents, currency(), altCurrency())))}` : '');
  const brandMark = (cls = '') => (brand.logo
    ? `<img class="brand-logo ${cls}" src="${esc(brand.logo)}" alt="${esc(legalName())}">`
    : `<div class="brand-mark ${cls}">${esc(initials(legalName()))}</div>`);

  // Username logins are stored as <username>@<usernameDomain> in Supabase Auth.
  const isUsernameLogin = (email) => String(email || '').toLowerCase().endsWith('@' + usernameDomain);
  const loginName = (email) => (isUsernameLogin(email) ? String(email).split('@')[0] : String(email || ''));
  const toLoginEmail = (v) => { v = String(v || '').trim(); return v.includes('@') ? v : v.toLowerCase() + '@' + usernameDomain; };
  function genPassword(len = 16) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*-_';
    const bytes = crypto.getRandomValues(new Uint32Array(len));
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  }
  const ui = {
    page: null,
    search: '',
    outletFilter: '',
    statusFilter: '',
    guestQuery: '',
    guestFilter: 'active',
    selectedStay: null,
    authMode: 'signin',
    rateOutlet: null,
    rateDraft: null,
    rateDirty: false,
    rateQuery: '',
  };

  // Attach the Supabase session to all /api calls.
  globalThis.fetch = async (url, opts = {}) => {
    if (typeof url === 'string' && url.startsWith('/api/') && url !== '/api/config' && sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        const headers = new Headers(opts.headers);
        headers.set('Authorization', 'Bearer ' + session.access_token);
        opts = { ...opts, headers };
      }
    }
    return nativeFetch(url, opts);
  };

  /* ------------------------------------------------------------------ *
   * Domain selectors
   * ------------------------------------------------------------------ */
  const isAdmin = () => data?.member?.role === 'admin';
  const currency = () => data.settings.currency;
  const paidFor = (billId) => sum(data.payments.filter((p) => p.bill_id === billId));
  const outstanding = (bill) => bill.amount - paidFor(bill.id);
  const outletName = (id) => data.outlets.find((o) => o.id === id)?.name || 'Unknown outlet';
  const stays = () => data.stays || [];
  const stayOf = (bill) => stays().find((s) => s.id === bill.stay_id);
  const stayMeta = (bill) => { const s = stayOf(bill); return s ? 'Room ' + s.room + ' · ' + s.property : 'Unassigned stay'; };
  const stayLabel = (s) => s.guest_name + ' · Room ' + s.room + ' · ' + s.property + ' · ' + s.arrival + ' to ' + s.departure;
  const billsForStay = (id) => data.bills.filter((b) => b.stay_id === id);

  function billStatus(bill) {
    if (outstanding(bill) <= 0) return 'Paid';
    if (bill.status === 'pending') return 'Pending review';
    if (bill.due < today()) return 'Overdue';
    if (paidFor(bill.id) > 0) return 'Partially paid';
    return 'Unpaid';
  }
  const STATUS_CLASS = { Paid: 'paid', 'Pending review': 'pending', Overdue: 'overdue', 'Partially paid': 'partial', Unpaid: 'unpaid' };
  const statusBadge = (bill) => { const s = billStatus(bill); return `<span class="badge ${STATUS_CLASS[s]}">${s}</span>`; };

  const byNewest = (a, b) => (b.date || '').localeCompare(a.date || '') || String(b.created || '').localeCompare(String(a.created || ''));

  function filteredBills() {
    const q = ui.search.trim().toLowerCase();
    return data.bills
      .filter((b) => (!ui.outletFilter || b.outlet_id === ui.outletFilter)
        && (!ui.statusFilter || billStatus(b) === ui.statusFilter)
        && (!q || [b.number, b.customer, stayMeta(b), outletName(b.outlet_id)].join(' ').toLowerCase().includes(q)))
      .sort(byNewest);
  }

  /* ------------------------------------------------------------------ *
   * Boot & auth
   * ------------------------------------------------------------------ */
  const root = () => document.getElementById('root');

  async function boot() {
    try {
      const res = await nativeFetch('/api/config');
      const cfg = await res.json();
      if (!res.ok) throw new Error(cfg.error || 'Unable to load configuration.');
      if (cfg.usernameDomain) usernameDomain = cfg.usernameDomain;
      sb = window.supabase.createClient(cfg.url, cfg.key, { global: { fetch: nativeFetch } });
      const { data: { session } } = await sb.auth.getSession();
      session ? await load() : renderAuth();
    } catch (err) {
      renderAuth(err.message);
    }
  }

  function renderAuth(notice = '', tone = 'warn') {
    document.body.classList.remove('signed-in');
    const signup = ui.authMode === 'signup';
    root().innerHTML = `
      <div class="auth">
        <aside class="auth-aside">
          <div class="brand-row"><span class="mark">${icon('logo')}</span><div class="wordmark">Pixel Payment<small>Cozy Hospitality</small></div></div>
          <div class="auth-hero">
            <div class="kicker">Staff workspace</div>
            <h1>Every guest.<br>One bill.</h1>
            <p>Outlets post their charges through the day. The front office settles everything in one payment at checkout.</p>
            <ul class="auth-points">
              <li><span class="dot">${icon('layers', 'sm')}</span><span>Restaurant, dive centre, shop and room charges on one consolidated folio.</span></li>
              <li><span class="dot">${icon('shield', 'sm')}</span><span>Role-based access: outlet staff see only their own outlet.</span></li>
              <li><span class="dot">${icon('trend', 'sm')}</span><span>Live view of invoicing, collections and overdue balances.</span></li>
            </ul>
          </div>
          <div class="auth-foot">© ${new Date().getFullYear()} Pixel Payment · Centralised guest billing</div>
        </aside>
        <main class="auth-main">
          <div class="auth-card">
            <div class="mobile-brand"><span class="mark">${icon('logo')}</span><div class="wordmark">Pixel Payment<small>Cozy Hospitality</small></div></div>
            <h2>${signup ? 'Create your account' : 'Welcome back'}</h2>
            <p class="sub">${signup ? 'Use the email address your administrator assigned to you.' : 'Sign in to post outlet charges or settle a guest bill.'}</p>
            <div class="auth-tabs" role="tablist">
              <button type="button" role="tab" aria-selected="${!signup}" data-act="auth-mode" data-arg="signin">Sign in</button>
              <button type="button" role="tab" aria-selected="${signup}" data-act="auth-mode" data-arg="signup">Create account</button>
            </div>
            ${notice ? `<div class="alert ${tone}" style="margin-bottom:16px">${icon(tone === 'success' ? 'checkCircle' : 'info', 'sm')}<span>${esc(notice)}</span></div>` : ''}
            <form id="authForm" novalidate>
              ${signup
                ? '<label class="field"><span>Work email</span><input name="email" type="email" autocomplete="username" placeholder="name@company.com" required></label>'
                : '<label class="field"><span>Username or email</span><input name="email" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="e.g. deck.cashier or name@company.com" required></label>'}
              <label class="field"><span>Password ${signup ? '<span class="hint">· at least 12 characters</span>' : ''}</span><input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" ${signup ? 'minlength="12"' : ''} required></label>
              <div id="authError" class="form-error" role="alert"></div>
              <button type="submit" class="btn primary lg block">${signup ? 'Create account' : 'Sign in'}</button>
              <p class="auth-help">${signup ? 'After confirming your email, an administrator must assign you a role before you can access the workspace.' : 'Use the username or email your head office administrator set up for you.'}</p>
            </form>
            <div class="divider">or</div>
            <button class="btn block" data-act="demo">${icon('eye', 'sm')} Explore the interactive demo</button>
          </div>
        </main>
      </div>`;

    const form = document.getElementById('authForm');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const errBox = document.getElementById('authError');
      errBox.innerHTML = '';
      const values = Object.fromEntries(new FormData(form));
      try {
        if (!form.reportValidity()) return;
        if (signup && values.password.length < 12) throw new Error('Use at least 12 characters for a new password.');
        if (!sb) throw new Error('Database setup is not complete yet.');
        btn.disabled = true;
        if (!signup) values.email = toLoginEmail(values.email);
        const { data: res, error } = signup
          ? await sb.auth.signUp({ email: values.email, password: values.password, options: { emailRedirectTo: location.origin } })
          : await sb.auth.signInWithPassword(values);
        if (error) throw error;
        if (signup && !res.session) {
          ui.authMode = 'signin';
          renderAuth('Check your inbox to confirm your email, then sign in. Your administrator must also assign you a role.', 'success');
          return;
        }
        demo = false;
        await load();
      } catch (err) {
        errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>${esc(err.message)}</span></div>`;
      } finally {
        btn.disabled = false;
      }
    };
    form.querySelector('input').focus();
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    demo = false;
    liveData = null;
    ui.page = null;
    renderAuth();
  }

  // Outlet staff only ever see their own outlet's bills. The backend enforces this; this is a second safeguard.
  function scopeToRole(d) {
    const m = d.member || {};
    if (m.role === 'admin' || !m.outlet_id) return d;
    const bills = (d.bills || []).filter((b) => b.outlet_id === m.outlet_id);
    const ids = new Set(bills.map((b) => b.id));
    return { ...d, bills, payments: (d.payments || []).filter((p) => ids.has(p.bill_id)), outlets: (d.outlets || []).filter((o) => o.id === m.outlet_id) };
  }

  async function loadBranding() {
    if (demo) return;
    try {
      const res = await fetch('/api/branding');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Branding is unavailable.');
      brand = body.brand || {};
      brandError = '';
    } catch (err) {
      brandError = err.message;
    }
    if (!demo && data && !document.querySelector('#modal [role=dialog]')) render();
  }

  async function loadRates() {
    if (demo) return;
    try {
      const res = await fetch('/api/rates');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Rate cards are unavailable.');
      rateCards = Object.fromEntries((body.cards || []).map((c) => [String(c.outlet_id), c]));
      rateError = '';
    } catch (err) {
      rateCards = {};
      rateError = err.message;
    }
    if (!demo && ui.page === 'Rates' && !ui.rateDirty) { ui.rateDraft = null; render(); }
  }

  async function load() {
    try {
      const res = await fetch('/api/data');
      const body = await res.json();
      if (!res.ok) throw Object.assign(new Error(body.error), { status: res.status });
      liveData = scopeToRole(body);
      if (!demo) data = liveData;
      render();
      loadRates();
      loadBranding();
    } catch (err) {
      if (err.status === 401) return renderAuth();
      root().innerHTML = `
        <div class="auth-main" style="min-height:100vh">
          <div class="auth-card" style="text-align:center">
            <span class="mark" style="margin:0 auto 20px;width:44px;height:44px">${icon('logo')}</span>
            <h2>Workspace unavailable</h2>
            <p class="sub">${esc(err.message || 'Something went wrong while loading your workspace.')}</p>
            <div style="display:flex;gap:10px;justify-content:center">
              <button class="btn" data-act="signout">${icon('logout', 'sm')} Back to sign in</button>
              <button class="btn primary" data-act="refresh">${icon('refresh', 'sm')} Try again</button>
            </div>
          </div>
        </div>`;
    }
  }

  /* ------------------------------------------------------------------ *
   * Shell
   * ------------------------------------------------------------------ */
  const NAV_ADMIN = [
    { group: 'Overview', items: [['Overview', 'overview', 'Dashboard']] },
    { group: 'Front office', items: [['Guests', 'guests', 'Guests & folios']] },
    { group: 'Finance', items: [['Invoices', 'invoices', 'Invoices'], ['Payments', 'payments', 'Payments']] },
    { group: 'Operations', items: [['Outlets', 'outlets', 'Outlets'], ['Rates', 'tag', 'Rate cards'], ['Activity', 'activity', 'Activity log']] },
    { group: 'Administration', items: [['Settings', 'settings', 'Settings']] },
  ];
  const NAV_OUTLET = [
    { group: 'My outlet', items: [['Invoices', 'invoices', 'My bills'], ['Rates', 'tag', 'Rate card'], ['Guests', 'guests', 'Guest lookup'], ['Payments', 'payments', 'Collections']] },
  ];
  const navFor = () => (isAdmin() ? NAV_ADMIN : NAV_OUTLET);
  const allowedPages = () => navFor().flatMap((g) => g.items.map((i) => i[0]));
  const pageLabel = (p) => navFor().flatMap((g) => g.items).find((i) => i[0] === p)?.[2] || p;
  const myOutletName = () => data.outlets[0]?.name || 'your outlet';

  function pageCopy(p) {
    if (!isAdmin()) {
      return ({
        Invoices: ['My bills', `Every bill ${esc(myOutletName())} has posted to guest folios. Only your outlet’s bills are shown.`],
        Guests: ['Guest lookup', 'Find an in-house guest to post a bill. Balances show your outlet’s charges only.'],
        Payments: ['Collections', `Payments the front office has collected against ${esc(myOutletName())} bills.`],
        Rates: ['Rate card', `The prices ${esc(myOutletName())} bills to guests. Items appear in the New bill dropdown.`],
      })[p];
    }
    return ({
      Overview: ['Dashboard', 'Billing, collections and outlet performance across the business.'],
      Guests: ['Guests & folios', 'Every in-house guest with their combined charges from all outlets.'],
      Invoices: ['Invoices', 'Outlet bills ready for review and central collection.'],
      Payments: ['Payments', 'Receipts collected by the front office, with their invoice allocations.'],
      Outlets: ['Outlets', 'Billing performance and outstanding balances by outlet.'],
      Activity: ['Activity log', 'An audit trail of submissions, approvals and collections.'],
      Settings: ['Settings', 'Organisation details and staff access.'],
      Rates: ['Rate cards', 'Each outlet’s price list. Outlets pick from these items when they build a bill.'],
    })[p];
  }

  function render() {
    document.body.classList.add('signed-in');
    if (!ui.page || !allowedPages().includes(ui.page)) ui.page = isAdmin() ? 'Overview' : 'Invoices';
    const pending = data.bills.filter((b) => b.status === 'pending').length;
    const myOutlet = !isAdmin() && data.outlets.find((o) => o.id === data.member?.outlet_id);
    const who = isAdmin() ? 'Head office' : myOutlet ? myOutlet.name + ' staff' : 'Outlet staff';
    const nav = navFor().map((g) => `
      <div class="nav-group">
        <div class="nav-label">${g.group}</div>
        ${g.items.map(([name, ic, label]) => `
          <button class="nav-item ${ui.page === name ? 'active' : ''}" data-act="nav" data-arg="${name}" ${ui.page === name ? 'aria-current="page"' : ''}>
            ${icon(ic)}<span>${label}</span>${name === 'Invoices' && isAdmin() && pending ? `<span class="count" title="${pending} awaiting review">${pending}</span>` : ''}
          </button>`).join('')}
      </div>`).join('');

    root().innerHTML = `
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="brand-row"><span class="mark">${icon('logo')}</span><div class="wordmark">Pixel Payment<small>Guest billing</small></div></div>
          <div class="org-switch"><span class="org-avatar">${esc(initials(data.settings.company))}</span><div style="min-width:0"><strong>${esc(data.settings.company)}</strong><small>${who} · ${esc(currency())}</small></div></div>
          <nav aria-label="Main" class="nav-main"><span class="nav-indicator" aria-hidden="true"></span>${nav}</nav>
          <div class="sidebar-foot">
            <div class="user-chip">
              <span class="avatar">${esc(initials(loginName(data.email)))}</span>
              <div class="meta"><strong>${who}</strong><small title="${esc(data.email)}">${esc(loginName(data.email))}</small></div>
              <button class="btn ghost icon sm" data-act="signout" title="Sign out" aria-label="Sign out">${icon('logout', 'sm')}</button>
            </div>
          </div>
        </aside>
        <div class="scrim" id="scrim" hidden data-act="menu"></div>
        <div class="main">
          <header class="topbar">
            <div class="crumbs">
              <button class="btn ghost icon menu-btn" data-act="menu" aria-label="Open navigation">${icon('menu')}</button>
              <span>${esc(data.settings.company)}</span>${icon('chevronRight', 'sm')}<strong>${pageLabel(ui.page)}</strong>
            </div>
            <div class="topbar-right">
              <span class="date">${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })}</span>
              <span class="status-pill ${demo ? 'demo' : ''}">${demo ? 'Demo mode' : 'Live'}</span>
            </div>
          </header>
          <main class="content" id="content">
            ${pageHeader()}
            ${demo ? banner('demo', 'eye', demoRole === 'admin' ? 'Demo · viewing as head office' : 'Demo · viewing as outlet staff (Cozy Scuba Club)', 'Switch roles to see what each user sees. Changes are disabled in the demo.',
              `<div class="chips" role="group" aria-label="View demo as"><button class="chip" aria-pressed="${demoRole === 'admin'}" data-act="demo-role" data-arg="admin">Head office</button><button class="chip" aria-pressed="${demoRole === 'outlet'}" data-act="demo-role" data-arg="outlet">Outlet staff</button></div><button class="btn sm" data-act="demo">Exit demo</button>`) : ''}
            ${!demo && !data.outlets.length ? banner('', 'building', 'Your workspace is ready', 'Add your first outlet to begin posting daily invoices.', isAdmin() ? `<button class="btn sm primary" data-act="form" data-arg="outlet">${icon('plus', 'sm')} Add outlet</button>` : '') : ''}
            ${pageBody()}
            <footer class="footer"><span>© ${new Date().getFullYear()} ${esc(data.settings.company)} · Powered by Pixel Payment</span><span>All amounts in ${esc(currency())} · Times shown in Maldives time</span></footer>
          </main>
        </div>
      </div>`;
    afterRender();
  }

  let lastIndicatorTop = null;
  let lastRenderedPage = null;
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function afterRender() {
    const nav = document.querySelector('.nav-main');
    const ind = nav && nav.querySelector('.nav-indicator');
    const act = nav && nav.querySelector('.nav-item.active');
    if (ind && act) {
      const top = act.offsetTop, h = act.offsetHeight;
      ind.style.height = h + 'px';
      if (lastIndicatorTop !== null && lastIndicatorTop !== top && !reducedMotion()) {
        ind.style.transition = 'none';
        ind.style.transform = `translateY(${lastIndicatorTop}px)`;
        ind.getBoundingClientRect();
        ind.style.transition = '';
      }
      ind.style.transform = `translateY(${top}px)`;
      ind.style.opacity = '1';
      lastIndicatorTop = top;
    }
    const pageKey = ui.page + '|' + (ui.selectedStay || '');
    if (pageKey !== lastRenderedPage) {
      const content = document.getElementById('content');
      if (content && lastRenderedPage !== null && !reducedMotion()) content.classList.add('page-enter');
      lastRenderedPage = pageKey;
    }
  }

  function banner(tone, ic, title, text, action = '') {
    return `<div class="banner ${tone}"><span class="b-icon">${icon(ic)}</span><div class="b-body"><strong>${title}</strong>${text}</div>${action}</div>`;
  }

  function pageHeader() {
    if (ui.page === 'Guests' && ui.selectedStay) return '';
    const [title, sub] = pageCopy(ui.page);
    const newBill = `<button class="btn primary" data-act="form" data-arg="bill">${icon('plus', 'sm')} ${isAdmin() ? 'New invoice' : 'New bill'}</button>`;
    const actions = [];
    if (['Overview', 'Invoices', 'Payments'].includes(ui.page)) actions.push(`<button class="btn" data-act="export">${icon('download', 'sm')} Export CSV</button>`);
    if (ui.page === 'Guests') {
      actions.push(`<button class="btn" data-act="refresh">${icon('refresh', 'sm')} Refresh</button>`);
      actions.push(isAdmin() ? `<button class="btn primary" data-act="form" data-arg="stay">${icon('userPlus', 'sm')} Register guest</button>` : newBill);
    } else if (ui.page === 'Outlets') {
      actions.push(`<button class="btn primary" data-act="form" data-arg="outlet">${icon('plus', 'sm')} Add outlet</button>`);
    } else if (['Overview', 'Invoices', 'Payments'].includes(ui.page)) {
      actions.push(newBill);
    }
    const eyebrow = isAdmin() ? 'Head office' : esc(myOutletName());
    return `<div class="page-head"><div><div class="page-eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div><div class="page-actions">${actions.join('')}</div></div>`;
  }

  function pageBody() {
    switch (ui.page) {
      case 'Guests': return ui.selectedStay ? folioView(ui.selectedStay) : guestsView();
      case 'Overview': return overviewView();
      case 'Invoices': return invoicesView();
      case 'Payments': return paymentsView();
      case 'Outlets': return outletsView();
      case 'Activity': return activityView();
      case 'Rates': return ratesView();
      default: return settingsView();
    }
  }

  function kpi(label, value, ic, foot, tone = '', isMoney = true) {
    return `<div class="kpi">
      <div class="kpi-top"><span>${label}</span><span class="kpi-icon ${tone}">${icon(ic, 'sm')}</span></div>
      <div class="kpi-value">${isMoney ? `<span class="cur">${esc(currency())}</span>${money(value)}` : value}</div>
      <div class="kpi-foot">${foot}</div>
    </div>`;
  }

  function emptyState(ic, title, text, action = '') {
    return `<div class="empty"><div class="e-icon">${icon(ic, 'lg')}</div><strong>${title}</strong>${text}${action ? `<div>${action}</div>` : ''}</div>`;
  }

  /* ------------------------------------------------------------------ *
   * Guests
   * ------------------------------------------------------------------ */
  function guestsView() {
    const all = stays();
    const active = all.filter((s) => s.status === 'active');
    const guestBills = data.bills.filter((b) => b.stay_id);
    const openBalance = guestBills.reduce((t, b) => t + Math.max(0, outstanding(b)), 0);
    const pending = guestBills.filter((b) => b.status === 'pending').length;
    const unassigned = data.bills.filter((b) => !b.stay_id).length;

    return `
      <div class="kpis">
        ${kpi('Guests in house', active.length, 'bed', `${all.length} stays registered`, '', false)}
        ${kpi('Open guest balances', openBalance, 'payments', `${guestBills.filter((b) => outstanding(b) > 0).length} unpaid charges`, 'blue')}
        ${kpi('Guest charges', guestBills.length, 'invoices', isAdmin() ? 'Across all outlets' : 'From your outlet', '', false)}
        ${kpi('Awaiting review', pending, 'clock', pending ? (isAdmin() ? 'Approve before settlement' : 'Waiting for head office review') : 'Nothing pending', pending ? 'amber' : '', false)}
      </div>
      ${!isAdmin() ? banner('', 'info', 'Outlet view', 'You see charges from your assigned outlet only. The front office sees the complete guest bill.') : ''}
      <section class="card">
        <div class="card-head"><div><h2>Guests & rooms</h2><p>Each stay has its own folio, even when a room is reused.</p></div></div>
        <div class="toolbar">
          <div class="search">${icon('search', 'sm')}<input class="input" type="search" aria-label="Search guests" placeholder="Search by guest, room or property…" value="${esc(ui.guestQuery)}" data-input="guestQuery"></div>
          <div class="chips" role="group" aria-label="Stay status">
            ${[['active', 'In house'], ['checked_out', 'Checked out'], ['', 'All']].map(([v, l]) => `<button class="chip" aria-pressed="${ui.guestFilter === v}" data-act="guest-filter" data-arg="${v}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th class="r">Charges</th><th class="r">Balance (${esc(currency())})</th><th>Status</th><th></th></tr></thead>
          <tbody id="guestRows">${guestRows()}</tbody>
        </table></div>
      </section>
      ${unassigned ? `<div style="margin-top:20px">${banner('warn', 'link', `${unassigned} invoice${unassigned > 1 ? 's' : ''} not linked to a guest`, 'Open an unassigned invoice to link it to the correct stay. Existing charges and payments are preserved.', `<button class="btn sm" data-act="nav" data-arg="Invoices">Review invoices</button>`)}</div>` : ''}`;
  }

  function guestRows() {
    const q = ui.guestQuery.trim().toLowerCase();
    const rows = stays()
      .filter((s) => (!ui.guestFilter || (ui.guestFilter === 'active' ? s.status === 'active' : s.status !== 'active')) && stayLabel(s).toLowerCase().includes(q))
      .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));
    if (!rows.length) {
      return `<tr><td colspan="7">${emptyState('guests', stays().length ? 'No matching guests' : 'No guests registered yet',
        stays().length ? 'Try a different search or status filter.' : (isAdmin() ? 'Register a guest with their room and property to open a shared folio.' : 'Ask the front office to register your guests first.'),
        !stays().length && isAdmin() ? `<button class="btn primary" data-act="form" data-arg="stay">${icon('userPlus', 'sm')} Register guest</button>` : '')}</td></tr>`;
    }
    return rows.map((s) => {
      const bills = billsForStay(s.id);
      const balance = sum(bills) - bills.reduce((t, b) => t + paidFor(b.id), 0);
      const n = nights(s.arrival, s.departure);
      return `<tr class="clickable" tabindex="0" data-act="guest" data-arg="${esc(s.id)}">
        <td><div class="person"><span class="avatar">${esc(initials(s.guest_name))}</span><div><span class="primary-text">${esc(s.guest_name)}</span><span class="secondary-text">${esc(s.property)}</span></div></div></td>
        <td><span class="tag">${icon('bed', 'sm')}&nbsp;${esc(s.room)}</span></td>
        <td>${fmtShort(s.arrival)} – ${fmtDate(s.departure)}<span class="secondary-text">${n} night${n === 1 ? '' : 's'}</span></td>
        <td class="r num">${bills.length}</td>
        <td class="r amount">${money(balance)}</td>
        <td>${s.status === 'active' ? '<span class="badge success">In house</span>' : '<span class="badge neutral">Checked out</span>'}</td>
        <td class="r"><span class="row-arrow">${icon('chevronRight', 'sm')}</span></td>
      </tr>`;
    }).join('');
  }

  function folioView(id) {
    const s = stays().find((x) => x.id === id);
    if (!s) return emptyState('guests', 'Guest not found', 'This stay may have been removed.', `<button class="btn" data-act="back-guests">Back to guests</button>`);
    const bills = billsForStay(id).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const total = sum(bills);
    const paid = bills.reduce((t, b) => t + paidFor(b.id), 0);
    const balance = total - paid;
    const pending = bills.filter((b) => b.status === 'pending').length;
    const receipts = new Map();
    for (const p of data.payments.filter((p) => bills.some((b) => b.id === p.bill_id))) {
      const key = p.settlement_id || p.id;
      if (!receipts.has(key)) receipts.set(key, { ...p, amount: 0 });
      receipts.get(key).amount += p.amount;
    }
    const byOutlet = data.outlets.filter((o) => bills.some((b) => b.outlet_id === o.id));
    const settled = balance <= 0 && bills.length;

    let primary = '';
    if (isAdmin() && s.status === 'active') {
      primary = balance > 0
        ? `<button class="btn primary" data-act="settle" data-arg="${esc(id)}" ${pending ? 'disabled title="Approve pending charges first"' : ''}>${icon('payments', 'sm')} Collect payment</button>`
        : `<button class="btn primary" data-act="checkout" data-arg="${esc(id)}">${icon('logout', 'sm')} Complete checkout</button>`;
    }

    return `
      <div class="back-row">
        <button class="btn ghost sm" data-act="back-guests">${icon('chevronLeft', 'sm')} All guests</button>
        <div class="page-actions">
          <button class="btn" data-act="refresh">${icon('refresh', 'sm')} Refresh</button>
          <button class="btn" data-act="print">${icon('printer', 'sm')} Print / PDF</button>
          ${primary}
        </div>
      </div>
      <div id="guestActionError" class="form-error" style="margin-bottom:12px"></div>
      ${!isAdmin() ? banner('', 'info', 'Outlet view', 'Only your outlet’s charges and collections are shown on this folio.') : ''}
      ${pending ? banner('warn', 'clock', `${pending} charge${pending > 1 ? 's' : ''} awaiting review`, 'Pending charges are included in the total. Approve them before collecting a consolidated payment.', isAdmin() ? `<button class="btn sm" data-act="approve-stay" data-arg="${esc(id)}">${icon('check', 'sm')} Approve all</button>` : '') : ''}
      ${folioStatement(s, bills, receipts, byOutlet, { total, paid, balance, pending, settled })}`;
  }

  function folioStatement(s, bills, receipts, byOutlet, { total, paid, balance, pending, settled }) {
    const tx = [
      ...bills.map((b) => ({ date: b.date, ref: b.number, desc: billSummary(b) || 'Outlet charges', outlet: outletName(b.outlet_id), charge: b.amount, credit: 0, id: b.id, pending: b.status === 'pending' })),
      ...[...receipts.values()].map((r) => ({ date: r.date, ref: r.reference, desc: 'Payment received · ' + r.method, outlet: 'Front office', charge: 0, credit: r.amount })),
    ].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (b.charge - a.charge));
    let run = 0;
    tx.forEach((t) => { run += t.charge - t.credit; t.balance = run; });
    const n = nights(s.arrival, s.departure);
    const title = !isAdmin() ? 'Outlet statement' : pending ? 'Provisional folio' : 'Guest folio';
    return `
      <article class="statement-doc" id="guestFolio" ${docStyle()}>
        <header class="lh">
          <div class="lh-top">
            <div class="lh-identity">${brandMark('lh-mark')}${brand.logo ? '' : `<div class="lh-name">${esc(legalName())}</div>`}</div>
            <div class="lh-doc"><h1>${title}</h1><span class="lh-sub">Statement of account</span></div>
          </div>
          <div class="lh-bottom">
            <div class="lh-from">
              ${brand.logo ? `<strong>${esc(legalName())}</strong>` : ''}
              ${brand.tagline ? `<p class="lh-tagline">${esc(brand.tagline)}</p>` : ''}
              ${brand.address ? `<p>${esc(brand.address).replace(/\n/g, '<br>')}</p>` : ''}
              ${brandContacts() ? `<p>${brandContacts()}</p>` : ''}
              ${brand.tax_id ? `<p>Reg. / Tax no. ${esc(brand.tax_id)}</p>` : ''}
            </div>
            <dl class="lh-meta">
              <div><dt>Folio no.</dt><dd class="mono">F-${esc(String(s.id).slice(0, 8).toUpperCase())}</dd></div>
              <div><dt>Statement date</dt><dd>${fmtDate(today())}</dd></div>
              <div><dt>Status</dt><dd>${settled ? 'Settled' : s.status === 'active' ? 'In house' : 'Checked out'}</dd></div>
              <div><dt>Currency</dt><dd>${esc(currency())}</dd></div>
              ${altAmount(0) ? `<div><dt>Exchange rate</dt><dd>${esc(fxText())}</dd></div>` : ''}
            </dl>
          </div>
        </header>
        <section class="st-guest">
          <div><h4>Guest</h4><strong>${esc(s.guest_name)}</strong></div>
          <div><h4>Room</h4><strong>${esc(s.room)}</strong><p>${esc(s.property)}</p></div>
          <div><h4>Stay</h4><strong>${fmtDate(s.arrival)} – ${fmtDate(s.departure)}</strong><p>${n} night${n === 1 ? '' : 's'}</p></div>
          <div class="st-due"><h4>Balance due</h4><strong>${esc(currency())} ${money(balance)}</strong>${altAmount(balance) ? `<p>≈ ${esc(altAmount(balance))}</p>` : ''}</div>
        </section>
        ${!isAdmin() ? `<p class="st-scope">${icon('info', 'sm')} Shows ${esc(myOutletName())} charges and collections only.</p>` : ''}
        <div class="st-table"><table class="st-lines">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Outlet</th><th class="r">Charges</th><th class="r">Payments</th><th class="r">Balance</th></tr></thead>
          <tbody>${tx.length ? tx.map((t) => `<tr class="${t.credit ? 'st-pay' : 'clickable'}" ${t.id ? `tabindex="0" data-act="invoice" data-arg="${esc(t.id)}"` : ''}>
            <td>${fmtDate(t.date)}</td><td class="mono">${esc(t.ref)}</td>
            <td class="wrap">${esc(t.desc)}${t.pending ? ' <span class="st-flag">Pending review</span>' : ''}</td><td>${esc(t.outlet)}</td>
            <td class="r">${t.charge ? money(t.charge) : ''}</td><td class="r">${t.credit ? money(t.credit) : ''}</td><td class="r">${money(t.balance)}</td>
          </tr>`).join('') : `<tr><td colspan="7">${emptyState('invoices', 'No charges yet', 'Outlet charges posted to this stay will appear here.')}</td></tr>`}</tbody>
        </table></div>
        <div class="st-bottom">
          <div class="st-side">
            ${byOutlet.length ? `<h4>Charges by outlet</h4><table class="st-mini"><tbody>${byOutlet.map((o) => `<tr><td>${esc(o.name)}<span>${esc(o.category || '')}</span></td><td class="r">${money(sum(bills.filter((b) => b.outlet_id === o.id)))}</td></tr>`).join('')}</tbody></table>` : ''}
            ${brand.payment_info ? `<h4>Payment details</h4><p class="st-pre">${esc(brand.payment_info)}</p>` : ''}
          </div>
          <div class="st-totals">
            <div><span>Total charges</span><span>${money(total)}</span></div>
            <div><span>Payments received</span><span>− ${money(paid)}</span></div>
            <div class="grand"><span>Balance due</span><span>${esc(currency())} ${money(balance)}</span></div>
            ${altAmount(balance) ? `<div class="alt-due"><span>In ${esc(altCurrency())} at ${esc(fxText())}</span><span>${esc(altAmount(balance))}</span></div>` : ''}
          </div>
        </div>
        <div class="st-sign"><div><span></span>Guest signature</div><div><span></span>For ${esc(legalName())}</div></div>
        <footer class="st-foot">
          ${brand.terms ? `<p class="st-pre">${esc(brand.terms)}</p>` : ''}
          <p>${pending ? 'Provisional statement: pending charges may change after review. ' : ''}All amounts in ${esc(currency())}. Generated ${fmtDateTime(Date.now())} (Maldives time).</p>
        </footer>
      </article>`;
  }

  /* ------------------------------------------------------------------ *
   * Overview
   * ------------------------------------------------------------------ */
  function miniEmpty(ic, title, text) {
    return `<div class="mini-empty">${icon(ic, 'sm')}<div><strong>${title}</strong><span>${text}</span></div></div>`;
  }

  function overviewView() {
    const invoiced = sum(data.bills);
    const collected = sum(data.payments);
    const open = data.bills.filter((b) => outstanding(b) > 0);
    const overdueBills = data.bills.filter((b) => billStatus(b) === 'Overdue');
    const overdue = overdueBills.reduce((t, b) => t + outstanding(b), 0);
    const pendingBills = data.bills.filter((b) => b.status === 'pending');
    const todays = data.bills.filter((b) => b.date === today());
    const inHouse = stays().filter((s) => s.status === 'active').length;
    const recent = data.bills.slice().sort(byNewest).slice(0, 8);
    const attention = [...pendingBills.map((b) => ({ b, kind: 'pending' })), ...overdueBills.map((b) => ({ b, kind: 'overdue' }))];

    const tomorrow = shiftDate(today(), 1);
    const deps = stays().filter((s) => s.status === 'active' && s.departure === tomorrow).map((s) => {
      const bills = billsForStay(s.id);
      const balance = sum(bills) - bills.reduce((t, b) => t + paidFor(b.id), 0);
      const pending = bills.filter((b) => b.status === 'pending').length;
      const state = pending ? ['pending', `${pending} to review`] : balance > 0 ? ['unpaid', 'Payment due'] : ['paid', 'Ready'];
      return { s, balance, state };
    }).sort((a, b) => String(a.s.room).localeCompare(String(b.s.room), undefined, { numeric: true }));

    const perf = data.outlets.map((o) => {
      const bills = data.bills.filter((b) => b.outlet_id === o.id);
      const t = sum(bills), p = bills.reduce((a, b) => a + paidFor(b.id), 0);
      return { o, n: bills.length, t, p, out: t - p };
    }).sort((a, b) => b.t - a.t);

    return `
      <div class="kpis">
        ${kpi('Outstanding', invoiced - collected, 'clock', `${open.length} open invoice${open.length === 1 ? '' : 's'}${altAmount(invoiced - collected) ? ' · ≈ ' + esc(altAmount(invoiced - collected)) : ''}`, 'blue')}
        ${kpi('Billed today', sum(todays), 'invoices', `${todays.length} bill${todays.length === 1 ? '' : 's'} · ${inHouse} guest${inHouse === 1 ? '' : 's'} in house`)}
        ${kpi('Collected', collected, 'trend', `<b>${pct(collected, invoiced)}%</b> of ${esc(currency())} ${compact(invoiced)} billed`)}
        ${kpi('Overdue', overdue, 'alert', overdueBills.length ? `${overdueBills.length} past due date` : 'Nothing overdue', overdueBills.length ? 'red' : '')}
      </div>
      <div class="dash-grid">
        <div class="dash-main">
          <section class="card">
            <div class="card-head"><div><h2>Billing & collections</h2><p>Last 7 days · ${esc(currency())}</p></div><div class="legend"><span><i></i>Billed</span><span><i class="b"></i>Collected</span></div></div>
            <div class="chart-wrap chart">${chartSvg()}</div>
          </section>
          <section class="card">
            <div class="card-head"><div><h2>Recent invoices</h2><p>Latest bills posted by your outlets</p></div><button class="link" data-act="nav" data-arg="Invoices">All invoices ${icon('arrowRight', 'sm')}</button></div>
            <div class="table-wrap"><table class="inv-compact">${invoiceHead()}<tbody>${invoiceRowsHtml(recent)}</tbody></table></div>
          </section>
        </div>
        <aside class="dash-side">
          <section class="card side-card">
            <div class="card-head"><div><h2>Needs attention</h2><p>Bills to review and overdue balances</p></div>${attention.length ? `<span class="badge pending">${attention.length}</span>` : ''}</div>
            ${attention.length ? attention.slice(0, 6).map(({ b, kind }) => `
              <div class="list-row clickable" tabindex="0" data-act="invoice" data-arg="${esc(b.id)}">
                <span class="tile-icon ${kind}">${icon(kind === 'pending' ? 'clock' : 'alert', 'sm')}</span>
                <div class="grow"><strong class="mono">${esc(b.number)}</strong><small>${esc(b.customer)} · ${esc(outletName(b.outlet_id))}</small></div>
                <div class="val">${money(kind === 'pending' ? b.amount : outstanding(b))}<small>${kind === 'pending' ? 'To review' : 'Due ' + fmtShort(b.due)}</small></div>
              </div>`).join('') : miniEmpty('checkCircle', 'All clear', 'Nothing to review and nothing overdue.')}
          </section>
          <section class="card side-card">
            <div class="card-head"><div><h2>Departing tomorrow</h2><p>${fmtDate(tomorrow)}${deps.length ? ` · ${esc(currency())} ${money(deps.reduce((t, d) => t + Math.max(0, d.balance), 0))} to collect` : ''}</p></div>${deps.length ? `<span class="badge info">${deps.length}</span>` : ''}</div>
            ${deps.length ? deps.map(({ s, balance, state }) => `
              <div class="list-row clickable" tabindex="0" data-act="guest-from" data-arg="${esc(s.id)}">
                <span class="avatar">${esc(initials(s.guest_name))}</span>
                <div class="grow"><strong>${esc(s.guest_name)}</strong><small>Room ${esc(s.room)} · ${esc(s.property)}</small></div>
                <div class="val">${money(balance)}<small><span class="badge ${state[0]}">${state[1]}</span></small></div>
              </div>`).join('') : miniEmpty('calendar', 'No departures tomorrow', 'Guests checking out tomorrow will show here.')}
          </section>
          <section class="card side-card">
            <div class="card-head"><div><h2>Outlets</h2><p>Outstanding and share collected</p></div><button class="link" data-act="nav" data-arg="Outlets">Manage</button></div>
            ${perf.length ? perf.map(({ o, n, t, p, out }) => `
              <div class="list-row clickable perf-row" tabindex="0" data-act="outlet-invoices" data-arg="${esc(o.id)}">
                <div class="perf-top"><strong>${esc(o.name)}</strong><span class="perf-due">${money(out)} <small>due</small></span></div>
                <div class="bar-track"><i style="width:${pct(p, t)}%"></i></div>
                <small class="perf-meta">${n} bill${n === 1 ? '' : 's'} · ${money(t)} billed · ${pct(p, t)}% collected</small>
              </div>`).join('') : miniEmpty('outlets', 'No outlets yet', 'Add an outlet to start billing.')}
          </section>
        </aside>
      </div>`;
  }

  function chartSvg() {
    const days = Array.from({ length: 7 }, (_, i) => shiftDate(today(), i - 6));
    const series = days.map((d) => [sum(data.bills.filter((b) => b.date === d)), sum(data.payments.filter((p) => p.date === d))]);
    const rawMax = Math.max(1, ...series.flat());
    const step = niceStep(rawMax / 4);
    const max = step * 4;
    const W = 900, H = 250, L = 48, B = 26, T = 8, plotW = W - L, plotH = H - B - T;
    const gw = plotW / 7, bw = Math.min(26, gw / 4);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Invoiced and collected amounts for the last 7 days">`;
    for (let i = 0; i <= 4; i++) {
      const y = T + plotH - (plotH * i) / 4;
      svg += `<line class="grid-line" x1="${L}" x2="${W}" y1="${y}" y2="${y}"/><text class="axis-label" x="${L - 10}" y="${y + 4}" text-anchor="end">${compact(step * i)}</text>`;
    }
    series.forEach(([inv, col], i) => {
      const cx = L + gw * i + gw / 2;
      const h1 = (inv / max) * plotH, h2 = (col / max) * plotH;
      svg += `<rect class="bar-a" x="${cx - bw - 2}" y="${T + plotH - h1}" width="${bw}" height="${Math.max(h1, inv ? 2 : 0)}" rx="3"><title>${fmtShort(days[i])} · Invoiced ${currency()} ${money(inv)}</title></rect>`;
      svg += `<rect class="bar-b" x="${cx + 2}" y="${T + plotH - h2}" width="${bw}" height="${Math.max(h2, col ? 2 : 0)}" rx="3"><title>${fmtShort(days[i])} · Collected ${currency()} ${money(col)}</title></rect>`;
      svg += `<text class="axis-label" x="${cx}" y="${H - 6}" text-anchor="middle">${i === 6 ? 'Today' : fmtShort(days[i])}</text>`;
    });
    return svg + '</svg>';
  }

  function niceStep(v) {
    const exp = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
    const f = v / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
  }

  /* ------------------------------------------------------------------ *
   * Invoices
   * ------------------------------------------------------------------ */
  const invoiceHead = () => `<thead><tr><th>${isAdmin() ? 'Invoice' : 'Bill no.'}</th><th>Guest</th>${isAdmin() ? '<th>Outlet</th>' : ''}<th>Date</th><th class="r">Amount (${esc(currency())})</th><th class="r">Outstanding</th><th>Status</th><th></th></tr></thead>`;

  function invoiceRowsHtml(rows) {
    if (!rows.length) {
      return `<tr><td colspan="${isAdmin() ? 8 : 7}">${data.bills.length
        ? emptyState('search', 'No matching invoices', 'Try another search term or clear the filters.', `<button class="btn" data-act="clear-filters">Clear filters</button>`)
        : emptyState('invoices', isAdmin() ? 'Your ledger starts here' : 'No bills yet', isAdmin() ? 'Add an outlet, register a guest, then post the first invoice.' : 'Post your first bill to a guest’s folio.', isAdmin() ? '' : `<button class="btn primary" data-act="form" data-arg="bill">${icon('plus', 'sm')} New bill</button>`)}</td></tr>`;
    }
    return rows.map((b) => `
      <tr class="clickable" tabindex="0" data-act="invoice" data-arg="${esc(b.id)}">
        <td><span class="primary-text mono">${esc(b.number)}</span><span class="secondary-text">Due ${fmtDate(b.due)}</span></td>
        <td><span class="primary-text">${esc(b.customer)}</span><span class="secondary-text">${esc(stayMeta(b))}</span></td>
        ${isAdmin() ? `<td>${esc(outletName(b.outlet_id))}</td>` : ''}
        <td>${fmtDate(b.date)}</td>
        <td class="r amount">${money(b.amount)}</td>
        <td class="r muted-amount">${money(outstanding(b))}</td>
        <td>${statusBadge(b)}</td>
        <td class="r"><span class="row-arrow">${icon('chevronRight', 'sm')}</span></td>
      </tr>`).join('');
  }

  function invoicesView() {
    const rows = filteredBills();
    const counts = Object.fromEntries(STATUSES.map((s) => [s, data.bills.filter((b) => billStatus(b) === s).length]));
    return `
      <section class="card">
        <div class="toolbar">
          <div class="search">${icon('search', 'sm')}<input class="input" type="search" aria-label="Search invoices" placeholder="${isAdmin() ? 'Search invoice number, guest or room…' : 'Search bill no., guest or room…'}" value="${esc(ui.search)}" data-input="search"></div>
          ${isAdmin() ? `<select class="input" aria-label="Filter by outlet" data-change="outletFilter">
            <option value="">All outlets</option>
            ${data.outlets.map((o) => `<option value="${esc(o.id)}" ${ui.outletFilter === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}
          </select>` : ''}
        </div>
        <div class="toolbar" style="padding-top:10px;padding-bottom:10px">
          <div class="chips" role="group" aria-label="Filter by status">
            <button class="chip" aria-pressed="${!ui.statusFilter}" data-act="status" data-arg="">All · ${data.bills.length}</button>
            ${STATUSES.map((s) => `<button class="chip" aria-pressed="${ui.statusFilter === s}" data-act="status" data-arg="${s}">${s} · ${counts[s]}</button>`).join('')}
          </div>
        </div>
        <div class="table-wrap"><table>${invoiceHead()}<tbody id="invoiceRows">${invoiceRowsHtml(rows)}</tbody></table></div>
        <div class="table-foot"><span id="rowCount">${rows.length} of ${data.bills.length} ${isAdmin() ? 'invoices' : 'bills'}</span><span id="rowTotal">Outstanding in view: ${esc(currency())} ${money(rows.reduce((t, b) => t + Math.max(0, outstanding(b)), 0))}</span></div>
      </section>`;
  }

  function updateInvoiceRows() {
    const rows = filteredBills();
    document.getElementById('invoiceRows').innerHTML = invoiceRowsHtml(rows);
    document.getElementById('rowCount').textContent = `${rows.length} of ${data.bills.length} ${isAdmin() ? 'invoices' : 'bills'}`;
    document.getElementById('rowTotal').textContent = `Outstanding in view: ${currency()} ${money(rows.reduce((t, b) => t + Math.max(0, outstanding(b)), 0))}`;
  }

  /* ------------------------------------------------------------------ *
   * Payments
   * ------------------------------------------------------------------ */
  function receiptsList() {
    const map = new Map();
    for (const p of data.payments) {
      const key = p.settlement_id || p.id;
      if (!map.has(key)) map.set(key, { ...p, amount: 0, bills: [] });
      const r = map.get(key);
      r.amount += p.amount;
      const bill = data.bills.find((b) => b.id === p.bill_id);
      if (bill) r.bills.push(bill);
    }
    return [...map.values()].sort(byNewest);
  }

  function paymentsView() {
    const receipts = receiptsList();
    const total = sum(receipts);
    const todayTotal = sum(receipts.filter((r) => r.date === today()));
    const methods = METHODS.map((m) => [m, sum(receipts.filter((r) => r.method === m))]).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    return `
      <div class="kpis three">
        ${kpi('Total collected', total, 'payments', `${receipts.length} receipts`)}
        ${kpi('Collected today', todayTotal, 'calendar', `${receipts.filter((r) => r.date === today()).length} receipts today`, 'blue')}
        ${kpi('Top method', methods.length ? `<span style="font-size:22px">${esc(methods[0][0])}</span>` : '—', 'trend', methods.length ? `${pct(methods[0][1], total)}% of collections` : 'No payments yet', '', false)}
      </div>
      ${!isAdmin() ? banner('', 'info', 'Outlet allocations', 'Amounts reflect your outlet’s share of each guest payment.') : ''}
      <section class="card">
        <div class="card-head"><div><h2>Payment receipts</h2><p>One receipt per guest payment. Invoice allocations are included in the CSV export.</p></div>${isAdmin() ? `<button class="link" data-act="nav" data-arg="Guests">Collect from a guest ${icon('arrowRight', 'sm')}</button>` : ''}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Reference</th><th>Guest</th><th>Covers</th><th>Date</th><th>Method</th><th class="r">Amount (${esc(currency())})</th></tr></thead>
          <tbody>${receipts.length ? receipts.map((r) => {
            const first = r.bills[0];
            const target = first ? (first.stay_id ? `data-act="guest-from" data-arg="${esc(first.stay_id)}"` : `data-act="invoice" data-arg="${esc(first.id)}"`) : '';
            return `<tr class="${first ? 'clickable' : ''}" ${target}>
              <td><span class="primary-text mono">${esc(r.reference)}</span></td>
              <td>${first ? `<span class="primary-text">${esc(first.customer)}</span><span class="secondary-text">${esc(stayMeta(first))}</span>` : '—'}</td>
              <td>${r.bills.length} invoice${r.bills.length === 1 ? '' : 's'}<span class="secondary-text">${[...new Set(r.bills.map((b) => outletName(b.outlet_id)))].map(esc).join(', ')}</span></td>
              <td>${fmtDate(r.date)}</td>
              <td><span class="tag">${esc(r.method)}</span></td>
              <td class="r amount">${money(r.amount)}</td>
            </tr>`;
          }).join('') : `<tr><td colspan="6">${emptyState('payments', 'No collections yet', 'Guest payments received by the front office will appear here.')}</td></tr>`}</tbody>
        </table></div>
      </section>`;
  }

  /* ------------------------------------------------------------------ *
   * Outlets
   * ------------------------------------------------------------------ */
  function outletsView() {
    if (!data.outlets.length) {
      return `<section class="card">${emptyState('outlets', 'No outlets yet', 'Create your first outlet to start posting invoices.', isAdmin() ? `<button class="btn primary" data-act="form" data-arg="outlet">${icon('plus', 'sm')} Add outlet</button>` : '')}</section>`;
    }
    return `<div class="outlet-grid">${data.outlets.map((o) => {
      const bills = data.bills.filter((b) => b.outlet_id === o.id);
      const t = sum(bills), p = bills.reduce((a, b) => a + paidFor(b.id), 0);
      const pend = bills.filter((b) => b.status === 'pending').length;
      return `<section class="card outlet-card">
        <div class="top"><span class="tile-icon">${icon('outlets')}</span><div style="flex:1;min-width:0"><h3>${esc(o.name)}</h3><small>${icon('mapPin', 'sm')} ${esc(o.location)}</small></div><span class="tag">${esc(o.category || 'Other')}</span></div>
        <div><div class="big-label">Outstanding</div><div class="big">${esc(currency())} ${money(t - p)}</div></div>
        <div><div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);margin-bottom:6px"><span>Collection rate</span><b style="color:var(--ink)">${pct(p, t)}%</b></div><div class="bar-track"><i style="width:${pct(p, t)}%"></i></div></div>
        <div class="mini-stats"><div>Invoices<b>${bills.length}</b></div><div>Billed<b>${compact(t)}</b></div><div>Pending<b>${pend}</b></div></div>
        <button class="btn sm" data-act="outlet-invoices" data-arg="${esc(o.id)}">View invoices ${icon('arrowRight', 'sm')}</button>
      </section>`;
    }).join('')}</div>`;
  }

  /* ------------------------------------------------------------------ *
   * Activity
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ *
   * Rate cards
   * ------------------------------------------------------------------ */
  const rid = () => Math.random().toString(36).slice(2, 10);
  const cardFor = (oid) => { const c = rateCards[String(oid)]; return c && Array.isArray(c.items) && c.items.length ? c : null; };
  const cardCurrency = (c) => String(c?.currency || currency()).toUpperCase();
  // Rate (MVR per USD) used for a rate card: the workspace rate, else the card's own legacy rate.
  const cardRate = (c) => fxRate() || (cardCurrency(c) === 'USD' ? Number(c?.fx_rate) || 0 : Number(c?.fx_rate) ? 1 / Number(c.fx_rate) : 0);

  // Itemised bills are stored as text lines in the bill description:  "2 × Fun Dive 1 @ USD 81.00"
  const LINE_RE = /^(\d+(?:\.\d+)?)\s*×\s*(.+?)\s*@\s*(?:([A-Z]{3})\s+)?(-?[\d,]*\.?\d+)$/;
  const FX_RE = /^Exchange rate: 1 ([A-Z]{3}) = ([\d.]+) ([A-Z]{3})$/;
  function parseBillLines(notes) {
    const items = [], text = [];
    let fx = null;
    for (const raw of String(notes || '').split(/\r?\n/)) {
      const l = raw.trim();
      if (!l) continue;
      const m = LINE_RE.exec(l), f = FX_RE.exec(l);
      if (m) items.push({ qty: Number(m[1]), name: m[2], cur: m[3] || '', unit: parseFloat(m[4].replace(/,/g, '')) });
      else if (f) fx = { from: f[1], rate: Number(f[2]), to: f[3] };
      else text.push(l);
    }
    return { items, text, fx };
  }
  function billSummary(b) {
    const { items, text } = parseBillLines(b.notes);
    if (!items.length) return text[0] || '';
    const names = items.filter((i) => i.unit >= 0).map((i) => (i.qty !== 1 ? i.qty + ' × ' : '') + i.name);
    return names.slice(0, 2).join(', ') + (names.length > 2 ? ` + ${names.length - 2} more` : '');
  }
  const toCents = (major) => Math.round(Number(major) * 100);
  function parseMoneyCell(v) {
    let t = String(v || '').trim().replace(/[$€£\s]|USD|MVR/gi, '').replace(/,/g, '');
    let neg = false;
    const m = /^\((.+)\)$/.exec(t);
    if (m) { neg = true; t = m[1]; }
    if (!/^-?\d*\.?\d+$/.test(t)) return null;
    const n = parseFloat(t);
    return neg ? -n : n;
  }

  function ratesOutletId() {
    if (!isAdmin()) return data.outlets[0]?.id;
    if (!ui.rateOutlet || !data.outlets.some((o) => o.id === ui.rateOutlet)) ui.rateOutlet = (data.outlets.find((o) => cardFor(o.id)) || data.outlets[0])?.id;
    return ui.rateOutlet;
  }
  function rateDraftFor(oid) {
    if (!ui.rateDraft || ui.rateDraft.outlet_id !== oid) {
      const c = rateCards[String(oid)] || {};
      ui.rateDraft = { outlet_id: oid, currency: cardCurrency(c), fx_rate: Number(c.fx_rate) || 1, items: (c.items || []).map((i) => ({ ...i, id: i.id || rid() })) };
      ui.rateDirty = false;
    }
    return ui.rateDraft;
  }

  function ratesView() {
    const oid = ratesOutletId();
    if (!oid) return `<section class="card">${emptyState('outlets', 'No outlets yet', 'Add an outlet first, then set up its rate card.')}</section>`;
    const d = rateDraftFor(oid);
    const foreign = d.currency !== currency();
    const updated = rateCards[String(oid)]?.updated_at;
    return `
      ${rateError && !demo ? banner('warn', 'alert', 'Rate cards are not available yet', esc(rateError)) : ''}
      <section class="card">
        <div class="toolbar">
          ${isAdmin() ? `<select class="input" data-change="rateOutlet" aria-label="Outlet">${data.outlets.map((o) => `<option value="${esc(o.id)}" ${o.id === oid ? 'selected' : ''}>${esc(o.name)}${cardFor(o.id) ? ' · ' + cardFor(o.id).items.length + ' items' : ''}</option>`).join('')}</select>` : ''}
          <div class="search">${icon('search', 'sm')}<input class="input" type="search" aria-label="Search items" placeholder="Search items or categories…" value="${esc(ui.rateQuery)}" data-input="rateQuery"></div>
          <label class="inline-field">Prices in <input class="input" data-rate-meta="currency" value="${esc(d.currency)}" maxlength="3" aria-label="Price currency" style="width:70px;text-transform:uppercase"></label>

        </div>
        ${foreign || billCurrencies().length > 1 ? `<div class="rate-note">${icon('info', 'sm')} ${fxRate() ? `Outlets can bill in ${esc(billCurrencies().join(' or '))}. Prices convert at the workspace rate ${esc(fxText())}, which is printed on each invoice.` : `Set the USD ↔ MVR exchange rate in Settings to bill in both currencies.`}</div>` : ''}
        <div class="table-wrap"><table class="rate-table">
          <thead><tr><th style="width:28%">Category</th><th>Item</th><th class="r" style="width:160px">Price (${esc(d.currency)})</th><th style="width:52px"></th></tr></thead>
          <tbody id="rateRows">${rateRowsHtml()}</tbody>
        </table></div>
        <datalist id="rateCats">${[...new Set(d.items.map((i) => i.category).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <div class="table-foot rate-foot">
          <div class="btn-row">
            <button class="btn sm" data-act="rate-add">${icon('plus', 'sm')} Add item</button>
            <button class="btn sm" data-act="rate-paste">${icon('copy', 'sm')} Paste from sheet</button>
          </div>
          <div class="btn-row">
            <span id="rateState" class="${ui.rateDirty ? 'dirty' : ''}">${rateStateText()}</span>
            <button class="btn sm" data-act="rate-reset" ${ui.rateDirty ? '' : 'disabled'}>Discard</button>
            <button class="btn sm primary" data-act="rate-save" id="rateSaveBtn">${icon('check', 'sm')} Save rate card</button>
          </div>
        </div>
      </section>
      ${updated ? `<p class="kpi-foot" style="margin-top:10px">Last saved ${esc(fmtDateTime(updated))}${rateCards[String(oid)]?.updated_by ? ' by ' + esc(loginName(rateCards[String(oid)].updated_by)) : ''}.</p>` : ''}`;
  }
  const rateStateText = () => `${ui.rateDraft.items.length} item${ui.rateDraft.items.length === 1 ? '' : 's'}${ui.rateDirty ? ' · unsaved changes' : ''}`;
  function rateRowsHtml() {
    const d = ui.rateDraft, q = ui.rateQuery.trim().toLowerCase();
    const rows = d.items.map((it, idx) => ({ it, idx })).filter(({ it }) => !q || (it.name + ' ' + it.category).toLowerCase().includes(q));
    if (!rows.length) {
      return `<tr><td colspan="4">${d.items.length ? emptyState('search', 'No matching items', 'Try another search.')
        : emptyState('tag', 'No prices yet', 'Add items one by one, or copy your price list from Google Sheets and use “Paste from sheet”.',
            `<div class="btn-row" style="justify-content:center">${/scuba|dive/i.test(outletName(d.outlet_id)) ? `<button class="btn primary" data-act="rate-load-scuba">${icon('download', 'sm')} Load Cozy Scuba Club price list (${SCUBA_PRICES.length} items)</button>` : ''}<button class="btn ${/scuba|dive/i.test(outletName(d.outlet_id)) ? '' : 'primary'}" data-act="rate-paste">${icon('copy', 'sm')} Paste from sheet</button></div>`)}</td></tr>`;
    }
    return rows.map(({ it, idx }) => `<tr>
      <td><input class="input cell" list="rateCats" data-rate-idx="${idx}" data-rate-field="category" value="${esc(it.category || '')}" placeholder="e.g. Fun dives" maxlength="60" aria-label="Category"></td>
      <td><input class="input cell" data-rate-idx="${idx}" data-rate-field="name" value="${esc(it.name || '')}" placeholder="Item name" maxlength="120" aria-label="Item name"></td>
      <td class="r"><input class="input cell r num" type="number" step="0.01" data-rate-idx="${idx}" data-rate-field="price" value="${Number(it.price || 0).toFixed(2)}" aria-label="Price"></td>
      <td class="r"><button class="btn ghost icon sm" data-act="rate-del" data-arg="${idx}" title="Remove" aria-label="Remove ${esc(it.name || 'item')}">${icon('x', 'sm')}</button></td>
    </tr>`).join('');
  }
  function markRateDirty() {
    ui.rateDirty = true;
    const st = document.getElementById('rateState');
    if (st) { st.textContent = rateStateText(); st.className = 'dirty'; }
    const reset = document.querySelector('[data-act="rate-reset"]');
    if (reset) reset.disabled = false;
  }
  async function saveRates() {
    const d = ui.rateDraft;
    d.items = d.items.filter((i) => String(i.name || '').trim() || Number(i.price));
    const nameless = d.items.find((i) => !String(i.name || '').trim());
    if (nameless) { render(); return toast('Every item needs a name.'); }
    if (!/^[A-Z]{3}$/.test(d.currency)) return toast('Currency must be a 3-letter code, e.g. USD.');
    if (d.currency !== currency() && !(Number(d.fx_rate) > 0)) return toast('Enter the exchange rate.');
    if (!requireLive()) return;
    const btn = document.getElementById('rateSaveBtn');
    if (btn) btn.disabled = true;
    try {
      const res = await post('rates-save', { outlet_id: d.outlet_id, currency: d.currency, fx_rate: fxRate() || Number(d.fx_rate) || 1, items: d.items });
      rateCards[String(d.outlet_id)] = res.card;
      ui.rateDraft = null;
      ui.rateDirty = false;
      render();
      toast('Rate card saved. New bills will use these prices.');
    } catch (err) {
      if (btn) btn.disabled = false;
      toast(err.message);
    }
  }
  function applyPaste(form) {
    const d = ui.rateDraft;
    const text = form.querySelector('[name=paste]').value;
    const fallbackCat = form.querySelector('[name=paste_category]').value.trim();
    const replace = form.querySelector('[name=paste_mode]:checked')?.value === 'replace';
    const added = [];
    for (const line of text.split(/\r?\n/)) {
      const cells = line.split('\t').map((c) => c.trim());
      const prices = cells.map(parseMoneyCell).filter((v) => v !== null);
      const words = cells.filter((c) => c && parseMoneyCell(c) === null);
      if (!prices.length || !words.length) continue;
      if (/^(prices?|item|name|category)$/i.test(words[words.length - 1])) continue;
      added.push({ id: rid(), category: words.length > 1 ? words[0] : fallbackCat, name: words[words.length - 1].slice(0, 120), price: prices[prices.length - 1] });
    }
    if (!added.length) {
      form.querySelector('.form-error').innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>No rows with a name and a price were found. Copy the item and price columns from your sheet and paste them here.</span></div>`;
      return;
    }
    d.items = replace ? added : d.items.concat(added);
    ui.rateDirty = true;
    ui.rateQuery = '';
    closeOverlay();
    render();
    toast(`${added.length} item${added.length === 1 ? '' : 's'} added. Review them, then click Save rate card.`);
  }

  /* ------------------------------------------------------------------ *
   * Activity
   * ------------------------------------------------------------------ */
  function activityView() {
    const list = data.activity || [];
    return `<section class="card">
      <div class="card-head"><div><h2>Recent events</h2><p>Latest 100 actions in this workspace</p></div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Action</th><th>Record</th><th>Performed by</th><th>When</th></tr></thead>
        <tbody>${list.length ? list.map((a) => `<tr>
          <td><div class="person"><span class="act-icon">${icon(/pay|collect|settle/i.test(a.action) ? 'payments' : /approv/i.test(a.action) ? 'check' : /guest|stay|check/i.test(a.action) ? 'bed' : 'invoices', 'sm')}</span><span class="primary-text">${esc(a.action)}</span></div></td>
          <td>${esc(a.entity)}</td>
          <td><div class="person"><span class="avatar" style="width:26px;height:26px;font-size:10.5px">${esc(initials(a.actor))}</span>${esc(a.actor)}</div></td>
          <td title="${esc(fmtDateTime(a.created))}">${esc(relTime(a.created))}</td>
        </tr>`).join('') : `<tr><td colspan="4">${emptyState('activity', 'No activity yet', 'Submissions, approvals and collections will be logged here.')}</td></tr>`}</tbody>
      </table></div>
    </section>`;
  }

  /* ------------------------------------------------------------------ *
   * Settings
   * ------------------------------------------------------------------ */
  function settingsView() {
    return `<div class="split">
      <section class="card">
        <div class="card-head"><div><h2>Organisation</h2><p>Shown on guest folios and exports.</p></div></div>
        <form data-form="settings">
          <div class="card-body" style="display:grid;gap:16px">
            <div class="form-grid">
              <label class="field"><span>Company name</span><input name="company" value="${esc(data.settings.company)}" required maxlength="200"></label>
              <label class="field"><span>Currency <span class="hint">· ISO code</span></span><input name="currency" value="${esc(currency())}" required pattern="[A-Za-z]{3}" maxlength="3" style="text-transform:uppercase"></label>
            </div>
            <div class="alert info">${icon('info', 'sm')}<span>The currency is locked once the first invoice has been posted.</span></div>
            <div class="form-error"></div>
          </div>
          <div class="modal-foot" style="border-radius:0 0 var(--radius) var(--radius)"><button class="btn primary" type="submit">Save changes</button></div>
        </form>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Staff &amp; logins</h2><p>Head office sees everything; outlet staff see only their outlet.</p></div><button class="btn sm primary" data-act="form" data-arg="user">${icon('userPlus', 'sm')} Add user</button></div>
        ${data.members.map((m) => `<div class="list-row">
          <span class="avatar">${esc(initials(loginName(m.email)))}</span>
          <div class="grow"><strong>${esc(loginName(m.email))}</strong><small>${isUsernameLogin(m.email) ? 'Username login' : 'Email login'} · ${m.role === 'admin' ? 'All outlets' : esc(outletName(m.outlet_id))}</small></div>
          <span class="badge ${m.role === 'admin' ? 'info' : 'neutral'}">${m.role === 'admin' ? 'Admin' : 'Outlet'}</span>
          <button class="btn ghost icon sm" data-act="form" data-arg="reset" data-arg2="${esc(m.email)}" title="Reset password" aria-label="Reset password for ${esc(loginName(m.email))}">${icon('key', 'sm')}</button>
        </div>`).join('')}
        <div class="folio-note">Username logins work immediately. Email users create their own account with the assigned email and confirm it before signing in.</div>
      </section>
    </div>${exchangeCard()}${brandingCard()}`;
  }

  function exchangeCard() {
    const alt = altCurrency();
    if (!alt) return '';
    return `<section class="card" style="margin-top:20px">
      <div class="card-head"><div><h2>Currencies</h2><p>Bills and payments can be entered in ${esc(currency())} or ${esc(alt)}. ${esc(alt)} amounts are converted to ${esc(currency())} at this rate and the rate is printed on the record.</p></div>
        ${brand.fx_updated_at ? `<span class="hint-line">Updated ${esc(fmtDateTime(brand.fx_updated_at))}</span>` : ''}</div>
      ${brandError && !demo ? `<div class="rate-note warn-note">${icon('alert', 'sm')} ${esc(brandError)}</div>` : ''}
      <form data-form="branding-save">
        <div class="card-body fx-row">
          <label class="inline-field fx-field">1 USD =<input class="input r num" name="fx_usd_mvr" type="number" step="0.0001" min="0.0001" max="999" value="${esc(brand.fx_usd_mvr ?? '')}" placeholder="15.42" required aria-label="MVR per 1 USD">MVR</label>
          <button class="btn primary" type="submit">Save rate</button>
          <div class="form-error"></div>
        </div>
      </form>
    </section>`;
  }

  function brandingCard() {
    const b = brand;
    const ta = (name, label, rows, max, ph, hint = '') => `<label class="field wide"><span>${label}${hint ? ` <span class="hint">· ${hint}</span>` : ''}</span><textarea name="${name}" rows="${rows}" maxlength="${max}" placeholder="${esc(ph)}">${esc(b[name] || '')}</textarea></label>`;
    const tx = (name, label, max, ph, type = 'text') => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(b[name] || '')}" maxlength="${max}" placeholder="${esc(ph)}"></label>`;
    return `<section class="card" style="margin-top:20px">
      <div class="card-head"><div><h2>Branding</h2><p>Logo, colour and company details printed on guest folios and invoices.</p></div></div>
      ${brandError && !demo ? `<div class="rate-note warn-note">${icon('alert', 'sm')} ${esc(brandError)}</div>` : ''}
      <form data-form="branding-save">
        <div class="card-body brand-grid">
          <div class="brand-aside">
            <span class="field-label">Logo</span>
            <div class="logo-drop" id="logoPreview">${b.logo ? `<img src="${esc(b.logo)}" alt="Logo preview">` : `<span>${icon('building', 'lg')}<small>No logo yet</small></span>`}</div>
            <input type="hidden" name="logo" value="${esc(b.logo || '')}">
            <div class="btn-row">
              <label class="btn sm">${icon('download', 'sm')} Upload logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-change="logo-file" hidden></label>
              <button type="button" class="btn sm ghost" data-act="logo-remove">Remove</button>
            </div>
            <p class="hint-line">PNG, JPG, WebP or SVG. It is resized automatically.</p>
            <label class="field"><span>Brand colour</span><div class="color-row"><input type="color" value="${brandColor()}" data-change="brand-color" aria-label="Pick brand colour"><input name="color" value="${esc(brandColor().toUpperCase())}" maxlength="7" pattern="#[0-9A-Fa-f]{6}" data-input="brand-hex" aria-label="Brand colour hex"></div></label>
            <div class="brand-swatch" id="brandSwatch" style="background:${brandColor()};color:${inkOn(brandColor())}">Balance due · ${esc(currency())} 0.00</div>
          </div>
          <div class="form-grid">
            ${tx('legal_name', 'Registered company name', 160, data.settings.company)}
            ${tx('tagline', 'Tagline <span class="hint">· optional</span>', 120, 'e.g. Island guest houses & experiences')}
            ${ta('address', 'Address', 2, 400, 'Street, island / atoll, country')}
            ${tx('phone', 'Phone', 60, '+960 …', 'tel')}
            ${tx('email', 'Email', 120, 'accounts@…', 'email')}
            ${tx('website', 'Website', 160, 'www.…')}
            ${tx('tax_id', 'Tax / registration no.', 80, 'TIN / GST no.')}
            ${ta('payment_info', 'Payment details', 3, 800, 'Bank name, account name, account no., SWIFT · Cards accepted', 'printed on folios and invoices')}
            ${ta('terms', 'Terms & footer note', 3, 1200, 'e.g. Prices include service charge and taxes. Payment is due at checkout.')}
          </div>
        </div>
        <div class="form-error" style="padding:0 20px 14px"></div>
        <div class="modal-foot" style="border-radius:0 0 var(--radius) var(--radius)"><button class="btn primary" type="submit">${icon('check', 'sm')} Save branding</button></div>
      </form>
    </section>`;
  }

  // Resize an uploaded logo to fit within 480×160 and return a PNG data URL (keeps transparency).
  function logoToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('That file is not an image we can use.'));
        img.onload = () => {
          let scale = Math.min(1, 480 / (img.naturalWidth || 480), 160 / (img.naturalHeight || 160));
          for (let i = 0; i < 4; i++) {
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round((img.naturalWidth || 480) * scale));
            c.height = Math.max(1, Math.round((img.naturalHeight || 160) * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            const url = c.toDataURL('image/png');
            if (url.length < 280000) return resolve(url);
            scale *= 0.7;
          }
          reject(new Error('The logo is too detailed. Try a smaller image.'));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------------ *
   * Overlays: modal, drawer, toast
   * ------------------------------------------------------------------ */
  let lastFocus = null;

  function openOverlay(html, label, variant = false) {
    const v = variant === true ? 'drawer' : variant || 'modal';
    lastFocus = document.activeElement;
    document.getElementById('modal').innerHTML = `
      <div class="overlay ${v === 'drawer' ? 'drawer-overlay' : v === 'doc' ? 'doc-overlay' : ''}" data-overlay>
        <section class="${v === 'drawer' ? 'drawer' : v === 'doc' ? 'doc-modal' : 'modal'}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</section>
      </div>`;
    document.querySelector('#modal input:not([type=hidden]), #modal select, #modal .drawer button, #modal button')?.focus();
  }

  function closeOverlay() {
    document.getElementById('modal').innerHTML = '';
    lastFocus?.focus?.();
  }

  function modal(title, subtitle, bodyHtml, footHtml, formName) {
    const inner = `
      <div class="modal-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="btn ghost icon sm" data-act="close" aria-label="Close">${icon('x', 'sm')}</button></div>
      ${formName ? `<form data-form="${formName}" novalidate><div class="modal-body">${bodyHtml}<div class="form-error"></div></div><div class="modal-foot">${footHtml}</div></form>`
        : `<div class="modal-body">${bodyHtml}</div>${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}`}`;
    openOverlay(inner, title);
  }

  function toast(msg) {
    const host = document.getElementById('toast');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon('checkCircle', 'sm')}<span>${esc(msg)}</span>`;
    host.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  const requireLive = () => { if (demo) { toast('Demo mode — exit the demo to make changes.'); return false; } return true; };

  /* ------------------------------------------------------------------ *
   * Forms
   * ------------------------------------------------------------------ */
  const field = (label, name, type = 'text', value = '', attrs = '', cls = '') =>
    `<label class="field ${cls}"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${attrs} required></label>`;
  const moneyField = (label, value = '', attrs = '', cls = '') =>
    `<label class="field ${cls}"><span>${label}</span><div class="input-affix"><span class="affix" data-affix>${esc(currency())}</span><input name="amount" type="number" inputmode="decimal" value="${esc(value)}" min="0.01" step="0.01" ${attrs} required></div></label>`;
  const passwordField = (label, cls = 'wide') => `<label class="field ${cls}"><span>${label} <span class="hint">· 12+ characters</span></span>
    <div class="pw-row"><input name="password" type="text" minlength="12" maxlength="72" required autocomplete="new-password" autocapitalize="none" spellcheck="false" placeholder="Type or generate">
    <button type="button" class="btn" data-act="gen-pass">${icon('refresh', 'sm')} Generate</button>
    <button type="button" class="btn icon" data-act="copy-pass" title="Copy password" aria-label="Copy password">${icon('copy', 'sm')}</button></div></label>`;
  // Next invoice number for an outlet: outlet initials + running sequence, e.g. Cozy Deck -> CD-048.
  function invoicePrefix(outletId) {
    const name = data.outlets.find((o) => o.id === outletId)?.name || 'INV';
    const letters = name.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('');
    return (letters || 'INV').slice(0, 4);
  }
  function nextInvoiceNumber(outletId) {
    const prefix = invoicePrefix(outletId);
    const re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
    const max = data.bills.reduce((m, b) => { const hit = re.exec(String(b.number || '')); return hit ? Math.max(m, parseInt(hit[1], 10)) : m; }, 0);
    return prefix + '-' + String(max + 1).padStart(3, '0');
  }
  const currencySelect = (name, value) => (billCurrencies().length < 2
    ? `<input type="hidden" name="${name}" value="${esc(value)}">`
    : `<label class="field"><span>Currency</span><select name="${name}" data-change="cur-switch">${billCurrencies().map((c) => `<option ${c === value ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="field wide fx-field-row" data-fx-field hidden><span>Exchange rate <span class="hint">· ${fxRate() ? 'from head office, change it if this bill used a different rate' : 'no workspace rate yet, enter the rate used'}</span></span>
        <div class="fx-inline">1 USD = <input name="fx_rate_input" type="number" step="0.0001" min="0.0001" max="999" value="${fxRate() || ''}" placeholder="15.42" data-input="fx-rate" aria-label="MVR per 1 USD"> MVR</div></label>`);
  // Rate (MVR per 1 USD) entered on a form, falling back to the workspace rate.
  const formRate = (form) => Number(form.querySelector('[name=fx_rate_input]')?.value) || fxRate();
  const fxHint = () => (billCurrencies().length > 1 ? '<p class="hint-line wide fx-hint" data-fx-hint></p>' : '');
  function updateFxHint(form) {
    const hint = form.querySelector('[data-fx-hint]');
    if (!hint) return;
    const sel = form.querySelector('[name=bill_currency], [name=pay_currency]');
    const cur = sel ? sel.value : currency();
    const amt = Number(form.querySelector('[name=amount]')?.value) || 0;
    const rate = formRate(form);
    if (cur === currency()) { hint.textContent = altAmount(toCents(amt)) ? `≈ ${altAmount(toCents(amt))} at ${fxText()}` : ''; return; }
    hint.textContent = rate ? `= ${currency()} ${money(toCents(r2(convert(amt, cur, currency(), rate))))} at ${fxText(rate)}. The ${cur} amount and rate are printed on the record.`
      : `Enter the exchange rate to convert ${cur} to ${currency()}.`;
  }
  const methodField = () => `<label class="field"><span>Payment method</span><select name="method">${METHODS.map((m) => `<option>${m}</option>`).join('')}</select></label>`;
  const outletOptions = () => data.outlets.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('');
  const stayOptions = (q = '') => stays().filter((s) => s.status === 'active' && stayLabel(s).toLowerCase().includes(q.toLowerCase()))
    .map((s) => `<option value="${esc(s.id)}">${esc(s.guest_name)} · Room ${esc(s.room)} · ${esc(s.property)}</option>`).join('');
  const footer = (label) => `<button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn primary">${label}</button>`;

  function openForm(kind, arg) {

    if (kind === 'bill' && !data.outlets.length) {
      if (isAdmin()) { toast('Add your first outlet before posting invoices.'); return openForm('outlet'); }
      return toast('Ask your administrator to assign you an outlet.');
    }
    if (kind === 'bill' && !stays().some((s) => s.status === 'active')) {
      toast('Register the guest at the front office first.');
      if (isAdmin()) openForm('stay');
      return;
    }

    if (kind === 'stay') {
      return modal('Register guest stay', 'Opens a new folio that every outlet can post charges to.',
        `<div class="form-grid">
          ${field('Guest name', 'guest_name', 'text', '', 'maxlength="200" placeholder="Full name"', 'wide')}
          ${field('Room number', 'room', 'text', '', 'maxlength="40" placeholder="e.g. 101"')}
          ${field('Property', 'property', 'text', '', 'maxlength="200" placeholder="e.g. Cozy Nest"')}
          ${field('Arrival', 'arrival', 'date', today())}
          ${field('Departure', 'departure', 'date', shiftDate(today(), 1))}
        </div>`, footer('Register guest'), 'stays');
    }

    if (kind === 'outlet') {
      return modal('Add outlet', 'A restaurant, shop, activity centre or other point of sale.',
        `<div class="form-grid">
          ${field('Outlet name', 'name', 'text', '', 'maxlength="200" placeholder="e.g. Cozy Deck"', 'wide')}
          ${field('Location', 'location', 'text', '', 'maxlength="200" placeholder="e.g. Malé"')}
          <label class="field"><span>Type</span><input name="category" list="outletTypes" required placeholder="Choose or type"><datalist id="outletTypes"><option>Restaurant</option><option>Dive center</option><option>Guest house</option><option>Souvenir shop</option><option>Other</option></datalist></label>
        </div>`, footer('Add outlet'), 'outlets');
    }

    if (kind === 'bill') {
      const single = data.outlets.length === 1;
      const first = data.outlets[0]?.id;
      return modal(isAdmin() ? 'New invoice' : 'New bill', 'Post a charge to a guest’s folio.',
        `<div class="form-grid">
          ${single
            ? `<label class="field"><span>Outlet</span><input value="${esc(data.outlets[0].name)}" readonly tabindex="-1"><input type="hidden" name="outlet_id" value="${esc(first)}"></label>`
            : `<label class="field"><span>Outlet</span><select name="outlet_id" required data-change="billOutlet">${outletOptions()}</select></label>`}
          ${field('Bill date', 'date', 'date', today())}
          <div class="field wide"><span>Bill number</span>
            <div class="seg" role="radiogroup" aria-label="Bill numbering">
              <label><input type="radio" name="num_mode" value="auto" checked data-change="numMode"><span>${icon('refresh', 'sm')} Auto-generate</span></label>
              <label><input type="radio" name="num_mode" value="own" data-change="numMode"><span>${icon('hash', 'sm')} Our own bill no. / reference</span></label>
            </div>
            <input id="invoiceNumber" name="number" value="${esc(nextInvoiceNumber(first))}" readonly required maxlength="60" autocomplete="off" aria-describedby="numHint">
            <small class="hint-line" id="numHint">Next number in this outlet’s sequence.</small>
          </div>
          <label class="field wide"><span>Guest</span>
            <div class="search" style="margin-bottom:8px">${icon('search', 'sm')}<input class="input" type="search" placeholder="Filter by name, room or property…" data-input="stayFilter" aria-label="Filter guests"></div>
            <select id="guestSelect" name="stay_id" required><option value="">Select guest and room</option>${stayOptions()}</select>
          </label>
          ${field('Due date', 'due', 'date', today())}
          <div class="wide" id="billBody">${billBodyHtml(first)}</div>
        </div>`, footer(isAdmin() ? 'Submit invoice' : 'Submit bill'), 'bills');
    }

    if (kind === 'user') {
      const mode = arg || 'login';
      const tabs = `<div class="auth-tabs" role="tablist" style="margin:0">
        <button type="button" role="tab" aria-selected="${mode === 'login'}" data-act="form" data-arg="user" data-arg2="login">Username &amp; password</button>
        <button type="button" role="tab" aria-selected="${mode === 'invite'}" data-act="form" data-arg="user" data-arg2="invite">Invite by email</button></div>`;
      const roleFields = `<label class="field"><span>Role</span><select name="role" data-change="role"><option value="outlet">Outlet staff</option><option value="admin">Head office administrator</option></select></label>
        <label class="field" data-outlet-field><span>Outlet</span><select name="outlet_id">${outletOptions()}</select></label>`;
      if (mode === 'login') {
        return modal('Add user', 'Create a login and hand the username and password to the staff member.',
          `${tabs}<div class="form-grid">
            <label class="field wide"><span>Username <span class="hint">· letters, numbers, dots, dashes</span></span><input name="username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,31}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="e.g. deck.cashier"></label>
            ${passwordField('Password')}
            ${roleFields}
          </div>
          <div class="alert info">${icon('info', 'sm')}<span>They sign in with this username and password straight away. No email address needed.</span></div>`,
          footer('Create user'), 'staff-create');
      }
      return modal('Add user', 'The staff member sets their own password.',
        `${tabs}<div class="form-grid">${field('Email address', 'email', 'email', '', 'placeholder="name@company.com"', 'wide')}${roleFields}</div>
        <div class="alert info">${icon('info', 'sm')}<span>They choose <b>Create account</b> on the sign-in page with this email, then confirm it from their inbox.</span></div>`,
        footer('Add user'), 'members');
    }

    if (kind === 'reset') {
      return modal('Reset password', `Set a new password for <b>${esc(loginName(arg))}</b>.`,
        `<input type="hidden" name="email" value="${esc(arg)}">${passwordField('New password')}
        <p class="kpi-foot">Share the new password with them directly. Their old password stops working immediately.</p>`,
        footer('Set password'), 'staff-reset');
    }

    if (kind === 'payment') {
      const b = data.bills.find((x) => x.id === arg);
      const due = outstanding(b);
      return modal('Record payment', `${esc(b.number)} · ${esc(b.customer)}`,
        `<div class="amount-hero" style="margin:0"><div><small>Outstanding on this invoice</small><div class="amt">${esc(currency())} ${money(due)}</div>${altAmount(due) ? `<small>≈ ${esc(altAmount(due))}</small>` : ''}</div>${statusBadge(b)}</div>
        <input type="hidden" name="bill_id" value="${esc(b.id)}"><span hidden data-due="${due}"></span>
        <div class="form-grid">
          ${moneyField('Amount received', (due / 100).toFixed(2), `max="${due / 100}"`)}
          ${currencySelect('pay_currency', currency())}
          ${fxHint()}
          ${field('Payment date', 'date', 'date', today(), `min="${esc(b.date)}" max="${today()}"`)}
          ${methodField()}
          ${field('Receipt / reference', 'reference', 'text', '', 'maxlength="100" placeholder="e.g. RCPT-1024"')}
        </div>`, footer('Record payment'), 'payments');
    }

    if (kind === 'settle') {
      const s = stays().find((x) => x.id === arg);
      const bills = billsForStay(arg);
      const due = sum(bills) - bills.reduce((t, b) => t + paidFor(b.id), 0);
      return modal('Collect guest payment', `${esc(s.guest_name)} · Room ${esc(s.room)} · ${esc(s.property)}`,
        `<div class="amount-hero" style="margin:0"><div><small>Balance across ${bills.length} outlet charge${bills.length === 1 ? '' : 's'}</small><div class="amt">${esc(currency())} ${money(due)}</div>${altAmount(due) ? `<small>≈ ${esc(altAmount(due))}</small>` : ''}</div></div>
        <p class="kpi-foot">Full or partial payments are allocated to the oldest unpaid charges first.</p>
        <input type="hidden" name="stay_id" value="${esc(arg)}"><span hidden data-due="${due}"></span>
        <div class="form-grid">
          ${moneyField('Amount received', (due / 100).toFixed(2), `max="${due / 100}"`)}
          ${currencySelect('pay_currency', currency())}
          ${fxHint()}
          ${field('Payment date', 'date', 'date', today(), `max="${today()}"`)}
          ${methodField()}
          ${field('Receipt / reference', 'reference', 'text', '', 'maxlength="100" placeholder="e.g. RCPT-1024"')}
        </div>`, footer('Record payment'), 'settle');
    }

    if (kind === 'link') {
      return modal('Assign invoice to guest', 'Link this charge to the correct stay.',
        `<input name="id" type="hidden" value="${esc(arg)}">
        <label class="field"><span>Guest stay</span><select name="stay_id" required><option value="">Select a guest</option>${stayOptions()}</select></label>`,
        footer('Assign invoice'), 'link-bill');
    }
  }

  /* Bill body: an item builder from the outlet's rate card, or a plain amount + description. */
  function billBodyHtml(oid) {
    const card = cardFor(oid);
    if (!card) {
      return `<div class="form-grid">
        ${moneyField('Amount', '', 'max="100000000"', billCurrencies().length > 1 ? '' : 'wide')}
        ${currencySelect('bill_currency', currency())}
        ${fxHint()}
        <label class="field wide"><span>Description</span><textarea name="notes" required maxlength="2000" rows="3" placeholder="e.g. Dinner for two – set menu&#10;Each line appears on the invoice"></textarea></label>
        <div class="alert ${rateError ? 'warn' : 'info'} wide">${icon('tag', 'sm')}<span class="grow">${rateError
          ? 'Item dropdown unavailable: ' + esc(rateError)
          : `${esc(outletName(oid))} has no prices on its rate card yet. Add them once and you can pick items from a dropdown here.`}</span>
          <button type="button" class="link" data-act="goto-rates" data-arg="${esc(oid)}">Open rate card</button></div>
      </div>`;
    }
    const listCur = cardCurrency(card);
    const choices = billCurrencies();
    const cur = choices.includes(listCur) ? listCur : currency();
    return `<div class="bill-builder" data-builder data-outlet="${esc(oid)}" data-cur="${esc(cur)}">
      <div class="bb-title"><strong>Items</strong>
        ${choices.length > 1 ? `<label class="inline-field">Bill in <select class="input" data-change="bb-cur" aria-label="Bill currency" style="width:auto">${choices.map((c) => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select></label>` : ''}
        <label class="inline-field bb-rate" ${cur === currency() && listCur === cur ? 'hidden' : ''}>1 USD = <input class="input r" type="number" step="0.0001" min="0.0001" value="${cardRate(card) || ''}" placeholder="15.42" data-input="bb-rate" data-bb="rate" aria-label="MVR per 1 USD" style="width:92px"> MVR</label>
        <span class="hint-line">From the ${esc(outletName(oid))} rate card · list prices in ${esc(listCur)}</span></div>
      <div class="bb-row bb-labels"><span>Item</span><span class="r">Qty</span><span class="r">Unit (${esc(cur)})</span><span class="r">Total</span><span></span></div>
      <div id="bbRows">${bbRowHtml(card)}</div>
      <button type="button" class="btn sm" data-act="bi-add">${icon('plus', 'sm')} Add item</button>
      <div class="bb-foot">
        <label class="inline-field">Discount <input class="input r" type="number" min="0" max="100" step="0.5" value="0" data-input="bi-recalc" data-bb="discount" aria-label="Discount percent" style="width:76px"> %</label>
        <div class="bb-totals" id="bbTotals"></div>
      </div>
      <input type="hidden" name="amount" id="bbAmount" value="">
      <label class="field"><span>Notes <span class="hint">· optional, printed on the invoice</span></span><textarea name="notes" rows="2" maxlength="400" placeholder="e.g. Dive sites, equipment sizes, instructor"></textarea></label>
    </div>`;
  }
  function bbOptions(card) {
    const groups = new Map();
    card.items.forEach((it, i) => { const g = it.category || 'Other'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push([it, i]); });
    return '<option value="">Choose an item…</option>'
      + [...groups].map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(([it, i]) => `<option value="${i}">${esc(it.name)} — ${esc(cardCurrency(card))} ${money(toCents(it.price))}</option>`).join('')}</optgroup>`).join('')
      + '<option value="custom">Other / custom item…</option>';
  }
  const bbRowHtml = (card) => `<div class="bb-row">
      <div class="bb-item"><select class="input" data-change="bi-item" aria-label="Item">${bbOptions(card)}</select><input class="input bb-custom" placeholder="Describe the item" maxlength="120" hidden aria-label="Custom item name"></div>
      <input class="input r" type="number" min="1" step="1" value="1" data-input="bi-recalc" data-bb="qty" aria-label="Quantity">
      <input class="input r" type="number" step="0.01" value="" placeholder="0.00" data-input="bi-recalc" data-bb="price" aria-label="Unit price">
      <span class="bb-line num">0.00</span>
      <button type="button" class="btn ghost icon sm" data-act="bi-remove" aria-label="Remove item">${icon('x', 'sm')}</button>
    </div>`;
  function bbState(builder) {
    const card = cardFor(builder.dataset.outlet);
    const cur = builder.dataset.cur || cardCurrency(card), rate = Number(builder.querySelector('[data-bb=rate]')?.value) || cardRate(card);
    const rows = [...builder.querySelectorAll('#bbRows .bb-row')].map((row) => {
      const sel = row.querySelector('select').value;
      const custom = row.querySelector('.bb-custom');
      const qty = Number(row.querySelector('[data-bb=qty]').value) || 0;
      const price = Number(row.querySelector('[data-bb=price]').value) || 0;
      const name = sel === 'custom' ? custom.value.trim() : sel !== '' ? card.items[Number(sel)].name : '';
      return { row, sel, name, qty, price, line: Math.round(qty * price * 100) / 100 };
    });
    const used = rows.filter((r) => r.sel !== '');
    const subtotal = used.reduce((t, r) => t + r.line, 0);
    const pct = Math.min(100, Math.max(0, Number(builder.querySelector('[data-bb=discount]').value) || 0));
    const discount = Math.round(subtotal * pct) / 100;
    const net = Math.round((subtotal - discount) * 100) / 100;
    return { card, cur, rate, rows, used, subtotal, pct, discount, net, charged: r2(convert(net, cur, currency(), rate)) };
  }
  function bbRecalc(builder) {
    const st = bbState(builder);
    st.rows.forEach((r) => { r.row.querySelector('.bb-line').textContent = money(toCents(r.line)); });
    builder.querySelector('#bbAmount').value = st.charged > 0 ? st.charged.toFixed(2) : '';
    if (!Number.isFinite(st.charged)) st.charged = 0;
    const foreign = st.cur !== currency();
    builder.querySelector('#bbTotals').innerHTML = `
      <div><span>Subtotal</span><span>${esc(st.cur)} ${money(toCents(st.subtotal))}</span></div>
      ${st.pct ? `<div><span>Discount ${st.pct}%</span><span>− ${esc(st.cur)} ${money(toCents(st.discount))}</span></div>` : ''}
      ${foreign ? `<div><span>Total</span><span>${esc(st.cur)} ${money(toCents(st.net))}</span></div><div class="bb-fx"><span>${st.rate ? 'at ' + esc(fxText(st.rate)) : 'Enter the exchange rate above'}</span></div>` : ''}
      <div class="grand"><span>Charge to guest</span><span>${esc(currency())} ${money(toCents(st.charged))}</span></div>`;
  }
  function bbCompose(form) {
    const builder = form.querySelector('[data-builder]');
    const st = bbState(builder);
    if (!st.used.length) return 'Add at least one item.';
    const unnamed = st.used.find((r) => !r.name);
    if (unnamed) return 'Describe the custom item.';
    if (st.used.some((r) => !(r.qty > 0))) return 'Quantities must be at least 1.';
    if ((st.cur !== currency() || cardCurrency(st.card) !== st.cur) && !(st.rate > 0)) return 'Enter the exchange rate (MVR per 1 USD).';
    if (!(st.charged > 0)) return 'The bill total must be more than zero.';
    const lines = st.used.map((r) => `${r.qty} × ${r.name.replace(/\s*@\s*/g, ' at ')} @ ${st.cur} ${r.price.toFixed(2)}`);
    if (st.pct) lines.push(`1 × Discount ${st.pct}% @ ${st.cur} -${st.discount.toFixed(2)}`);
    if (st.cur !== currency()) lines.push(fxLine(st.rate));
    const extra = form.querySelector('[name=notes]').value.trim();
    const notes = lines.join('\n') + (extra ? '\n' + extra : '');
    if (notes.length > 2000) return 'Too many items for one bill. Split it into two bills.';
    return { notes, amount: st.charged.toFixed(2) };
  }

  async function post(action, body) {
    const res = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed (' + res.status + ').');
    return json;
  }

  async function submitForm(form) {
    const name = form.dataset.form;
    const btn = form.querySelector('button[type="submit"]');
    const errBox = form.querySelector('.form-error');
    errBox.innerHTML = '';
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    if (name === 'settings') values.currency = values.currency.toUpperCase();
    if (name === 'rates-paste') return applyPaste(form);
    if (name === 'bills') {
      delete values.num_mode;
      if (form.querySelector('[data-builder]')) {
        const composed = bbCompose(form);
        if (typeof composed === 'string') {
          errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>${esc(composed)}</span></div>`;
          return;
        }
        Object.assign(values, composed);
      }
      const bc = values.bill_currency || currency();
      const billRate = formRate(form);
      delete values.bill_currency;
      delete values.fx_rate_input;
      if (!form.querySelector('[data-builder]') && bc !== currency()) {
        const amt = Number(values.amount), conv = r2(convert(amt, bc, currency(), billRate));
        if (!(conv > 0)) { errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>Enter the exchange rate (MVR per 1 USD) to bill in ${esc(bc)}.</span></div>`; return; }
        const lines = String(values.notes || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        values.notes = [`1 × ${(lines[0] || 'Outlet charges').replace(/\s*@\s*/g, ' at ')} @ ${bc} ${amt.toFixed(2)}`, fxLine(billRate), ...lines.slice(1)].join('\n');
        values.amount = conv.toFixed(2);
      }
      values.number = String(values.number || '').trim();
      if (data.bills.some((b) => b.outlet_id === values.outlet_id && String(b.number).toLowerCase() === values.number.toLowerCase())) {
        errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>Bill number ${esc(values.number)} already exists for this outlet.</span></div>`;
        return;
      }
    }
    if (name === 'payments' || name === 'settle') {
      const pc = values.pay_currency || currency();
      const payRate = formRate(form);
      delete values.pay_currency;
      delete values.fx_rate_input;
      if (pc !== currency()) {
        const amt = Number(values.amount);
        let conv = r2(convert(amt, pc, currency(), payRate));
        const dueEl = form.querySelector('[data-due]');
        const dueMajor = dueEl ? Number(dueEl.dataset.due) / 100 : null;
        if (dueMajor !== null && Math.abs(conv - dueMajor) < 0.02) conv = dueMajor; // full payment: absorb rounding
        if (!(conv > 0)) { errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>Enter the exchange rate (MVR per 1 USD) to take ${esc(pc)}.</span></div>`; return; }
        if (dueMajor !== null && conv > dueMajor) { errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>That is more than the balance (${esc(currency())} ${money(toCents(dueMajor))}).</span></div>`; return; }
        values.amount = conv.toFixed(2);
        values.reference = `${values.reference} · paid ${pc} ${amt.toFixed(2)} at ${fxText(payRate)}`.slice(0, 100);
      }
    }
    if (!requireLive()) return;
    btn.disabled = true;
    try {
      await post(name, values);
      if (name !== 'settings') closeOverlay();
      await load();
      toast(name === 'branding-save' && 'fx_usd_mvr' in values && !('legal_name' in values) ? 'Exchange rate saved.' : { settings: 'Settings saved.', 'staff-create': 'User created. Share the username and password with them.', 'staff-reset': 'Password updated.', 'branding-save': 'Branding saved. Folios and invoices now use it.', members: 'User added. They can now create their account.' }[name] || 'Saved to your workspace.');
    } catch (err) {
      errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>${esc(err.message)}</span></div>`;
      btn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ *
   * Invoice drawer
   * ------------------------------------------------------------------ */
  function openInvoice(id) {
    const b = data.bills.find((x) => x.id === id);
    if (!b) return;
    const o = data.outlets.find((x) => x.id === b.outlet_id) || { name: outletName(b.outlet_id) };
    const s = stayOf(b);
    const pays = data.payments.filter((p) => p.bill_id === id).sort((a, c) => (a.date || '').localeCompare(c.date || ''));
    const paid = paidFor(id), due = outstanding(b), status = billStatus(b);
    const lines = String(b.notes || 'Outlet charges').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed = parseBillLines(b.notes);
    const itemCur = parsed.items[0]?.cur || currency();
    const foreign = parsed.items.length && itemCur !== currency();
    const itemTotal = parsed.items.reduce((t, i) => t + Math.round(i.qty * i.unit * 100), 0);
    let primary = '';
    if (isAdmin() && b.status === 'pending') primary = `<button class="btn sm primary" data-act="approve" data-arg="${esc(id)}" id="approveBtn">${icon('check', 'sm')} Approve</button>`;
    else if (isAdmin() && due > 0) primary = `<button class="btn sm primary" data-act="form" data-arg="payment" data-arg2="${esc(id)}">${icon('payments', 'sm')} Record payment</button>`;

    openOverlay(`
      <div class="doc-bar">
        <div class="doc-bar-title">${icon('invoices', 'sm')}<span class="mono">${esc(b.number)}</span>${statusBadge(b)}</div>
        <div class="doc-bar-actions">
          ${b.stay_id ? `<button class="btn sm ghost" data-act="guest-from" data-arg="${esc(b.stay_id)}">${icon('bed', 'sm')} Guest folio</button>` : ''}
          <button class="btn sm" data-act="print-doc">${icon('printer', 'sm')} Print / PDF</button>
          ${primary}
          <button class="btn ghost icon sm" data-act="close" aria-label="Close">${icon('x', 'sm')}</button>
        </div>
      </div>
      <div id="detailError" class="form-error doc-error"></div>
      ${!b.stay_id && isAdmin() ? `<div class="alert warn doc-alert">${icon('link', 'sm')}<span class="grow">This invoice isn’t linked to a guest stay.</span><button class="link" data-act="form" data-arg="link" data-arg2="${esc(id)}">Assign guest</button></div>` : ''}
      <article class="invoice-doc" ${docStyle()} aria-label="Invoice ${esc(b.number)}">
        ${status === 'Paid' ? '<div class="doc-stamp">Paid</div>' : ''}
        <header class="lh">
          <div class="lh-top">
            <div class="lh-identity">${brandMark('lh-mark')}${brand.logo ? '' : `<div class="lh-name">${esc(legalName())}</div>`}</div>
            <div class="lh-doc"><h1>Invoice</h1><span class="lh-sub">${esc(o.name)}</span></div>
          </div>
          <div class="lh-bottom">
            <div class="lh-from">
              <strong>${esc(o.name)}</strong>
              <p>${esc([o.category, o.location].filter(Boolean).join(' · '))}</p>
              <p>An outlet of ${esc(legalName())}</p>
              ${brandContacts() ? `<p>${brandContacts()}</p>` : ''}
              ${brand.tax_id ? `<p>Reg. / Tax no. ${esc(brand.tax_id)}</p>` : ''}
            </div>
            <dl class="lh-meta">
              <div><dt>Invoice no.</dt><dd class="mono">${esc(b.number)}</dd></div>
              <div><dt>Invoice date</dt><dd>${fmtDate(b.date)}</dd></div>
              <div><dt>Due date</dt><dd>${fmtDate(b.due)}</dd></div>
              <div><dt>Billed in</dt><dd>${esc(foreign ? itemCur : currency())}</dd></div>
            </dl>
          </div>
        </header>
        <section class="inv-parties">
          <div><h4>Billed to</h4><strong>${esc(b.customer)}</strong>
            <p>${s ? `Room ${esc(s.room)} · ${esc(s.property)}` : 'No guest stay linked'}</p>
            ${s ? `<p>Stay ${fmtDate(s.arrival)} – ${fmtDate(s.departure)}</p>` : ''}</div>
          <div><h4>Issued by</h4><strong>${esc(o.name)}</strong>
            <p>${esc(o.location || '')}</p><p>${esc(o.category || '')}</p></div>
          <div><h4>Payment</h4><strong>${esc(legalName())} front office</strong>
            <p>Settled on the guest’s consolidated bill</p><p>Status: ${esc(status)}</p></div>
        </section>
        <table class="inv-lines">
          <thead><tr><th class="c-no">#</th><th>Description</th><th class="r c-qty">Qty</th><th class="r c-amt">Unit price${foreign ? ' (' + esc(itemCur) + ')' : ''}</th><th class="r c-amt">Amount${foreign ? ' (' + esc(itemCur) + ')' : ''}</th></tr></thead>
          <tbody>
            ${parsed.items.length ? parsed.items.map((it, i) => `<tr class="${it.unit < 0 ? 'inv-discount' : ''}"><td>${i + 1}</td><td><strong>${esc(it.name)}</strong></td>
              <td class="r">${esc(it.qty)}</td><td class="r">${money(Math.round(it.unit * 100))}</td><td class="r">${money(Math.round(it.qty * it.unit * 100))}</td></tr>`).join('')
            : `<tr><td>1</td><td><strong>${esc(lines[0])}</strong>${lines.slice(1).map((l) => `<div class="inv-sub">${esc(l)}</div>`).join('')}</td>
              <td class="r">1</td><td class="r">${money(b.amount)}</td><td class="r">${money(b.amount)}</td></tr>`}
          </tbody>
        </table>
        ${parsed.items.length && parsed.text.length ? `<div class="inv-remarks"><h4>Notes</h4>${parsed.text.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
        <div class="inv-bottom">
          <div class="inv-notes">
            <h4>Payments received</h4>
            ${pays.length ? `<table class="inv-pays"><tbody>${pays.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.method)}</td><td class="mono">${esc(p.reference)}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</tbody></table>` : '<p>No payments recorded yet.</p>'}
          </div>
          <div class="inv-totals">
            ${foreign ? `<div><span>Subtotal (${esc(itemCur)})</span><span>${money(itemTotal)}</span></div>
            <div class="inv-fx"><span>Exchange rate</span><span>${parsed.fx ? esc('1 ' + parsed.fx.from + ' = ' + parsed.fx.rate + ' ' + parsed.fx.to) : '—'}</span></div>
            <div><span>Invoice total (${esc(currency())})</span><span>${money(b.amount)}</span></div>`
            : `<div><span>Subtotal</span><span>${money(b.amount)}</span></div>`}
            <div><span>Payments received</span><span>− ${money(paid)}</span></div>
            <div class="grand"><span>Balance due</span><span>${esc(currency())} ${money(due)}</span></div>
            ${altAmount(due) ? `<div class="alt-due"><span>In ${esc(altCurrency())} at ${esc(fxText())}</span><span>${esc(altAmount(due))}</span></div>` : ''}
          </div>
        </div>
        <footer class="inv-foot">
          <div class="inv-brandline">${brandMark('sm')}<div><strong>${esc(legalName())}</strong><span>${[brand.address ? esc(brand.address).replace(/\n/g, ', ') : '', brandContacts(), brand.tax_id ? 'Reg. / Tax no. ' + esc(brand.tax_id) : ''].filter(Boolean).join(' · ')}</span></div></div>
          ${brand.payment_info ? `<p class="st-pre"><b>Payment details</b><br>${esc(brand.payment_info)}</p>` : ''}
          ${brand.terms ? `<p class="st-pre">${esc(brand.terms)}</p>` : ''}
          <p>Posted by ${esc(loginName(b.created_by))} · ${b.status === 'pending' ? 'Awaiting head office review' : 'Approved for collection'}</p>
          <p>This charge is collected by the ${esc(data.settings.company)} front office as part of the guest’s consolidated bill. All amounts in ${esc(currency())}.</p>
        </footer>
      </article>`, 'Invoice ' + b.number, 'doc');
  }

  async function approve(id) {
    if (!requireLive()) return;
    const btn = document.getElementById('approveBtn');
    if (btn) btn.disabled = true;
    try {
      await post('approve', { id });
      await load();
      openInvoice(id);
      toast('Invoice approved and ready for collection.');
    } catch (err) {
      document.getElementById('detailError').innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>${esc(err.message)}</span></div>`;
      if (btn) btn.disabled = false;
    }
  }

  async function guestAction(action, stayId) {
    if (!requireLive()) return;
    if (action === 'checkout' && !confirm('Complete checkout and close this guest’s folio?')) return;
    try {
      await post(action, { stay_id: stayId });
      await load();
      toast(action === 'checkout' ? 'Guest checked out. Folio closed.' : 'All guest charges approved.');
    } catch (err) {
      const box = document.getElementById('guestActionError');
      if (box) box.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>${esc(err.message)}</span></div>`;
    }
  }

  /* ------------------------------------------------------------------ *
   * CSV export
   * ------------------------------------------------------------------ */
  function exportCsv() {
    const rows = ui.page === 'Payments'
      ? [['Reference', 'Invoice', 'Customer', 'Outlet', 'Date', 'Method', 'Amount', 'Currency'],
        ...data.payments.map((p) => {
          const b = data.bills.find((x) => x.id === p.bill_id) || {};
          return [p.reference, b.number, b.customer, outletName(b.outlet_id), p.date, p.method, (p.amount / 100).toFixed(2), currency()];
        })]
      : [['Invoice', 'Guest', 'Room / property', 'Outlet', 'Date', 'Due', 'Total', 'Collected', 'Outstanding', 'Currency', 'Status'],
        ...(ui.page === 'Invoices' ? filteredBills() : data.bills).map((b) => [b.number, b.customer, stayMeta(b), outletName(b.outlet_id), b.date, b.due,
          (b.amount / 100).toFixed(2), (paidFor(b.id) / 100).toFixed(2), (outstanding(b) / 100).toFixed(2), currency(), billStatus(b)])];
    // Prefix formula-like values to prevent CSV injection in spreadsheet apps.
    const csv = rows.map((r) => r.map((v) => '"' + String(/^[=+@\t\r-]/.test(String(v ?? '')) ? "'" + v : v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (demo ? 'demo-' : '') + 'pixel-payment-' + ui.page.toLowerCase() + '-' + today() + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------ *
   * Demo workspace
   * ------------------------------------------------------------------ */
  function toggleDemo() {
    demo = !demo;
    closeOverlay();
    if (!demo) {
      rateCards = {}; ui.rateDraft = null; ui.rateDirty = false; ui.rateOutlet = null;
      brand = {};
      loadRates();
      loadBranding();
      if (!liveData) return renderAuth();
      data = liveData;
      ui.selectedStay = null;
      return render();
    }
    const t = today();
    const d = (n) => shiftDate(t, n);
    const outlets = [
      { id: 'd1', name: 'Cozy Nest', location: 'Guest house', category: 'Guest house' },
      { id: 'd2', name: 'Cozy Deck', location: 'Waterfront', category: 'Restaurant' },
      { id: 'd3', name: 'Cozy Scuba Club', location: 'Harbour', category: 'Dive center' },
      { id: 'd4', name: 'Cozy Gifts', location: 'Village', category: 'Souvenir shop' },
    ];
    const guestStays = [
      { id: 'g1a7c2e4', guest_name: 'Emma Wilson', room: '101', property: 'Cozy Nest', arrival: d(-3), departure: d(1), status: 'active' },
      { id: 'g2b8d3f5', guest_name: 'James Carter', room: '204', property: 'Cozy Nest', arrival: d(-1), departure: d(4), status: 'active' },
      { id: 'g3c9e4a6', guest_name: 'Sofia Martín', room: '102', property: 'Cozy Nest', arrival: d(-2), departure: d(2), status: 'active' },
      { id: 'g4d0f5b7', guest_name: 'Liam Becker', room: '203', property: 'Cozy Nest', arrival: d(-6), departure: d(-1), status: 'checked_out' },
    ];
    const mk = (id, number, outlet_id, stay_id, customer, amount, notes, date, status = 'approved', due = d(4)) =>
      ({ id, number, outlet_id, stay_id, customer, amount, notes, date, due, status, created_by: 'outlet@example.com', created: new Date().toISOString() });
    const bills = [
      mk('b1', 'CN-001', 'd1', 'g1a7c2e4', 'Emma Wilson', 350000, 'Guest house accommodation · 4 nights', d(-3)),
      mk('b2', 'CD-042', 'd2', 'g1a7c2e4', 'Emma Wilson', 85000, 'Dinner at Cozy Deck', d(-2)),
      mk('b3', 'CSC-018', 'd3', 'g1a7c2e4', 'Emma Wilson', 249804, '1 × Fun Dive 1 @ USD 81.00\n1 × Fun Dive 2 @ USD 71.00\n2 × Equipment charge BCD / REG / COMP @ USD 5.00\nExchange rate: 1 USD = 15.42 MVR\nRasdhoo Madivaru · Tiger Point', d(-1)),
      mk('b4', 'CG-009', 'd4', 'g2b8d3f5', 'James Carter', 45000, 'Souvenirs and gifts', d(-1)),
      mk('b5', 'CD-047', 'd2', 'g2b8d3f5', 'James Carter', 62000, 'Sunset dinner · set menu', t, 'pending'),
      mk('b6', 'CN-004', 'd1', 'g3c9e4a6', 'Sofia Martín', 260000, 'Guest house accommodation · 4 nights', d(-2)),
      mk('b7', 'CSC-021', 'd3', 'g3c9e4a6', 'Sofia Martín', 225132, '1 × Tiger shark Dive @ USD 96.00\n1 × GoPro rental @ USD 50.00\nExchange rate: 1 USD = 15.42 MVR', d(-1), 'approved', d(-1)),
      mk('b8', 'CN-002', 'd1', 'g4d0f5b7', 'Liam Becker', 420000, 'Guest house accommodation · 5 nights', d(-6)),
      mk('b9', 'CD-038', 'd2', 'g4d0f5b7', 'Liam Becker', 54000, 'Lunch and drinks', d(-4)),
    ];
    const pay = (id, bill_id, amount, date, method, reference, settlement_id) => ({ id, bill_id, amount, date, method, reference, settlement_id, created_by: 'cashier@example.com', created: new Date().toISOString() });
    const payments = [
      pay('p1', 'b1', 100000, t, 'Cash', 'RCPT-001'),
      pay('p2', 'b8', 420000, d(-1), 'Card', 'RCPT-000', 's1'),
      pay('p3', 'b9', 54000, d(-1), 'Card', 'RCPT-000', 's1'),
      pay('p4', 'b6', 120000, d(-1), 'Bank transfer', 'TRF-55821'),
    ];
    const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
    demoFull = {
      member: { role: 'admin' },
      email: 'demo@pixelpayment.app',
      settings: { company: 'Cozy Hospitality', currency: 'MVR' },
      outlets, stays: guestStays, bills, payments, settlements: [],
      activity: [
        { action: 'Invoice submitted', entity: 'CD-047 · Cozy Deck', actor: 'outlet@example.com', created: ago(12) },
        { action: 'Payment collected', entity: 'RCPT-001 · Emma Wilson', actor: 'cashier@example.com', created: ago(48) },
        { action: 'Invoice approved', entity: 'CSC-018 · Cozy Scuba Club', actor: 'demo@pixelpayment.app', created: ago(190) },
        { action: 'Guest checked out', entity: 'Liam Becker · Room 203', actor: 'demo@pixelpayment.app', created: ago(1500) },
        { action: 'Guest registered', entity: 'James Carter · Room 204', actor: 'demo@pixelpayment.app', created: ago(1700) },
      ],
      members: [
        { email: 'demo@pixelpayment.app', role: 'admin' },
        { email: 'deck.cashier@' + usernameDomain, role: 'outlet', outlet_id: 'd2' },
        { email: 'scuba.desk@' + usernameDomain, role: 'outlet', outlet_id: 'd3' },
      ],
    };
    rateCards = demoRateCards();
    brand = {
      legal_name: 'Cozy Hospitality Pvt Ltd', tagline: 'Island guest houses & experiences', color: '#0F6E6A',
      address: 'Cozy Nest, Hithadhoo Magu\nFuvahmulah 18020, Maldives', phone: '+960 777 0000', email: 'accounts@cozy.example', website: 'www.cozy.example',
      tax_id: 'GST 1000000GST501', fx_usd_mvr: 15.42, payment_info: 'Bank of Maldives · Cozy Hospitality Pvt Ltd · USD acc. 7730000000000 · SWIFT MALBMVMV\nVisa, Mastercard and cash accepted at the front office.',
      terms: 'All prices include 10% service charge and applicable taxes. Payment is due at checkout. Thank you for staying with us.',
    };
    ui.rateDraft = null; ui.rateDirty = false; ui.rateOutlet = null;
    demoRole = 'admin';
    applyDemoRole();
  }

  const SCUBA_PRICES = [
      ['Fun dives', 'Fun Dive 1', 81], ['Fun dives', 'Fun Dive 2', 71], ['Fun dives', 'Fun Dive 3-6', 76], ['Fun dives', 'Fun Dive 7', 41],
      ['Fun dives', 'Fun Dive 8-12', 71], ['Fun dives', 'Fun Dive 13', 6], ['Fun dives', 'Fun Dive 14-20', 66], ['Fun dives', 'Fun Dive 21', -39], ['Fun dives', 'Fun Dive 21+', 61],
      ['Try dives & refreshers', 'DSD', 100], ['Try dives & refreshers', 'DS (not completed DSD)', 50], ['Try dives & refreshers', '2nd DSD', 81],
      ['Try dives & refreshers', 'Scuba Review', 90], ['Try dives & refreshers', 'Reactivate', 95],
      ['Equipment & rental', 'Equipment charge BCD / REG / COMP', 5], ['Equipment & rental', 'Equipment charge mask and fins', 5], ['Equipment & rental', '15L Tank', 5], ['Equipment & rental', 'GoPro rental', 50],
      ['Private & special dives', 'Private guide/dive', 100], ['Private & special dives', 'Private tiger shark', 200], ['Private & special dives', 'Tiger shark Dive', 96], ['Private & special dives', 'Free Diving', 145],
      ['Course dives', 'PADI Advanced Course Dive', 174.81], ['Course dives', 'PADI Adventure Dive', 216.92],
      ['Courses', 'Open water course', 650], ['Courses', 'Advance Course', 500], ['Courses', 'Rescue', 500], ['Courses', 'Divemaster', 1500],
      ['Courses', 'Nitrox', 350], ['Courses', 'Deep Spec.', 350], ['Courses', 'Digital U/W imaging spec.', 350],
      ['Packages', 'Thrilling Shark Dive 4N/6D', 1392], ['Packages', 'Discovery package 5N/9D', 1682], ['Packages', 'Adventure package 6N/12D', 1875],
      ['Packages', 'Exploring package 7N/15D', 2208], ['Packages', 'Advance package 8N/18D', 2541], ['Packages', 'Super package 9N/12D', 2874],
      ['Dive insurance', 'Dive insurance – 1 day', 18], ['Dive insurance', 'Dive insurance – 3 days', 23], ['Dive insurance', 'Dive insurance – 5 days', 30],
      ['Dive insurance', 'Dive insurance – 7 days', 35], ['Dive insurance', 'Dive insurance – 10 days', 40], ['Dive insurance', 'Dive insurance – 14 days', 55],
  ];

  function demoRateCards() {
    const scuba = SCUBA_PRICES;
    const deck = [['Food', 'Sunset set menu', 620], ['Food', 'Lunch', 270], ['Drinks', 'Fresh juice', 75], ['Drinks', 'Soft drink', 45], ['Drinks', 'Mocktail', 150]];
    const mkItems = (list) => list.map(([category, name, price]) => ({ id: rid(), category, name, price }));
    return {
      d3: { outlet_id: 'd3', currency: 'USD', fx_rate: 15.42, items: mkItems(scuba), updated_at: new Date().toISOString(), updated_by: 'scuba.desk@' + usernameDomain },
      d2: { outlet_id: 'd2', currency: 'MVR', fx_rate: 1, items: mkItems(deck), updated_at: new Date().toISOString(), updated_by: 'demo@pixelpayment.app' },
    };
  }

  // Demo only: mimic what the backend returns for an outlet staff member (Cozy Deck).
  function applyDemoRole() {
    if (demoRole === 'admin') {
      data = demoFull;
    } else {
      const outletId = 'd3';
      const bills = demoFull.bills.filter((b) => b.outlet_id === outletId);
      const ids = new Set(bills.map((b) => b.id));
      data = {
        ...demoFull,
        member: { role: 'outlet', outlet_id: outletId },
        email: 'scuba.desk@' + usernameDomain,
        outlets: demoFull.outlets.filter((o) => o.id === outletId),
        bills,
        payments: demoFull.payments.filter((p) => ids.has(p.bill_id)),
        activity: demoFull.activity.filter((a) => /Scuba|CSC-/.test(a.entity)),
        members: [],
      };
    }
    ui.page = null;
    ui.selectedStay = null;
    ui.search = ''; ui.outletFilter = ''; ui.statusFilter = ''; ui.guestQuery = '';
    render();
  }

  /* ------------------------------------------------------------------ *
   * Navigation & event delegation
   * ------------------------------------------------------------------ */
  function navigate(page) {
    ui.page = page;
    ui.selectedStay = null;
    ui.search = ''; ui.outletFilter = ''; ui.statusFilter = ''; ui.guestQuery = '';
    render();
    window.scrollTo(0, 0);
  }

  function printWith(cls) {
    if (cls) document.body.classList.add(cls);
    window.print();
    if (cls) document.body.classList.remove(cls);
  }

  const ACTIONS = {
    'auth-mode': (m) => { ui.authMode = m; renderAuth(); },
    nav: navigate,
    menu: () => {
      const sb = document.getElementById('sidebar');
      const open = sb.classList.toggle('open');
      document.getElementById('scrim').hidden = !open;
    },
    signout: signOut,
    refresh: async () => { await load(); toast('Workspace refreshed.'); },
    demo: toggleDemo,
    'demo-role': (r) => { demoRole = r; closeOverlay(); applyDemoRole(); },
    'gen-pass': (_, el) => { const input = el.closest('.pw-row').querySelector('input'); input.value = genPassword(); input.focus(); input.select(); },
    'copy-pass': async (_, el) => {
      const input = el.closest('.pw-row').querySelector('input');
      if (!input.value) return toast('Generate or type a password first.');
      try { await navigator.clipboard.writeText(input.value); toast('Password copied.'); } catch { input.select(); toast('Press Ctrl+C to copy.'); }
    },
    export: exportCsv,
    close: closeOverlay,
    form: (arg, el) => { openForm(arg, el.dataset.arg2); const bld = document.querySelector('#modal [data-builder]'); if (bld) bbRecalc(bld); const f = document.querySelector('#modal form'); if (f) updateFxHint(f); },
    invoice: openInvoice,
    approve,
    guest: (id) => { ui.selectedStay = id; render(); window.scrollTo(0, 0); },
    'guest-from': (id) => { closeOverlay(); ui.page = 'Guests'; ui.selectedStay = id; render(); window.scrollTo(0, 0); },
    'back-guests': () => { ui.selectedStay = null; render(); },
    'guest-filter': (v) => { ui.guestFilter = v; render(); },
    settle: (id) => openForm('settle', id),
    checkout: (id) => guestAction('checkout', id),
    'approve-stay': (id) => guestAction('approve-stay', id),
    status: (s) => { ui.statusFilter = s; render(); },
    'clear-filters': () => { ui.search = ''; ui.statusFilter = ''; ui.outletFilter = ''; render(); },
    'outlet-invoices': (id) => { navigate('Invoices'); ui.outletFilter = id; render(); },
    print: () => printWith(''),
    'print-drawer': () => printWith('printing-drawer'),
    'print-doc': () => printWith('printing-doc'),
    'rate-add': () => {
      const d = ui.rateDraft;
      d.items.push({ id: rid(), category: d.items[d.items.length - 1]?.category || '', name: '', price: 0 });
      ui.rateQuery = ''; ui.rateDirty = true; render();
      const inputs = document.querySelectorAll('[data-rate-field=name]');
      inputs[inputs.length - 1]?.focus();
    },
    'rate-del': (idx) => { ui.rateDraft.items.splice(Number(idx), 1); ui.rateDirty = true; render(); },
    'rate-reset': () => { ui.rateDraft = null; ui.rateDirty = false; render(); },
    'rate-save': () => saveRates(),
    'logo-remove': () => {
      document.querySelector('[name=logo]').value = '';
      document.getElementById('logoPreview').innerHTML = `<span>${icon('building', 'lg')}<small>No logo yet</small></span>`;
    },
    'goto-rates': (oid) => { closeOverlay(); ui.rateOutlet = oid; ui.rateDraft = null; ui.rateDirty = false; navigate('Rates'); },
    'rate-load-scuba': () => {
      const d = ui.rateDraft;
      d.items = SCUBA_PRICES.map(([category, name, price]) => ({ id: rid(), category, name, price }));
      d.currency = 'USD';
      if (currency() !== 'USD' && !(Number(d.fx_rate) > 1)) d.fx_rate = 15.42;
      ui.rateDirty = true; ui.rateQuery = ''; render();
      toast(`${d.items.length} Cozy Scuba Club prices loaded. Check them, then click Save rate card.`);
    },
    'rate-paste': () => modal('Paste from sheet', 'Copy rows from Google Sheets or Excel (item and price columns) and paste them below.',
      `<label class="field"><span>Rows</span><textarea name="paste" rows="9" class="mono-area" placeholder="Fun Dive 1&#9;$ 81.00&#10;Fun Dive 2&#9;$ 71.00&#10;Equipment charge mask and Fins&#9;$ 5.00" required></textarea></label>
      <p class="hint-line">Columns can be <b>Item · Price</b> or <b>Category · Item · Price</b>. If there are two price columns, the last one is used. Prices like $1,392.00 and (39.00) are understood.</p>
      <label class="field"><span>Category for rows without one <span class="hint">· optional</span></span><input name="paste_category" list="rateCats" placeholder="e.g. Fun dives" maxlength="60"></label>
      <div class="seg" role="radiogroup" aria-label="Paste mode">
        <label><input type="radio" name="paste_mode" value="append" checked><span>Add to current list</span></label>
        <label><input type="radio" name="paste_mode" value="replace"><span>Replace current list</span></label>
      </div>`, footer('Add items'), 'rates-paste'),
    'bi-add': (_, el) => {
      const builder = el.closest('[data-builder]');
      builder.querySelector('#bbRows').insertAdjacentHTML('beforeend', bbRowHtml(cardFor(builder.dataset.outlet)));
      builder.querySelector('#bbRows .bb-row:last-child select').focus();
    },
    'bi-remove': (_, el) => {
      const builder = el.closest('[data-builder]');
      const rows = builder.querySelectorAll('#bbRows .bb-row');
      if (rows.length > 1) el.closest('.bb-row').remove();
      else el.closest('.bb-row').outerHTML = bbRowHtml(cardFor(builder.dataset.outlet));
      bbRecalc(builder);
    },
  };

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-overlay]')) return closeOverlay();
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset.arg ?? '', el); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.name === 'amount' && e.target.form?.querySelector('[data-fx-hint]')) updateFxHint(e.target.form);
    const rf = e.target.dataset.rateField;
    if (rf && ui.rateDraft) {
      const it = ui.rateDraft.items[Number(e.target.dataset.rateIdx)];
      if (it) { it[rf] = rf === 'price' ? (parseFloat(e.target.value) || 0) : e.target.value; markRateDirty(); }
      return;
    }
    const rm = e.target.dataset.rateMeta;
    if (rm && ui.rateDraft) {
      ui.rateDraft[rm] = rm === 'currency' ? e.target.value.trim().toUpperCase() : (parseFloat(e.target.value) || 0);
      markRateDirty();
      return;
    }
    const key = e.target.dataset.input;
    if (!key) return;
    if (key === 'search') { ui.search = e.target.value; updateInvoiceRows(); }
    else if (key === 'guestQuery') { ui.guestQuery = e.target.value; document.getElementById('guestRows').innerHTML = guestRows(); }
    else if (key === 'rateQuery') { ui.rateQuery = e.target.value; document.getElementById('rateRows').innerHTML = rateRowsHtml(); }
    else if (key === 'brand-hex') {
      const v = e.target.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        document.querySelector('[data-change=brand-color]').value = v;
        const sw = document.getElementById('brandSwatch');
        if (sw) { sw.style.background = v; sw.style.color = inkOn(v); }
      }
    }
    else if (key === 'fx-rate') {
      const form = e.target.form, dueEl = form.querySelector('[data-due]'), amount = form.querySelector('[name=amount]');
      const sel = form.querySelector('[name=pay_currency]');
      if (dueEl && amount && sel && sel.value !== currency() && formRate(form)) {
        const m = r2(convert(Number(dueEl.dataset.due) / 100, currency(), sel.value, formRate(form)));
        amount.max = m; amount.value = m.toFixed(2);
      }
      updateFxHint(form);
    }
    else if (key === 'bb-rate') {
      const builder = e.target.closest('[data-builder]'), card = cardFor(builder.dataset.outlet), rate = Number(e.target.value);
      builder.querySelectorAll('#bbRows .bb-row').forEach((row) => {
        const sel = row.querySelector('select').value;
        if (sel !== '' && sel !== 'custom' && rate) row.querySelector('[data-bb=price]').value = r2(convert(Number(card.items[Number(sel)].price), cardCurrency(card), builder.dataset.cur, rate)).toFixed(2);
      });
      bbRecalc(builder);
    }
    else if (key === 'bi-recalc') { bbRecalc(e.target.closest('[data-builder]')); }
    else if (key === 'stayFilter') { document.getElementById('guestSelect').innerHTML = '<option value="">Select guest and room</option>' + stayOptions(e.target.value); }
  });

  document.addEventListener('change', (e) => {
    if (e.target.dataset.change === 'outletFilter') { ui.outletFilter = e.target.value; updateInvoiceRows(); }
    if (e.target.dataset.rateMeta === 'currency') { render(); return; }
    if (e.target.dataset.change === 'logo-file' && e.target.files[0]) {
      logoToDataUrl(e.target.files[0]).then((url) => {
        document.querySelector('[name=logo]').value = url;
        document.getElementById('logoPreview').innerHTML = `<img src="${url}" alt="Logo preview">`;
      }).catch((err) => toast(err.message));
      return;
    }
    if (e.target.dataset.change === 'brand-color') {
      const hex = e.target.value.toUpperCase();
      document.querySelector('[name=color]').value = hex;
      const sw = document.getElementById('brandSwatch');
      if (sw) { sw.style.background = hex; sw.style.color = inkOn(hex); }
      return;
    }
    if (e.target.dataset.change === 'rateOutlet') {
      if (ui.rateDirty && !confirm('Discard unsaved changes to this rate card?')) { e.target.value = ui.rateOutlet; return; }
      ui.rateOutlet = e.target.value; ui.rateDraft = null; ui.rateDirty = false; ui.rateQuery = ''; render(); return;
    }
    if (e.target.dataset.change === 'cur-switch') {
      const form = e.target.form, cur = e.target.value, prev = e.target.dataset.prev || currency();
      e.target.dataset.prev = cur;
      form.querySelectorAll('[data-affix]').forEach((a) => { a.textContent = cur; });
      const fxField = form.querySelector('[data-fx-field]');
      if (fxField) { fxField.hidden = cur === currency(); fxField.querySelector('input').required = cur !== currency(); }
      const rate = formRate(form);
      const amount = form.querySelector('[name=amount]'), dueEl = form.querySelector('[data-due]');
      if (amount && dueEl) {
        const due = Number(dueEl.dataset.due) / 100, m = rate ? r2(convert(due, currency(), cur, rate)) : NaN;
        amount.removeAttribute('max');
        amount.value = Number.isFinite(m) ? m.toFixed(2) : '';
        if (Number.isFinite(m)) amount.max = m;
      } else if (amount && amount.value && rate) {
        amount.value = r2(convert(Number(amount.value), prev, cur, rate)).toFixed(2);
      }
      updateFxHint(form);
      if (fxField && !fxField.hidden && !rate) fxField.querySelector('input').focus();
      return;
    }
    if (e.target.dataset.change === 'bb-cur') {
      const builder = e.target.closest('[data-builder]'), card = cardFor(builder.dataset.outlet);
      const prev = builder.dataset.cur, cur = e.target.value;
      const rateBox = builder.querySelector('.bb-rate');
      if (rateBox) rateBox.hidden = cur === currency() && cardCurrency(card) === cur;
      const rate = Number(builder.querySelector('[data-bb=rate]')?.value) || cardRate(card);
      if (!rate && (cur !== cardCurrency(card) || prev !== cur)) { builder.dataset.cur = cur; builder.querySelector('[data-bb=rate]')?.focus(); }
      builder.dataset.cur = cur;
      builder.querySelectorAll('#bbRows .bb-row').forEach((row) => {
        const sel = row.querySelector('select').value, price = row.querySelector('[data-bb=price]');
        const conv = (v, from) => { const x = r2(convert(v, from, cur, rate)); return Number.isFinite(x) ? x.toFixed(2) : ''; };
        if (sel !== '' && sel !== 'custom') price.value = conv(Number(card.items[Number(sel)].price), cardCurrency(card));
        else if (price.value) price.value = conv(Number(price.value), prev);
      });
      const unit = builder.querySelector('.bb-labels span:nth-child(3)');
      if (unit) unit.textContent = `Unit (${cur})`;
      bbRecalc(builder);
      return;
    }
    if (e.target.dataset.change === 'bi-item') {
      const row = e.target.closest('.bb-row'), builder = e.target.closest('[data-builder]');
      const card = cardFor(builder.dataset.outlet), v = e.target.value;
      const custom = row.querySelector('.bb-custom'), price = row.querySelector('[data-bb=price]');
      custom.hidden = v !== 'custom';
      if (v === 'custom') { price.value = ''; custom.focus(); }
      else if (v !== '') {
        const rate = Number(builder.querySelector('[data-bb=rate]')?.value) || cardRate(card);
        const x = r2(convert(Number(card.items[Number(v)].price), cardCurrency(card), builder.dataset.cur || cardCurrency(card), rate));
        price.value = Number.isFinite(x) ? x.toFixed(2) : '';
      }
      if (v !== '' && row === builder.querySelector('#bbRows .bb-row:last-child')) {
        builder.querySelector('#bbRows').insertAdjacentHTML('beforeend', bbRowHtml(card));
      }
      bbRecalc(builder);
    }
    if (e.target.dataset.change === 'billOutlet') {
      const body = document.getElementById('billBody');
      if (body) { body.innerHTML = billBodyHtml(e.target.value); const bld = body.querySelector('[data-builder]'); if (bld) bbRecalc(bld); }
      const n = document.getElementById('invoiceNumber');
      const auto = e.target.form.querySelector('[name=num_mode]:checked')?.value !== 'own';
      if (n && auto) n.value = nextInvoiceNumber(e.target.value);
    }
    if (e.target.dataset.change === 'numMode') {
      const form = e.target.form, n = document.getElementById('invoiceNumber'), hint = document.getElementById('numHint');
      if (e.target.value === 'own') {
        n.readOnly = false; n.value = ''; n.placeholder = 'e.g. 10234 or RCPT-558';
        hint.textContent = 'Enter the number printed on your outlet’s own bill or receipt.';
        n.focus();
      } else {
        n.readOnly = true; n.placeholder = '';
        n.value = nextInvoiceNumber(form.querySelector('[name=outlet_id]').value);
        hint.textContent = 'Next number in this outlet’s sequence.';
      }
    }
    if (e.target.dataset.change === 'role') {
      const f = e.target.closest('form').querySelector('[data-outlet-field]');
      if (f) f.hidden = e.target.value === 'admin';
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    submitForm(form);
  });

  document.addEventListener('keydown', (e) => {
    const dialog = document.querySelector('#modal [role="dialog"]');
    if (e.key === 'Escape' && dialog) return closeOverlay();
    if (e.key === 'Enter' && e.target.matches('[data-act][tabindex="0"]')) e.target.click();
    if (e.key === 'Tab' && dialog) {
      const items = [...dialog.querySelectorAll('button, input, select, textarea, a[href]')].filter((n) => !n.disabled && n.type !== 'hidden');
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  boot();
})();
