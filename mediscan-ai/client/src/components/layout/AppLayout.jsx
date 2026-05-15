import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import AmbientBackground from '../AmbientBackground'

export default function AppLayout() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--color-void)' }}>
      <AmbientBackground />
      <Sidebar />
      <div style={{ position: 'relative', zIndex: 10, marginLeft: '260px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
