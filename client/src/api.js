const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  register: (username, password, displayName) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, displayName }) }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/users/me'),
  listFriends: () => request('/friends'),
  searchUsers: (q) => request(`/friends/search?q=${encodeURIComponent(q)}`),
  sendFriendRequest: (targetUsername) =>
    request('/friends/requests', { method: 'POST', body: JSON.stringify({ targetUsername }) }),
  pendingRequests: () => request('/friends/requests/pending'),
  acceptRequest: (id) => request(`/friends/requests/${id}/accept`, { method: 'POST' }),
  rejectRequest: (id) => request(`/friends/requests/${id}/reject`, { method: 'POST' }),
};

export { SERVER_URL, getToken };
