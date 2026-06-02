const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const getUsers = () =>
  fetch(`${BASE}/users`).then(handle);

export const updateUser = (id, name) =>
  fetch(`${BASE}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(handle);

export const getTasks = (userId) =>
  fetch(`${BASE}/tasks${userId != null ? `?userId=${userId}` : ''}`).then(handle);

export const addTask = (name, userId) =>
  fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId }),
  }).then(handle);

export const deleteTask = (id) =>
  fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' }).then(handle);

export const getEntries = (date, userId) =>
  fetch(`${BASE}/entries?date=${date}&userId=${userId}`).then(handle);

export const saveEntry = (userId, taskId, date, completed) =>
  fetch(`${BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, taskId, date, completed }),
  }).then(handle);

export const getWeeklyProgress = (userId, startDate) =>
  fetch(`${BASE}/progress/weekly?userId=${userId}&startDate=${startDate}`).then(handle);

export const getMonthlyProgress = (userId, year, month) =>
  fetch(`${BASE}/progress/monthly?userId=${userId}&year=${year}&month=${month}`).then(handle);

export const getStats = (userId) =>
  fetch(`${BASE}/stats?userId=${userId}`).then(handle);
