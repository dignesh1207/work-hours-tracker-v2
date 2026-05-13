/**
 * API client - connects to the backend at /api
 * In dev, Vite proxies /api to http://localhost:4000
 */

const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Workplaces
  getWorkplaces: () => request('/workplaces'),
  createWorkplace: (data) => request('/workplaces', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateWorkplace: (id, data) => request(`/workplaces/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteWorkplace: (id) => request(`/workplaces/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/sessions${params ? '?' + params : ''}`);
  },
  createSession: (data) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSession: (id, data) => request(`/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
};
