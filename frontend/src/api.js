// Small wrapper around fetch for calling the backend at /api/v1.

const TOKEN_KEY = 'medassist.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let handleUnauthorized = () => {};

/** Register what to do when the server rejects the saved token (e.g. it expired). */
export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Call the API and return the parsed JSON response.
 * Pass `body` to send JSON, or `form` to send form fields (used by the login endpoint).
 */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = new URLSearchParams(form);
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const url = `${import.meta.env.BASE_URL}api/v1${path}`;
  const res = await fetch(url, { method, headers, body: payload });
  if (res.status === 401 && token) handleUnauthorized();
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(data));
  return data;
}

function errorMessage(data) {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  // FastAPI validation errors are a list like [{ loc: ['body', 'email'], msg: '...' }].
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc.at(-1)}: ${d.msg}`).join('. ');
  return 'Something went wrong. Is the backend running?';
}
