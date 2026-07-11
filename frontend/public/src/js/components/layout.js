/**
 * Renders the app shell (sidebar + topbar) into #app-shell-root.
 * Call renderLayout({ activePage: 'dashboard', title: 'Dashboard' }) from each page.
 */
const NAV_CONFIG = {
  admin: [
    { section: 'Overview', links: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', href: '/admin/dashboard.html' },
    ]},
    { section: 'Management', links: [
      { key: 'students', label: 'Students', icon: 'fa-user-graduate', href: '/admin/students.html' },
      { key: 'faculty', label: 'Faculty', icon: 'fa-chalkboard-user', href: '/admin/faculty.html' },
      { key: 'departments', label: 'Departments', icon: 'fa-building', href: '/admin/departments.html' },
      { key: 'subjects', label: 'Subjects', icon: 'fa-book', href: '/admin/subjects.html' },
      { key: 'timetable', label: 'Timetable', icon: 'fa-calendar-days', href: '/admin/timetable.html' },
    ]},
    { section: 'Attendance', links: [
      { key: 'attendance', label: 'View Attendance', icon: 'fa-clipboard-check', href: '/admin/attendance.html' },
      { key: 'analytics', label: 'Analytics', icon: 'fa-chart-line', href: '/admin/analytics.html' },
      { key: 'reports', label: 'Reports', icon: 'fa-file-export', href: '/admin/reports.html' },
    ]},
    { section: 'Communication', links: [
      { key: 'notifications', label: 'Notifications', icon: 'fa-bell', href: '/admin/notifications.html' },
    ]},
  ],
  faculty: [
    { section: 'Overview', links: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', href: '/faculty/dashboard.html' },
    ]},
    { section: 'Classes', links: [
      { key: 'classes', label: 'My Classes', icon: 'fa-chalkboard', href: '/faculty/classes.html' },
      { key: 'session', label: 'Attendance Session', icon: 'fa-qrcode', href: '/faculty/session.html' },
    ]},
    { section: 'Records', links: [
      { key: 'reports', label: 'Attendance Reports', icon: 'fa-file-lines', href: '/faculty/reports.html' },
      { key: 'flagged', label: 'Flagged Records', icon: 'fa-flag', href: '/faculty/flagged.html' },
      { key: 'leave', label: 'Leave Requests', icon: 'fa-plane-departure', href: '/faculty/leave.html' },
    ]},
  ],
  student: [
    { section: 'Overview', links: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', href: '/student/dashboard.html' },
    ]},
    { section: 'Attendance', links: [
      { key: 'attendance', label: 'My Attendance', icon: 'fa-clipboard-check', href: '/student/attendance.html' },
      { key: 'calendar', label: 'Calendar', icon: 'fa-calendar-days', href: '/student/calendar.html' },
      { key: 'scan', label: 'Scan QR', icon: 'fa-qrcode', href: '/student/scan.html' },
    ]},
    { section: 'Academics', links: [
      { key: 'timetable', label: 'Timetable', icon: 'fa-table-list', href: '/student/timetable.html' },
      { key: 'leave', label: 'Apply Leave', icon: 'fa-plane-departure', href: '/student/leave.html' },
    ]},
  ],
};

function renderLayout({ activePage, title }) {
  const user = window.CurrentUser;
  const role = user.role;
  const sections = NAV_CONFIG[role] || [];

  const navHtml = sections
    .map(
      (sec) => `
      <div class="sidebar-section-label">${sec.section}</div>
      ${sec.links
        .map(
          (l) => `
        <a href="${l.href}" class="sidebar-link ${activePage === l.key ? 'active' : ''}">
          <i class="fa-solid ${l.icon}"></i><span>${l.label}</span>
        </a>`
        )
        .join('')}
    `
    )
    .join('');

  const root = document.getElementById('app-shell-root');
  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <i class="fa-solid fa-user-shield"></i>
          <span>SAMS</span>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
          Logged in as<br><strong style="color:#e5e7eb">${escapeHtml(user.name)}</strong>
        </div>
      </aside>

      <div class="main-content">
        <header class="topbar">
          <div class="d-flex align-items-center gap-3">
            <button class="icon-btn d-mobile-only" id="sidebarToggleBtn"><i class="fa-solid fa-bars"></i></button>
            <div class="topbar-title">${title}</div>
          </div>
          <div class="topbar-actions">
            <div class="theme-toggle-switch d-mobile-none" onclick="toggleTheme()" title="Toggle theme">
              <div class="knob"></div>
            </div>
            <button class="icon-btn" id="notifBtn" title="Notifications">
              <i class="fa-solid fa-bell"></i>
              <span class="badge-dot d-none" id="notifDot"></span>
            </button>
            <div class="dropdown">
              <button class="btn btn-light-soft dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                <span class="avatar-circle" style="width:30px;height:30px;font-size:0.72rem;">${initials(user.name)}</span>
                <span class="d-mobile-none">${escapeHtml(user.name.split(' ')[0])}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><span class="dropdown-item-text small text-muted">${escapeHtml(user.email)}</span></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="logout(); return false;">
                  <i class="fa-solid fa-right-from-bracket me-2"></i>Logout</a></li>
              </ul>
            </div>
          </div>
        </header>
        <main class="page-body" id="pageBody"></main>
      </div>
    </div>
  `;

  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    sidebar.classList.toggle('show');
    backdrop.classList.toggle('show');
  });
  backdrop?.addEventListener('click', () => {
    sidebar.classList.remove('show');
    backdrop.classList.remove('show');
  });

  loadNotificationBadge();
}

async function loadNotificationBadge() {
  try {
    const res = await window.Api.get('/notifications', { limit: 1, unreadOnly: true });
    const dot = document.getElementById('notifDot');
    if (dot && res.meta?.unread > 0) dot.classList.remove('d-none');
  } catch (e) {
    // silent fail - non-critical UI element
  }
}

window.renderLayout = renderLayout;