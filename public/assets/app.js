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

  async function load() {
    try {
      const res = await fetch('/api/data');
      const body = await res.json();
      if (!res.ok) throw Object.assign(new Error(body.error), { status: res.status });
      liveData = scopeToRole(body);
      if (!demo) data = liveData;
      render();
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
    { group: 'Operations', items: [['Outlets', 'outlets', 'Outlets'], ['Activity', 'activity', 'Activity log']] },
    { group: 'Administration', items: [['Settings', 'settings', 'Settings']] },
  ];
  const NAV_OUTLET = [
    { group: 'My outlet', items: [['Invoices', 'invoices', 'My bills'], ['Guests', 'guests', 'Guest lookup'], ['Payments', 'payments', 'Collections']] },
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
          <nav aria-label="Main">${nav}</nav>
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
            ${demo ? banner('demo', 'eye', demoRole === 'admin' ? 'Demo · viewing as head office' : 'Demo · viewing as outlet staff (Cozy Deck)', 'Switch roles to see what each user sees. Changes are disabled in the demo.',
              `<div class="chips" role="group" aria-label="View demo as"><button class="chip" aria-pressed="${demoRole === 'admin'}" data-act="demo-role" data-arg="admin">Head office</button><button class="chip" aria-pressed="${demoRole === 'outlet'}" data-act="demo-role" data-arg="outlet">Outlet staff</button></div><button class="btn sm" data-act="demo">Exit demo</button>`) : ''}
            ${!demo && !data.outlets.length ? banner('', 'building', 'Your workspace is ready', 'Add your first outlet to begin posting daily invoices.', isAdmin() ? `<button class="btn sm primary" data-act="form" data-arg="outlet">${icon('plus', 'sm')} Add outlet</button>` : '') : ''}
            ${pageBody()}
            <footer class="footer"><span>© ${new Date().getFullYear()} ${esc(data.settings.company)} · Powered by Pixel Payment</span><span>All amounts in ${esc(currency())} · Times shown in Maldives time</span></footer>
          </main>
        </div>
      </div>`;
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
      <section class="card" id="guestFolio">
        <div class="folio-head">
          <div>
            <div class="eyebrow">${esc(data.settings.company)} · ${!isAdmin() ? esc(data.outlets[0]?.name || 'Outlet') + ' charges' : pending ? 'Provisional statement' : 'Consolidated guest bill'}</div>
            <h2>${esc(s.guest_name)}</h2>
            <div class="folio-meta">
              <span>${icon('building', 'sm')} ${esc(s.property)}</span>
              <span>${icon('bed', 'sm')} Room ${esc(s.room)}</span>
              <span>${icon('calendar', 'sm')} ${fmtDate(s.arrival)} – ${fmtDate(s.departure)}</span>
              <span>${icon('hash', 'sm')} <span class="mono">${esc(String(s.id).slice(0, 8).toUpperCase())}</span></span>
            </div>
          </div>
          <div class="folio-balance">
            <small>Balance due</small>
            <div class="amt">${esc(currency())} ${money(balance)}</div>
            ${settled ? '<span class="badge paid">Settled</span>' : s.status === 'active' ? '<span class="badge success">In house</span>' : '<span class="badge neutral">Checked out</span>'}
          </div>
        </div>
        <div class="folio-strip">
          <div><small>Total charges</small><b>${money(total)}</b></div>
          <div><small>Payments received</small><b>${money(paid)}</b></div>
          <div><small>Balance to settle</small><b>${money(balance)}</b></div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Outlet</th><th>Description</th><th class="r">Amount</th><th class="r">Outstanding</th><th>Status</th></tr></thead>
          <tbody>${bills.length ? bills.map((b) => `
            <tr class="clickable" tabindex="0" data-act="invoice" data-arg="${esc(b.id)}">
              <td>${fmtDate(b.date)}</td>
              <td><span class="primary-text mono">${esc(b.number)}</span></td>
              <td>${esc(outletName(b.outlet_id))}</td>
              <td class="wrap">${esc(b.notes)}</td>
              <td class="r amount">${money(b.amount)}</td>
              <td class="r muted-amount">${money(outstanding(b))}</td>
              <td>${statusBadge(b)}</td>
            </tr>`).join('') : `<tr><td colspan="7">${emptyState('invoices', 'No charges yet', 'Outlet charges posted to this stay will appear here.')}</td></tr>`}
          </tbody>
        </table></div>
        <div class="folio-cols">
          <div class="folio-section">
            <h3>Charges by outlet</h3>
            ${byOutlet.length ? byOutlet.map((o) => `<div class="kv"><span>${esc(o.name)} · ${esc(o.category || 'Other')}</span><strong>${money(sum(bills.filter((b) => b.outlet_id === o.id)))}</strong></div>`).join('') : '<p class="kpi-foot">No charges posted.</p>'}
            ${bills.length ? `<div class="kv total"><span>Total</span><strong>${esc(currency())} ${money(total)}</strong></div>` : ''}
          </div>
          <div class="folio-section">
            <h3>Payments received</h3>
            ${receipts.size ? [...receipts.values()].map((r) => `<div class="kv"><span>${fmtDate(r.date)} · ${esc(r.method)} · <span class="mono">${esc(r.reference)}</span></span><strong>${money(r.amount)}</strong></div>`).join('') : '<p class="kpi-foot">No payments recorded.</p>'}
            ${receipts.size ? `<div class="kv total"><span>Balance due</span><strong>${esc(currency())} ${money(balance)}</strong></div>` : ''}
          </div>
        </div>
        <div class="folio-note">${pending ? 'Provisional statement — pending charges may change after review. ' : 'All amounts as posted by the outlets. '}Generated ${fmtDateTime(Date.now())} (Maldives time).</div>
      </section>`;
  }

  /* ------------------------------------------------------------------ *
   * Overview
   * ------------------------------------------------------------------ */
  function overviewView() {
    const invoiced = sum(data.bills);
    const collected = sum(data.payments);
    const open = data.bills.filter((b) => outstanding(b) > 0);
    const overdueBills = data.bills.filter((b) => billStatus(b) === 'Overdue');
    const overdue = overdueBills.reduce((t, b) => t + outstanding(b), 0);
    const pendingBills = data.bills.filter((b) => b.status === 'pending');
    const todays = data.bills.filter((b) => b.date === today());
    const inHouse = stays().filter((s) => s.status === 'active').length;
    const recent = data.bills.slice().sort(byNewest).slice(0, 6);
    const attention = [...pendingBills.map((b) => ({ b, kind: 'pending' })), ...overdueBills.map((b) => ({ b, kind: 'overdue' }))];

    const rows = data.outlets.map((o) => {
      const bills = data.bills.filter((b) => b.outlet_id === o.id);
      const t = sum(bills), p = bills.reduce((a, b) => a + paidFor(b.id), 0);
      return { o, n: bills.length, t, p, out: t - p };
    }).sort((a, b) => b.t - a.t);

    return `
      <div class="kpis">
        ${kpi('Billed today', sum(todays), 'invoices', `${todays.length} bill${todays.length === 1 ? '' : 's'} · ${inHouse} guests in house`)}
        ${kpi('Collected', collected, 'trend', `<b>${pct(collected, invoiced)}%</b> of ${esc(currency())} ${compact(invoiced)} billed`)}
        ${kpi('Outstanding', invoiced - collected, 'clock', `${open.length} open invoice${open.length === 1 ? '' : 's'}`, 'blue')}
        ${kpi('Overdue', overdue, 'alert', `${overdueBills.length} past due date`, overdueBills.length ? 'red' : '')}
      </div>
      <div class="split">
        <section class="card">
          <div class="card-head"><div><h2>Billing & collections</h2><p>Last 7 days</p></div><div class="legend"><span><i></i>Billed</span><span><i class="b"></i>Collected</span></div></div>
          <div class="chart-wrap chart">${chartSvg()}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Needs attention</h2><p>Bills to review and overdue balances</p></div><span class="badge ${attention.length ? 'pending' : 'success'}">${attention.length ? attention.length + ' open' : 'All clear'}</span></div>
          ${attention.length ? attention.slice(0, 6).map(({ b, kind }) => `
            <div class="list-row clickable" tabindex="0" data-act="invoice" data-arg="${esc(b.id)}">
              <span class="tile-icon ${kind}">${icon(kind === 'pending' ? 'clock' : 'alert', 'sm')}</span>
              <div class="grow"><strong class="mono">${esc(b.number)}</strong><small>${esc(b.customer)} · ${esc(outletName(b.outlet_id))}</small></div>
              <div class="val">${money(kind === 'pending' ? b.amount : outstanding(b))}<small>${kind === 'pending' ? 'Awaiting review' : 'Due ' + fmtShort(b.due)}</small></div>
            </div>`).join('') : emptyState('checkCircle', 'All clear', 'No bills awaiting review and nothing overdue.')}
        </section>
      </div>
      <section class="card" style="margin-bottom:20px">
        <div class="card-head"><div><h2>Outlet performance</h2><p>Billing and collections by outlet</p></div><button class="link" data-act="nav" data-arg="Outlets">Manage outlets ${icon('arrowRight', 'sm')}</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Outlet</th><th class="r">Bills</th><th class="r">Billed</th><th class="r">Collected</th><th class="r">Outstanding</th><th style="width:24%">Collection rate</th></tr></thead>
          <tbody>${rows.length ? rows.map(({ o, n, t, p, out }) => `
            <tr class="clickable" tabindex="0" data-act="outlet-invoices" data-arg="${esc(o.id)}">
              <td><div class="person"><span class="tile-icon">${icon('outlets', 'sm')}</span><div><span class="primary-text">${esc(o.name)}</span><span class="secondary-text">${esc(o.category || 'Other')} · ${esc(o.location || '')}</span></div></div></td>
              <td class="r num">${n}</td><td class="r amount">${money(t)}</td><td class="r muted-amount">${money(p)}</td><td class="r amount">${money(out)}</td>
              <td><div style="display:flex;align-items:center;gap:10px"><div class="bar-track" style="flex:1"><i style="width:${pct(p, t)}%"></i></div><span class="num" style="min-width:36px;text-align:right">${pct(p, t)}%</span></div></td>
            </tr>`).join('') : `<tr><td colspan="6">${emptyState('outlets', 'No outlets yet', 'Add outlets to see their performance.')}</td></tr>`}</tbody>
          ${rows.length ? `<tfoot><tr><td>Total</td><td class="r">${data.bills.length}</td><td class="r">${money(invoiced)}</td><td class="r">${money(collected)}</td><td class="r">${money(invoiced - collected)}</td><td>${pct(collected, invoiced)}% collected</td></tr></tfoot>` : ''}
        </table></div>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Recent invoices</h2><p>Latest bills posted by your outlets</p></div><button class="link" data-act="nav" data-arg="Invoices">View all ${icon('arrowRight', 'sm')}</button></div>
        <div class="table-wrap"><table>${invoiceHead()}<tbody>${invoiceRowsHtml(recent)}</tbody></table></div>
      </section>`;
  }

  function chartSvg() {
    const days = Array.from({ length: 7 }, (_, i) => shiftDate(today(), i - 6));
    const series = days.map((d) => [sum(data.bills.filter((b) => b.date === d)), sum(data.payments.filter((p) => p.date === d))]);
    const rawMax = Math.max(1, ...series.flat());
    const step = niceStep(rawMax / 4);
    const max = step * 4;
    const W = 700, H = 240, L = 48, B = 26, T = 8, plotW = W - L, plotH = H - B - T;
    const gw = plotW / 7, bw = Math.min(22, gw / 4);
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
    </div>`;
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
    `<label class="field ${cls}"><span>${label}</span><div class="input-affix"><span class="affix">${esc(currency())}</span><input name="amount" type="number" inputmode="decimal" value="${esc(value)}" min="0.01" step="0.01" ${attrs} required></div></label>`;
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
          ${moneyField('Amount')}
          ${field('Due date', 'due', 'date', today())}
          <label class="field wide"><span>Description</span><textarea name="notes" required maxlength="2000" rows="3" placeholder="e.g. Dinner for two – set menu&#10;Each line appears on the invoice"></textarea></label>
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
        `<div class="amount-hero" style="margin:0"><div><small>Outstanding on this invoice</small><div class="amt">${esc(currency())} ${money(due)}</div></div>${statusBadge(b)}</div>
        <input type="hidden" name="bill_id" value="${esc(b.id)}">
        <div class="form-grid">
          ${moneyField('Amount received', (due / 100).toFixed(2), `max="${due / 100}"`)}
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
        `<div class="amount-hero" style="margin:0"><div><small>Balance across ${bills.length} outlet charge${bills.length === 1 ? '' : 's'}</small><div class="amt">${esc(currency())} ${money(due)}</div></div></div>
        <p class="kpi-foot">Full or partial payments are allocated to the oldest unpaid charges first.</p>
        <input type="hidden" name="stay_id" value="${esc(arg)}">
        <div class="form-grid">
          ${moneyField('Amount received', (due / 100).toFixed(2), `max="${due / 100}"`)}
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
    if (name === 'bills') {
      delete values.num_mode;
      values.number = String(values.number || '').trim();
      if (data.bills.some((b) => b.outlet_id === values.outlet_id && String(b.number).toLowerCase() === values.number.toLowerCase())) {
        errBox.innerHTML = `<div class="alert error">${icon('alert', 'sm')}<span>Bill number ${esc(values.number)} already exists for this outlet.</span></div>`;
        return;
      }
    }
    if (!requireLive()) return;
    btn.disabled = true;
    try {
      await post(name, values);
      if (name !== 'settings') closeOverlay();
      await load();
      toast({ settings: 'Settings saved.', 'staff-create': 'User created. Share the username and password with them.', 'staff-reset': 'Password updated.', members: 'User added. They can now create their account.' }[name] || 'Saved to your workspace.');
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
      <article class="invoice-doc" aria-label="Invoice ${esc(b.number)}">
        ${status === 'Paid' ? '<div class="doc-stamp">Paid</div>' : ''}
        <header class="inv-head">
          <div class="inv-from">
            <div class="inv-logo">${esc(initials(o.name))}</div>
            <div>
              <h2>${esc(o.name)}</h2>
              <p>${esc([o.category, o.location].filter(Boolean).join(' · '))}</p>
              <p>An outlet of ${esc(data.settings.company)}</p>
            </div>
          </div>
          <div class="inv-title">
            <h1>Invoice</h1>
            <dl>
              <div><dt>Invoice no.</dt><dd class="mono">${esc(b.number)}</dd></div>
              <div><dt>Invoice date</dt><dd>${fmtDate(b.date)}</dd></div>
              <div><dt>Due date</dt><dd>${fmtDate(b.due)}</dd></div>
            </dl>
          </div>
        </header>
        <section class="inv-parties">
          <div><h4>Billed to</h4><strong>${esc(b.customer)}</strong>
            <p>${s ? `Room ${esc(s.room)} · ${esc(s.property)}` : 'No guest stay linked'}</p>
            ${s ? `<p>Stay ${fmtDate(s.arrival)} – ${fmtDate(s.departure)}</p>` : ''}</div>
          <div><h4>Issued by</h4><strong>${esc(o.name)}</strong>
            <p>${esc(o.location || '')}</p><p>${esc(o.category || '')}</p></div>
          <div><h4>Payment</h4><strong>${esc(data.settings.company)} front office</strong>
            <p>Settled on the guest’s consolidated bill</p><p>Status: ${esc(status)}</p></div>
        </section>
        <table class="inv-lines">
          <thead><tr><th class="c-no">#</th><th>Description</th><th class="r c-qty">Qty</th><th class="r c-amt">Unit price</th><th class="r c-amt">Amount</th></tr></thead>
          <tbody>
            <tr><td>1</td><td><strong>${esc(lines[0])}</strong>${lines.slice(1).map((l) => `<div class="inv-sub">${esc(l)}</div>`).join('')}</td>
              <td class="r">1</td><td class="r">${money(b.amount)}</td><td class="r">${money(b.amount)}</td></tr>
          </tbody>
        </table>
        <div class="inv-bottom">
          <div class="inv-notes">
            <h4>Payments received</h4>
            ${pays.length ? `<table class="inv-pays"><tbody>${pays.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.method)}</td><td class="mono">${esc(p.reference)}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</tbody></table>` : '<p>No payments recorded yet.</p>'}
          </div>
          <div class="inv-totals">
            <div><span>Subtotal</span><span>${money(b.amount)}</span></div>
            <div><span>Payments received</span><span>− ${money(paid)}</span></div>
            <div class="grand"><span>Balance due</span><span>${esc(currency())} ${money(due)}</span></div>
          </div>
        </div>
        <footer class="inv-foot">
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
      mk('b3', 'CSC-018', 'd3', 'g1a7c2e4', 'Emma Wilson', 220000, 'Two-tank dive with equipment', d(-1)),
      mk('b4', 'CG-009', 'd4', 'g2b8d3f5', 'James Carter', 45000, 'Souvenirs and gifts', d(-1)),
      mk('b5', 'CD-047', 'd2', 'g2b8d3f5', 'James Carter', 62000, 'Sunset dinner · set menu', t, 'pending'),
      mk('b6', 'CN-004', 'd1', 'g3c9e4a6', 'Sofia Martín', 260000, 'Guest house accommodation · 4 nights', d(-2)),
      mk('b7', 'CSC-021', 'd3', 'g3c9e4a6', 'Sofia Martín', 140000, 'Snorkel excursion', d(-1), 'approved', d(-1)),
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
        { email: 'scuba@cozy.example', role: 'outlet', outlet_id: 'd3' },
      ],
    };
    demoRole = 'admin';
    applyDemoRole();
  }

  // Demo only: mimic what the backend returns for an outlet staff member (Cozy Deck).
  function applyDemoRole() {
    if (demoRole === 'admin') {
      data = demoFull;
    } else {
      const outletId = 'd2';
      const bills = demoFull.bills.filter((b) => b.outlet_id === outletId);
      const ids = new Set(bills.map((b) => b.id));
      data = {
        ...demoFull,
        member: { role: 'outlet', outlet_id: outletId },
        email: 'deck.cashier@' + usernameDomain,
        outlets: demoFull.outlets.filter((o) => o.id === outletId),
        bills,
        payments: demoFull.payments.filter((p) => ids.has(p.bill_id)),
        activity: demoFull.activity.filter((a) => /Cozy Deck|CD-/.test(a.entity)),
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
    form: (arg, el) => openForm(arg, el.dataset.arg2),
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
  };

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-overlay]')) return closeOverlay();
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset.arg ?? '', el); }
  });

  document.addEventListener('input', (e) => {
    const key = e.target.dataset.input;
    if (!key) return;
    if (key === 'search') { ui.search = e.target.value; updateInvoiceRows(); }
    else if (key === 'guestQuery') { ui.guestQuery = e.target.value; document.getElementById('guestRows').innerHTML = guestRows(); }
    else if (key === 'stayFilter') { document.getElementById('guestSelect').innerHTML = '<option value="">Select guest and room</option>' + stayOptions(e.target.value); }
  });

  document.addEventListener('change', (e) => {
    if (e.target.dataset.change === 'outletFilter') { ui.outletFilter = e.target.value; updateInvoiceRows(); }
    if (e.target.dataset.change === 'billOutlet') {
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
