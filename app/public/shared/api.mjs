// Shared browser API boundary for both the dashboard and review pages.
export const API_BASE = window.location.origin.startsWith('http')
  ? window.location.origin
  : 'http://127.0.0.1:8790';

export const API_TOKEN = new URLSearchParams(window.location.search).get('token') || '';

const nativeFetch = window.fetch.bind(window);

function withApiToken(input, init = {}) {
  const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.href);
  if (!API_TOKEN || requestUrl.origin !== API_BASE || !requestUrl.pathname.startsWith('/api/')) {
    return { input, init };
  }
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
  headers.set('X-Offline-Subtitle-Token', API_TOKEN);
  return { input, init: { ...init, headers } };
}

// Keep the existing page code's fetch calls compatible while centralizing the
// token boundary. This is intentionally installed once per page module graph.
if (!window.__offlineSubtitleSharedFetchInstalled) {
  window.fetch = (input, init = {}) => {
    const request = withApiToken(input, init);
    return nativeFetch(request.input, request.init);
  };
  window.__offlineSubtitleSharedFetchInstalled = true;
}

export function appUrl(pathname) {
  const url = new URL(pathname, `${API_BASE}/`);
  if (API_TOKEN) url.searchParams.set('token', API_TOKEN);
  return url.toString();
}

export async function apiGet(pathname, options = {}) {
  const response = await fetch(appUrl(pathname), { ...options, cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function apiPost(pathname, body, options = {}) {
  const response = await fetch(appUrl(pathname), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(body),
    ...options,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function apiDelete(pathname, options = {}) {
  const response = await fetch(appUrl(pathname), { method: 'DELETE', ...options });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
