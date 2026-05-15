import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Upload, FolderSearch, FileText,
  Shield, Settings, Activity, History, LogOut,
  Brain, Scan
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Study' },
  { to: '/studies', icon: FolderSearch, label: 'Studies', badge: 3 },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/analysis', icon: Brain, label: 'AI Analysis' },
  { to: '/history', icon: History, label: 'Case History' },
]

const adminNav = [
  { to: '/admin', icon: Shield, label: 'Admin Panel' },
  { to: '/audit-logs', icon: Activity, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()

  const handleLogout = () => { logout(); navigate('/login') }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role) => {
    const labels = { admin: 'Administrator', radiologist: 'Radiologist', physician: 'Referring Physician' }
    return labels[role] || role
  }

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 40,
      display: 'flex',
      height: '100vh',
      width: '260px',
      flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(6,11,18,0.85)',
      backdropFilter: 'blur(24px) saturate(1.3)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
    }}>
      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            height: '40px',
            width: '40px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00D4FF, #6366F1)',
            fontSize: '14px',
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 0 30px rgba(0,212,255,0.25)',
          }}>M</div>
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            height: '12px',
            width: '12px',
            borderRadius: '50%',
            border: '2px solid #060b12',
            background: '#10B981',
          }} />
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.95)' }}>MediScan</span>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.7)' }}>AI Diagnostics</span>
        </div>
      </motion.div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <div style={{ marginBottom: '8px', padding: '0 12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>Workspace</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {mainNav.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  background: isActive ? 'rgba(0,212,255,0.06)' : 'transparent',
                  color: isActive ? '#00D4FF' : 'rgba(255,255,255,0.45)',
                  boxShadow: isActive ? 'inset 0 0 20px rgba(0,212,255,0.03)' : 'none',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      height: '20px',
                      width: '3px',
                      transform: 'translateY(-50%)',
                      borderRadius: '999px',
                      background: '#00D4FF',
                      boxShadow: '0 0 10px rgba(0,212,255,0.5)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon size={17} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    height: '20px',
                    minWidth: '20px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    background: 'rgba(244,63,94,0.15)',
                    padding: '0 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#F43F5E',
                  }}>{item.badge}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Admin */}
        {isAdmin && (
          <>
            <div style={{ marginBottom: '8px', marginTop: '24px', padding: '0 12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>Administration</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {adminNav.map((item) => {
                const isActive = location.pathname === item.to
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      background: isActive ? 'rgba(0,212,255,0.06)' : 'transparent',
                      color: isActive ? '#00D4FF' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </>
        )}
        {!isAdmin && (
          <>
            <div style={{ marginBottom: '8px', marginTop: '24px', padding: '0 12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>Settings</div>
            <nav>
              <NavLink
                to="/settings"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: isActive ? 'rgba(0,212,255,0.06)' : 'transparent',
                  color: isActive ? '#00D4FF' : 'rgba(255,255,255,0.45)',
                })}
              >
                <Settings size={17} />
                <span>Settings</span>
              </NavLink>
            </nav>
          </>
        )}
      </div>

      {/* AI Status */}
      <div style={{
        margin: '0 16px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderRadius: '10px',
        border: '1px solid rgba(0,212,255,0.08)',
        background: 'rgba(0,212,255,0.03)',
        padding: '10px 12px',
      }}>
        <div style={{ position: 'relative', display: 'flex', height: '28px', width: '28px', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(0,212,255,0.08)' }}>
          <Scan size={14} style={{ color: '#00D4FF' }} />
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', height: '8px', width: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>AI Engine Active</div>
          <div style={{ fontSize: '10px', color: 'rgba(0,212,255,0.5)' }}>ResNet-50 v1.2.1</div>
        </div>
      </div>

      {/* User Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            height: '36px',
            width: '36px',
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            fontSize: '12px',
            fontWeight: 700,
            color: 'white',
            boxShadow: '0 0 15px rgba(99,102,241,0.2)',
          }}>{getInitials(user?.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getRoleLabel(user?.role)}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              display: 'flex',
              height: '32px',
              width: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.color = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'rgba(255,255,255,0.2)' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
