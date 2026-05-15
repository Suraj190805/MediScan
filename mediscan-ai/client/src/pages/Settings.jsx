import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import './Settings.css'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    hospitalId: user?.hospitalId || '',
  })
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    criticalAlerts: true,
    reportAutoGen: false,
    darkMode: true,
    compactView: false,
  })

  const handleSaveProfile = () => {
    updateProfile({ name: form.name, hospitalId: form.hospitalId })
    toast.success('Profile updated successfully')
  }

  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
    toast.success('Preference updated')
  }

  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Settings</h1>
      <p className="settings-page__subtitle">Manage your profile and workspace preferences</p>

      {/* Profile */}
      <div className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">Profile</h3>
          <p className="settings-section__desc">Your account and professional details</p>
        </div>
        <div className="settings-section__body">
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input type="email" className="input" value={form.email} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Hospital / Institution ID</label>
            <input
              type="text"
              className="input"
              value={form.hospitalId}
              onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
              placeholder="HSP-001"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Role</label>
            <input type="text" className="input" value={user?.role || ''} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }}
            />
          </div>
        </div>
        <div className="settings-section__footer">
          <button className="btn btn-secondary btn-sm">Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSaveProfile}>Save Changes</button>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">Notifications</h3>
          <p className="settings-section__desc">Control how you receive alerts</p>
        </div>
        <div className="settings-section__body">
          <div className="settings-row">
            <div className="settings-row__info">
              <div className="settings-row__label">Email Notifications</div>
              <div className="settings-row__desc">Receive study updates and report alerts via email</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={prefs.emailNotifications} onChange={() => togglePref('emailNotifications')} />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row__info">
              <div className="settings-row__label">Critical Finding Alerts</div>
              <div className="settings-row__desc">Immediate push notifications for critical AI detections</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={prefs.criticalAlerts} onChange={() => togglePref('criticalAlerts')} />
              <span className="toggle__slider" />
            </label>
          </div>
        </div>
      </div>

      {/* AI Preferences */}
      <div className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">AI & Analysis</h3>
          <p className="settings-section__desc">Configure AI-assisted diagnostic behavior</p>
        </div>
        <div className="settings-section__body">
          <div className="settings-row">
            <div className="settings-row__info">
              <div className="settings-row__label">Auto-Generate Reports</div>
              <div className="settings-row__desc">Automatically create draft reports after AI analysis completes</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={prefs.reportAutoGen} onChange={() => togglePref('reportAutoGen')} />
              <span className="toggle__slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">Appearance</h3>
          <p className="settings-section__desc">Customize the workspace look and feel</p>
        </div>
        <div className="settings-section__body">
          <div className="settings-row">
            <div className="settings-row__info">
              <div className="settings-row__label">Dark Mode</div>
              <div className="settings-row__desc">Use dark theme for reduced eye strain during long sessions</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={prefs.darkMode} onChange={() => togglePref('darkMode')} />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="settings-row">
            <div className="settings-row__info">
              <div className="settings-row__label">Compact View</div>
              <div className="settings-row__desc">Show more data per screen with reduced spacing</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={prefs.compactView} onChange={() => togglePref('compactView')} />
              <span className="toggle__slider" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
