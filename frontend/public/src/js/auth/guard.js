/**
 * Auth guard: include this script at the top of every protected page.
 * Usage: <script src="/src/js/auth/guard.js" data-roles="admin"></script>
 * data-roles is a comma-separated list; omit to allow any authenticated role.
 */
(function () {
  const user = window.AuthStorage.getUser();
  const token = window.AuthStorage.getAccessToken();

  if (!token || !user) {
    window.location.href = '/shared/login.html';
    return;
  }

  const scriptTag = document.currentScript;
  const allowedRoles = scriptTag?.dataset?.roles
    ? scriptTag.dataset.roles.split(',').map((r) => r.trim())
    : null;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard instead of the wrong-role page
    window.location.href = `/${user.role}/dashboard.html`;
    return;
  }

  window.CurrentUser = user;
})();

async function logout() {
  try {
    const refreshToken = window.AuthStorage.getRefreshToken();
    if (refreshToken) {
      await window.Api.post('/auth/logout', { refreshToken });
    }
  } catch (e) {
    // ignore - clearing local session regardless
  } finally {
    window.AuthStorage.clear();
    window.location.href = '/shared/login.html';
  }
}
window.logout = logout;