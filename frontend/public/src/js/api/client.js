/**
 * Core API client. Wraps fetch() with:
 * - Automatic Bearer token attachment
 * - Automatic access-token refresh on 401 (single retry)
 * - Consistent error shape
 */
const API_BASE_URL = (() => {
  // Explicit override always wins (set window.__API_BASE_URL__ before this script loads)
  if (window.__API_BASE_URL__) return window.__API_BASE_URL__;

  // Running locally during development
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:5000/api/v1';
  }

  // ===== DEPLOYMENT: replace this URL with your deployed backend's URL =====
  // e.g. 'https://smart-attendance-backend.onrender.com/api/v1'
  return 'https://smart-attendance-system-8kt4.onrender.com/api/v1';
})();

const TOKEN_KEYS = {
  ACCESS: 'sams_access_token',
  REFRESH: 'sams_refresh_token',
  USER: 'sams_user',
};

const Storage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEYS.ACCESS),
  getRefreshToken: () => localStorage.getItem(TOKEN_KEYS.REFRESH),
  getUser: () => {
    const raw = localStorage.getItem(TOKEN_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  setSession: ({ accessToken, refreshToken, user }) => {
    if (accessToken) localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
    if (refreshToken) localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
    if (user) localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
    localStorage.removeItem(TOKEN_KEYS.USER);
  },
};

let refreshPromise = null;

async function tryRefreshToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = Storage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Refresh failed');

    Storage.setSession({ accessToken: data.data.accessToken });
    return data.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request(method, path, { body, params, isRetry = false } = {}) {
  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = Storage.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle file downloads (PDF/Excel)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error('Request failed');
    return res.blob();
  }

  const data = await res.json();

  if (res.status === 401 && !isRetry && Storage.getRefreshToken()) {
    try {
      await tryRefreshToken();
      return request(method, path, { body, params, isRetry: true });
    } catch (e) {
      Storage.clear();
      window.location.href = '/shared/login.html';
      throw new Error('Session expired');
    }
  }

  if (!res.ok || data.success === false) {
    const err = new Error(data.message || 'Request failed');
    err.errors = data.errors;
    err.statusCode = res.status;
    throw err;
  }

  return data;
}

const Api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
  downloadFile: async (path, params, filename) => {
    const blob = await request('GET', path, { params });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'report';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

window.Api = Api;
window.AuthStorage = Storage;