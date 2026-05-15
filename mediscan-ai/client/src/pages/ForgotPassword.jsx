import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    const result = await forgotPassword(email)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
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
          <p className="auth-brand__tagline">Account Recovery</p>
        </div>

        <div className="auth-card">
          {success ? (
            /* Success State */
            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <div style={{
                width: 64, height: 64,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-6)',
              }}>
                <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
              </div>
              <h2 className="auth-title" style={{ textAlign: 'center' }}>Check Your Email</h2>
              <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                We&apos;ve sent a password reset link to{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>.
                <br />Check your inbox and follow the instructions.
              </p>
              <p style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-6)',
              }}>
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => { setSuccess(false); setEmail('') }}
                >
                  Try Another Email
                </button>
                <Link to="/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              <h2 className="auth-title">Forgot Password?</h2>
              <p className="auth-subtitle">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="auth-error" style={{ marginBottom: 'var(--space-4)' }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-with-icon">
                    <span className="input-icon"><Mail size={16} /></span>
                    <input
                      type="email"
                      className="input"
                      placeholder="doctor@hospital.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="animate-spin" style={{ display: 'inline-flex' }}>⟳</span> Sending...</>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="auth-footer" style={{ marginTop: 'var(--space-6)' }}>
                <Link to="/login" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)',
                }}>
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
