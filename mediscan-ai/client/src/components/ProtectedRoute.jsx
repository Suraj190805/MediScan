import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Optionally restricts by role(s).
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}> ... </Route>
 *   <Route element={<ProtectedRoute roles={['admin']} />}> ... </Route>
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Still checking auth state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-sm)',
        gap: '12px',
      }}>
        <span className="animate-spin" style={{ fontSize: '1.2rem' }}>⟳</span>
        Loading...
      </div>
    )
  }

  // Not authenticated — redirect to login with return URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check — if roles specified, user must have one of them
  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem',
        }}>🔒</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem',
        }}>Access Denied</h2>
        <p style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--text-sm)',
          marginBottom: '1.5rem',
        }}>
          You don&apos;t have permission to access this page.
          <br />Required role: {roles.join(' or ')}
        </p>
        <a href="/" className="btn btn-secondary">Return to Dashboard</a>
      </div>
    )
  }

  return children
}
