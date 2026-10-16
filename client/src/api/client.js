const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('care_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Handle CSV / binary response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error('Failed to download CSV');
    }
    return response.blob();
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: (url, body) => apiRequest(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
  downloadCsv: async (url, filename) => {
    const blob = await apiRequest(url, { method: 'GET' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
