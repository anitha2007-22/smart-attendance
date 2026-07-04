/**
 * Light/Dark theme toggle. Applies data-theme attribute on <html>,
 * persists preference in localStorage, respects system preference on first load.
 */
(function () {
  const THEME_KEY = 'sams_theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('[data-theme-icon]').forEach((el) => {
      el.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  }

  // Apply immediately to avoid flash of wrong theme
  applyTheme(getPreferredTheme());

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  window.initThemeToggle = function () {
    applyTheme(getPreferredTheme());
  };
})();