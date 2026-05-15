import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mediscan_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('mediscan_refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        localStorage.setItem('mediscan_token', data.accessToken)
        if (data.refreshToken) {
          localStorage.setItem('mediscan_refresh_token', data.refreshToken)
        }

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('mediscan_token')
        localStorage.removeItem('mediscan_refresh_token')
        localStorage.removeItem('mediscan_user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ───────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/auth/profile'),
}

// ─── Studies API ────────────────────────────────────────────
export const studiesAPI = {
  list: (params) => api.get('/studies', { params }),
  get: (id) => api.get(`/studies/${id}`),
  upload: (formData) => api.post('/studies/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 min for upload + AI inference
  }),
  analyze: (id) => api.post(`/studies/${id}/analyze`, {}, { timeout: 120000 }),
  delete: (id) => api.delete(`/studies/${id}`),
  aiHealth: () => api.get('/studies/ai/health'),
}

// ─── Predictions API ────────────────────────────────────────
export const predictionsAPI = {
  get: (studyId) => api.get(`/predictions/${studyId}`),
}

// ─── Reports API ────────────────────────────────────────────
export const reportsAPI = {
  generate: (studyId, data) => api.post(`/reports/${studyId}`, data),
  download: (studyId) => api.get(`/reports/${studyId}/download`, { responseType: 'blob' }),
}

// ─── Admin API ──────────────────────────────────────────────
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSystemStats: () => api.get('/admin/stats'),
}

export default api
