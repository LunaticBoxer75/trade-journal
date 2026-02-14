const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'API request failed');
  }
  return response.json();
}

// Dashboard
export const getDashboardStats = (dateFrom, dateTo) => {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  return fetchJSON(`/dashboard/stats?${params}`);
};

export const getDailyPnl = (dateFrom, dateTo) => {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  return fetchJSON(`/dashboard/daily-pnl?${params}`);
};

export const getEquityCurve = (startingBalance = 0) =>
  fetchJSON(`/dashboard/equity-curve?starting_balance=${startingBalance}`);

export const getDrawdown = (startingBalance = 0) =>
  fetchJSON(`/dashboard/drawdown?starting_balance=${startingBalance}`);

export const getPerformanceByTicker = () =>
  fetchJSON('/dashboard/performance-by-ticker');

export const getPerformanceByDay = () =>
  fetchJSON('/dashboard/performance-by-day-of-week');

export const getPerformanceBySetup = () =>
  fetchJSON('/dashboard/performance-by-setup');

// Trades
export const importTrades = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/trades/import`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Import failed');
  }
  return response.json();
};

export const getTradeGroups = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });
  return fetchJSON(`/trades/groups?${searchParams}`);
};

export const getTradeGroup = (groupId) =>
  fetchJSON(`/trades/groups/${groupId}`);

export const updateTradeGroup = (groupId, data) =>
  fetchJSON(`/trades/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteTradeGroup = (groupId) =>
  fetchJSON(`/trades/groups/${groupId}`, { method: 'DELETE' });

export const splitTradeGroup = (groupId, tradeIds) =>
  fetchJSON(`/trades/groups/${groupId}/split`, {
    method: 'POST',
    body: JSON.stringify(tradeIds),
  });

export const getTradeChartData = (groupId, interval = '1d') =>
  fetchJSON(`/trades/groups/${groupId}/chart?interval=${interval}`);

export const getUniqueTickers = () =>
  fetchJSON('/trades/tickers');

export const deleteAllTrades = () =>
  fetchJSON('/trades/all', { method: 'DELETE' });

// Tags
export const getTags = () => fetchJSON('/tags/');
export const createTag = (data) =>
  fetchJSON('/tags/', { method: 'POST', body: JSON.stringify(data) });
export const updateTag = (tagId, data) =>
  fetchJSON(`/tags/${tagId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTag = (tagId) =>
  fetchJSON(`/tags/${tagId}`, { method: 'DELETE' });

// Setups
export const getSetups = () => fetchJSON('/setups/');
export const createSetup = (data) =>
  fetchJSON('/setups/', { method: 'POST', body: JSON.stringify(data) });
export const getSetup = (setupId) => fetchJSON(`/setups/${setupId}`);
export const updateSetup = (setupId, data) =>
  fetchJSON(`/setups/${setupId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSetup = (setupId) =>
  fetchJSON(`/setups/${setupId}`, { method: 'DELETE' });

// Journal
export const getJournalEntries = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return fetchJSON(`/journal/?${searchParams}`);
};

export const getJournalEntry = (date) => fetchJSON(`/journal/${date}`);
export const createJournalEntry = (data) =>
  fetchJSON('/journal/', { method: 'POST', body: JSON.stringify(data) });
export const updateJournalEntry = (date, data) =>
  fetchJSON(`/journal/${date}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteJournalEntry = (date) =>
  fetchJSON(`/journal/${date}`, { method: 'DELETE' });

// Account
export const getAccountSnapshots = (limit = 90) =>
  fetchJSON(`/account/snapshots?limit=${limit}`);
export const createAccountSnapshot = (data) =>
  fetchJSON('/account/snapshots', { method: 'POST', body: JSON.stringify(data) });
export const getCurrentBalance = () => fetchJSON('/account/balance');