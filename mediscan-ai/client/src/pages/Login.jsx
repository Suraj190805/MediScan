import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import AmbientBackground from '../components/AmbientBackground'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('All fields are required'); return }
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    const demos = {
      admin: ['admin@mediscan.ai', 'password123'],
      radiologist: ['dr.raj@mediscan.ai', 'password123'],
      physician: ['dr.chen@mediscan.ai', 'password123'],
    }
    setEmail(demos[role][0])
    setPassword(demos[role][1])
    setError('')
  }

  return (
    <div className="auth-page">
      <AmbientBackground />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="auth-container"
      >
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand__logo">M</div>
          <div className="auth-brand__name">MediScan</div>
          <div className="auth-brand__tagline">AI-Powered Diagnostic Intelligence</div>
        </div>

        {/* Card */}
        <div className="auth-card">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to access your diagnostic workspace</p>

          {/* Demo Buttons */}
          <div className="mb-5 flex gap-2">
            {['admin', 'radiologist', 'physician'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => fillDemo(r)}
                className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35 transition-all duration-200 hover:border-[var(--color-cyan)]/20 hover:bg-[var(--color-cyan)]/[0.04] hover:text-[var(--color-cyan)]"
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="auth-error mb-4"
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="input"
                  placeholder="you@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-with-icon relative">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="auth-row">
              <label className="auth-remember">
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
