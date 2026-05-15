import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { DiagnosticProvider } from './contexts/DiagnosticContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Upload from './pages/Upload'
import Studies from './pages/Studies'
import Reports from './pages/Reports'
import History from './pages/History'
import Settings from './pages/Settings'
import Analysis from './pages/Analysis'

function App() {
  return (
    <Router>
      <AuthProvider>
      <DiagnosticProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-elevated)',
              color: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: 'var(--color-elevated)' },
            },
            error: {
              iconTheme: { primary: '#F43F5E', secondary: 'var(--color-elevated)' },
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="upload" element={<Upload />} />
            <Route path="studies" element={<Studies />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </DiagnosticProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
