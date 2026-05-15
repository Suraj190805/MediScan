import { useLocation } from 'react-router-dom'
import { Search, Bell, ChevronRight, Command } from 'lucide-react'

const breadcrumbMap = {
  '/': 'Dashboard',
  '/upload': 'Upload Study',
  '/studies': 'Studies',
  '/reports': 'Reports',
  '/analysis': 'AI Analysis',
  '/history': 'Case History',
  '/admin': 'Admin Panel',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Settings',
}

export default function Navbar() {
  const location = useLocation()
  const currentPage = breadcrumbMap[location.pathname] || 'Dashboard'

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      display: 'flex',
      height: '60px',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(3,5,8,0.65)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '0 32px',
    }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }} aria-label="Breadcrumb">
        <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>MediScan</span>
        <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.12)' }} />
        <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{currentPage}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }} />
          <input
            type="text"
            style={{
              height: '36px',
              width: '260px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              paddingLeft: '36px',
              paddingRight: '64px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.8)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            placeholder="Search studies, patients..."
            aria-label="Search"
          />
          <div style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            padding: '2px 6px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.2)',
          }}>
            <Command size={10} />K
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '20px', width: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* AI Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '999px',
          border: '1px solid rgba(16,185,129,0.1)',
          background: 'rgba(16,185,129,0.04)',
          padding: '6px 12px',
        }}>
          <div style={{
            position: 'relative',
            height: '6px',
            width: '6px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 6px rgba(16,185,129,0.6)',
          }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(16,185,129,0.8)' }}>AI Online</span>
        </div>

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            display: 'flex',
            height: '36px',
            width: '36px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            height: '8px',
            width: '8px',
            borderRadius: '50%',
            background: '#F43F5E',
            boxShadow: '0 0 6px rgba(244,63,94,0.5)',
          }} />
        </button>
      </div>
    </header>
  )
}
