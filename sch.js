/* sch.js — Gnoke School Management shared utilities */

/* ── IDB helpers ── */
function idbOpen(name, store) {
  return new Promise((res, rej) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(store);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
async function idbGet(name, store, key) {
  const db = await idbOpen(name, store);
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}
async function idbSet(name, store, key, val) {
  const db = await idbOpen(name, store);
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(val, key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

/* ── Toast ── */
const T_ICONS = {
  success: `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 2L18.5 17H1.5L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8v4M10 14v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  info:    `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 6.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

const toast = {
  show(type, title, msg = '') {
    let root = document.getElementById('toast-root');
    if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon">${T_ICONS[type]}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <div class="toast-x" onclick="this.closest('.toast').remove()">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
      <div class="t-bar"></div>`;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      el.addEventListener('animationend', () => el.remove());
    }, 4000);
  },
  success: (t, m) => toast.show('success', t, m),
  error:   (t, m) => toast.show('error',   t, m),
  warning: (t, m) => toast.show('warning', t, m),
  info:    (t, m) => toast.show('info',    t, m),
};

/* ── Confirm modal ── */
function confirm_modal(title, desc = '', okLabel = 'Confirm', okClass = 'btn-danger') {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal">
      <h3>${title}</h3><p>${desc}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="m-cancel">Cancel</button>
        <button class="btn ${okClass}" id="m-ok">${okLabel}</button>
      </div></div>`;
    document.body.appendChild(ov);
    const cleanup = val => { ov.remove(); resolve(val); };
    ov.querySelector('#m-ok').onclick     = () => cleanup(true);
    ov.querySelector('#m-cancel').onclick = () => cleanup(false);
    ov.onclick = e => { if (e.target === ov) cleanup(false); };
    document.addEventListener('keydown', function h(e) {
      if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', h); }
    });
  });
}

/* ── Sidebar ── */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const sbOvl    = document.getElementById('sb-overlay');
  const hamburger = document.getElementById('menuBtn');
  if (!sidebar) return;
  const open  = () => { sidebar.classList.add('active'); sbOvl && sbOvl.classList.add('active'); document.body.style.overflow = 'hidden'; };
  const close = () => { sidebar.classList.remove('active'); sbOvl && sbOvl.classList.remove('active'); document.body.style.overflow = ''; };
  if (hamburger) hamburger.addEventListener('click', open);
  if (sbOvl)     sbOvl.addEventListener('click', close);
}

/* ── Misc ── */
function togglePw(id) {
  const inp = document.getElementById(id);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
}

function exportSqlDb(db, filename) {
  const blob = new Blob([db.export()], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function hideBoot(appId) {
  const boot = document.getElementById('boot-screen');
  if (!boot) return;
  boot.classList.add('hidden');
  setTimeout(() => {
    boot.style.display = 'none';
    if (appId) {
      const app = document.getElementById(appId);
      if (app) app.style.display = 'flex';
    }
  }, 380);
}
