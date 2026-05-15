import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../utils/api'

const AuthContext = createContext(null)

// Demo users for offline development (before backend is connected)
const DEMO_USERS = {
  'admin@mediscan.ai': {
    _id: 'usr_001',
    name: 'Dr. Sarah Chen',
    email: 'admin@mediscan.ai',
    role: 'admin',
    hospitalId: 'HSP-001',
    avatar: 'SC',
    isActive: true,
  },
  'radiologist@mediscan.ai': {
    _id: 'usr_002',
    name: 'Dr. Raj Patel',
    email: 'radiologist@mediscan.ai',
    role: 'radiologist',
    hospitalId: 'HSP-001',
    avatar: 'RP',
    isActive: true,
  },
  'physician@mediscan.ai': {
    _id: 'usr_003',
    name: 'Dr. Emily Nguyen',
    email: 'physician@mediscan.ai',
    role: 'physician',
    hospitalId: 'HSP-001',
    avatar: 'EN',
    isActive: true,
  },
}

const DEMO_MODE = true // Toggle when backend is ready

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('mediscan_user')
    const token = localStorage.getItem('mediscan_token')

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('mediscan_user')
        localStorage.removeItem('mediscan_token')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    setLoading(true)

    try {
      if (DEMO_MODE) {
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 800))

        const demoUser = DEMO_USERS[email.toLowerCase()]
        if (!demoUser) {
          // Accept any email in demo mode, just create a user
          const newUser = {
            _id: 'usr_demo',
            name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            email: email.toLowerCase(),
            role: 'radiologist',
            hospitalId: 'HSP-001',
            avatar: email.substring(0, 2).toUpperCase(),
            isActive: true,
          }
          localStorage.setItem('mediscan_user', JSON.stringify(newUser))
          localStorage.setItem('mediscan_token', 'demo_token_' + Date.now())
          localStorage.setItem('mediscan_refresh_token', 'demo_refresh_' + Date.now())
          setUser(newUser)
          setLoading(false)
          return { success: true, user: newUser }
        }

        localStorage.setItem('mediscan_user', JSON.stringify(demoUser))
        localStorage.setItem('mediscan_token', 'demo_token_' + Date.now())
        localStorage.setItem('mediscan_refresh_token', 'demo_refresh_' + Date.now())
        setUser(demoUser)
        setLoading(false)
        return { success: true, user: demoUser }
      }

      // Real API call
      const { data } = await authAPI.login(email, password)
      localStorage.setItem('mediscan_user', JSON.stringify(data.user))
      localStorage.setItem('mediscan_token', data.accessToken)
      localStorage.setItem('mediscan_refresh_token', data.refreshToken)
      setUser(data.user)
      setLoading(false)
      return { success: true, user: data.user }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid credentials'
      setError(message)
      setLoading(false)
      return { success: false, error: message }
    }
  }, [])

  const register = useCallback(async (userData) => {
    setError(null)
    setLoading(true)

    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 1000))
        setLoading(false)
        return { success: true, message: 'Account created successfully' }
      }

      const { data } = await authAPI.register(userData)
      setLoading(false)
      return { success: true, message: data.message || 'Account created' }
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed'
      setError(message)
      setLoading(false)
      return { success: false, error: message }
    }
  }, [])

  const forgotPassword = useCallback(async (email) => {
    setError(null)

    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 800))
        return { success: true, message: 'Password reset link sent to your email' }
      }

      const { data } = await authAPI.forgotPassword(email)
      return { success: true, message: data.message }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset link'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('mediscan_user')
    localStorage.removeItem('mediscan_token')
    localStorage.removeItem('mediscan_refresh_token')
    setUser(null)
    setError(null)
  }, [])

  const updateProfile = useCallback((updates) => {
    const updated = { ...user, ...updates }
    setUser(updated)
    localStorage.setItem('mediscan_user', JSON.stringify(updated))
  }, [user])

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isRadiologist: user?.role === 'radiologist',
    isPhysician: user?.role === 'physician',
    login,
    register,
    forgotPassword,
    logout,
    updateProfile,
    clearError: () => setError(null),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
