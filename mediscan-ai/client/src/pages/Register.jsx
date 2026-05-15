import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Stethoscope, Shield, UserCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import './Auth.css'

const roles = [
  { id: 'radiologist', label: 'Radiologist', icon: Stethoscope },
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'physician', label: 'Physician', icon: UserCheck },
]

export default function Register() {
  const navigate = useNavigate()
  const { register: registerUser, isAuthenticated } = useAuth()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'radiologist'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const result = await registerUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
    })
    setLoading(false)

    if (result.success) {
      toast.success('Account created! Please sign in.', { duration: 4000 })
      navigate('/login')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand__logo">M</div>
          <h1 className="auth-brand__name">MediScan AI</h1>
          <p className="auth-brand__tagline">Join the Diagnostic Intelligence Platform</p>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Set up your medical professional profile</p>

          {error && (
            <div className="auth-error" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-with-icon">
                <span className="input-icon"><User size={16} /></span>
                <input
                  type="text"
                  className="input"
                  placeholder="Dr. Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon"><Mail size={16} /></span>
                <input
                  type="email"
                  className="input"
                  placeholder="doctor@hospital.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Role</label>
              <div className="role-selector">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`role-option ${form.role === role.id ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, role: role.id })}
                  >
                    <div className="role-option__icon"><role.icon size={22} /></div>
                    <span className="role-option__label">{role.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-with-icon">
                <span className="input-icon"><Lock size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-with-icon">
                <span className="input-icon"><Lock size={16} /></span>
                <input
                  type="password"
                  className="input"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <><span className="animate-spin" style={{ display: 'inline-flex' }}>⟳</span> Creating account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
