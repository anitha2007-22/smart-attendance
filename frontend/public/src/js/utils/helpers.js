/* Small shared utilities used across all pages */

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:3000;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }

  const colors = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2551eb',
  };
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    background:${colors[type] || colors.info}; color:#fff; padding:12px 18px;
    border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.2); font-size:0.88rem;
    font-weight:600; display:flex; align-items:center; gap:10px; min-width:260px;
    max-width:360px; animation: sams-toast-in 0.25s ease;
  `;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(t) {
  if (!t) return '-';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${suffix}`;
}

function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function trustBadge(level) {
  const map = {
    high: { cls: 'success', label: 'High' },
    medium: { cls: 'warning', label: 'Medium' },
    low: { cls: 'danger', label: 'Low' },
  };
  const m = map[level] || map.high;
  return `<span class="badge-soft ${m.cls}"><span class="trust-dot ${level}"></span>${m.label}</span>`;
}

function statusBadge(status) {
  const map = {
    present: { cls: 'success', label: 'Present' },
    late: { cls: 'warning', label: 'Late' },
    absent: { cls: 'danger', label: 'Absent' },
    pending: { cls: 'warning', label: 'Pending' },
    approved: { cls: 'success', label: 'Approved' },
    rejected: { cls: 'danger', label: 'Rejected' },
    active: { cls: 'info', label: 'Active' },
    closed: { cls: 'success', label: 'Closed' },
  };
  const m = map[status] || { cls: 'info', label: status };
  return `<span class="badge-soft ${m.cls}">${m.label}</span>`;
}

function buildPagination(container, meta, onPageChange) {
  if (!container) return;
  if (!meta || meta.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  let html = '<nav><ul class="pagination pagination-sm mb-0">';
  html += `<li class="page-item ${!meta.hasPrev ? 'disabled' : ''}">
    <button class="page-link" data-page="${meta.page - 1}">Prev</button></li>`;
  for (let p = 1; p <= meta.totalPages; p++) {
    html += `<li class="page-item ${p === meta.page ? 'active' : ''}">
      <button class="page-link" data-page="${p}">${p}</button></li>`;
  }
  html += `<li class="page-item ${!meta.hasNext ? 'disabled' : ''}">
    <button class="page-link" data-page="${meta.page + 1}">Next</button></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('.page-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (page >= 1 && page <= meta.totalPages) onPageChange(page);
    });
  });
}

window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatTime = formatTime;
window.debounce = debounce;
window.initials = initials;
window.trustBadge = trustBadge;
window.statusBadge = statusBadge;
window.buildPagination = buildPagination;