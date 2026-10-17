const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const getAuthToken = () => localStorage.getItem('findoc_token') || localStorage.getItem('token');
export const setAuthToken = (token) => {
  localStorage.setItem('findoc_token', token);
  localStorage.setItem('token', token);
};
export const removeAuthToken = () => {
  localStorage.removeItem('findoc_token');
  localStorage.removeItem('token');
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!options.isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (response.status === 401) {
      removeAuthToken();
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'An error occurred while communicating with the server.');
    }
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// API Services
export const authApi = {
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (full_name, email, password, role = 'ANALYST') => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name, email, password, role })
  }),
  getMe: () => apiFetch('/auth/me')
};

export const documentApi = {
  upload: (formData) => apiFetch('/documents/upload', {
    method: 'POST',
    body: formData,
    isFormData: true
  }),
  list: (category = null, status = null) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/documents/${queryStr}`);
  },
  getDetail: (id) => apiFetch(`/documents/${id}`),
  delete: (id) => apiFetch(`/documents/${id}`, { method: 'DELETE' }),
  getDashboardOverview: () => apiFetch('/documents/dashboard/overview'),
  getRiskAssessment: () => apiFetch('/documents/risk/assessment'),
  getAnomalies: () => apiFetch('/documents/anomalies/list'),
  clearSessionDocuments: () => apiFetch('/documents/session/clear', { method: 'DELETE' }),
  getAuditHistory: () => apiFetch('/documents/audit-history'),
  saveAuditSnapshot: () => apiFetch('/documents/audit-history/save', { method: 'POST' })
};


export const demoApi = {
  seedDemo: () => apiFetch('/demo/seed', { method: 'POST' }),
  unloadDemo: () => apiFetch('/demo', { method: 'DELETE' })
};
