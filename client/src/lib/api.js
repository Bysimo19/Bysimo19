export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, url, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'forja' },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${url}`, opts);
  } catch {
    throw new ApiError(0, 'Sin conexión. Revisa tu internet e inténtalo de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event('forja:unauthorized'));
    throw new ApiError(res.status, data.error || 'Algo ha fallado');
  }
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b = {}) => request('POST', u, b),
  put: (u, b = {}) => request('PUT', u, b),
  del: (u, b) => request('DELETE', u, b),
};
