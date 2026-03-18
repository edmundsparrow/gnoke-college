/* menu.js — Gnoke School Management
   Injects sidebar into every admin page and wires up:
   1. Sidebar open/close toggle
   2. Active link highlighting
   3. Level → Class cascading dropdowns (student pages)

   TO ADD A PAGE: add one entry to NAV_ITEMS — nothing else needs changing.
*/

const NAV_ITEMS = [
  {
    section: 'Students',
    links: [
      { label: 'Registration',      href: 'registration.html' },
      { label: 'Enrolled Students', href: 'student.html'      },
    ],
  },
  {
    section: 'Staff',
    links: [
      { label: 'Registration',   href: 'staffreg.html' },
      { label: 'Enrolled Staff', href: 'staff.html'    },
    ],
  },
  {
    section: 'Reports',
    links: [
      { label: 'Results Viewer', href: 'results.html' },
      { label: 'Print Centre',   href: 'print.html'   },
    ],
  },
  {
    section: 'System',
    links: [
      { label: 'About',    href: 'about.html'    },
      { label: 'Settings', href: 'settings.html' },
    ],
  },
];

function buildSidebar() {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  const sectionsHTML = NAV_ITEMS.map(({ section, links }) =>
    `<div class="menu-section">
      <span class="section-label">${section}</span>
      ${links.map(({ label, href }) =>
        `<a href="${href}" class="menu-item${page === href ? ' active' : ''}">${label}</a>`
      ).join('')}
    </div>`
  ).join('');

  document.getElementById('sidebar')?.remove();
  document.getElementById('sb-overlay')?.remove();

  document.body.insertAdjacentHTML('afterbegin', `
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <h2>School Management</h2>
    <span>Admin Module</span>
  </div>
  <div class="sb-scroll">${sectionsHTML}</div>
  <div class="sidebar-footer">
    <div class="footer-label">Students / Staff</div>
    <div class="footer-val" style="font-size:1rem;display:flex;gap:14px;align-items:baseline">
      <span id="sb-student-total">—</span>
      <span style="font-size:.7rem;color:#aaa;font-family:sans-serif;font-weight:400">staff: <span id="sb-staff-count">—</span></span>
    </div>
  </div>
</aside>
<div id="sb-overlay"></div>`);
}

function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sb-overlay');
  const btn     = document.getElementById('menuBtn');
  if (!sidebar || !btn) return;
  const open  = () => { sidebar.classList.add('active'); overlay?.classList.add('active'); document.body.style.overflow = 'hidden'; };
  const close = () => { sidebar.classList.remove('active'); overlay?.classList.remove('active'); document.body.style.overflow = ''; };
  btn.addEventListener('click', open);
  overlay?.addEventListener('click', close);
}

function initCascade() {
  const levelSel = document.getElementById('levelSelect');
  const classSel = document.getElementById('classSelect');
  if (!levelSel || !classSel) return;

  const CLASSES = {
    Senior: ['SS1A','SS1B','SS1C','SS1D','SS2A','SS2B','SS2C','SS2D','SS3A','SS3B','SS3C','SS3D'],
    Junior: ['JSS1A','JSS1B','JSS1C','JSS1D','JSS2A','JSS2B','JSS2C','JSS2D','JSS3A','JSS3B','JSS3C','JSS3D'],
  };

  levelSel.addEventListener('change', function () {
    classSel.innerHTML = '<option value="" disabled selected>Class</option>';
    classSel.disabled  = false;
    (CLASSES[this.value] || []).forEach(cls => {
      const o = document.createElement('option');
      o.value = o.textContent = cls;
      classSel.appendChild(o);
    });
    const t = document.getElementById('dynamicTitle');
    if (t) t.textContent = `${this.value} — Select a Class`;
  });

  classSel.addEventListener('change', function () {
    const isReg = window.location.pathname.includes('registration');
    const t = document.getElementById('dynamicTitle');
    const l = document.getElementById('tableClassLabel');
    if (t) t.textContent = `${this.value} — ${isReg ? 'Student Registration' : 'Enrolled Students'}`;
    if (l) l.textContent = `${this.value} Records`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  initSidebarToggle();
  initCascade();
});
