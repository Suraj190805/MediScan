import { useState, useMemo } from 'react'
import {
  Upload, Brain, FileText, CheckCircle, AlertTriangle,
  Settings, User, Clock, Filter
} from 'lucide-react'
import { useDiagnostics } from '../contexts/DiagnosticContext'
import { caseHistory as mockHistory } from '../data/reportsData'
import './History.css'

const iconComponents = {
  upload: Upload,
  brain: Brain,
  file: FileText,
  check: CheckCircle,
  alert: AlertTriangle,
  settings: Settings,
}

const EVENT_TYPES = [
  { id: 'all', label: 'All Events', icon: Filter },
  { id: 'upload', label: 'Uploads', icon: Upload },
  { id: 'prediction', label: 'AI Predictions', icon: Brain },
  { id: 'report', label: 'Reports', icon: FileText },
  { id: 'review', label: 'Reviews', icon: CheckCircle },
  { id: 'alert', label: 'Alerts', icon: AlertTriangle },
  { id: 'system', label: 'System', icon: Settings },
]

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(events) {
  const groups = {}
  events.forEach((e) => {
    const date = new Date(e.timestamp).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(e)
  })
  return groups
}

export default function History() {
  const { history: aiHistory } = useDiagnostics()
  const [typeFilter, setTypeFilter] = useState('all')

  // Combine real AI history with mock data
  const allHistory = useMemo(() => {
    return [...aiHistory, ...mockHistory]
  }, [aiHistory])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return allHistory
    return allHistory.filter((e) => e.type === typeFilter)
  }, [typeFilter, allHistory])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  // Activity stats from combined data
  const activityCounts = useMemo(() => {
    const counts = {}
    allHistory.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1
    })
    return counts
  }, [allHistory])

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-page__header">
        <div>
          <h1 className="history-page__title">Case History</h1>
          <p className="history-page__subtitle">
            Complete audit trail of all diagnostic activities ({allHistory.length} events)
          </p>
        </div>
      </div>

      <div className="timeline-layout">
        {/* Timeline */}
        <div className="timeline-container">
          {Object.entries(grouped).map(([date, events]) => (
            <div key={date} className="timeline-date-group">
              <div className="timeline-date">
                <div className="timeline-date__dot" />
                <span className="timeline-date__label">{date}</span>
              </div>

              {events.map((event) => {
                const Icon = iconComponents[event.icon] || Settings
                return (
                  <div key={event.id} className="timeline-event">
                    <div className="timeline-event__icon-wrap">
                      <div className={`timeline-event__icon ${event.icon}`}>
                        <Icon size={16} />
                      </div>
                    </div>
                    <div className={`timeline-event__card ${event.type === 'alert' ? 'alert' : ''}`}>
                      <div className="timeline-event__top">
                        <span className="timeline-event__title">{event.title}</span>
                        <span className="timeline-event__time">
                          <Clock size={10} style={{ marginRight: 4 }} />
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="timeline-event__desc">{event.description}</p>
                      <div className="timeline-event__footer">
                        <span className="timeline-event__actor">
                          <User size={10} /> {event.user}
                        </span>
                        {event.studyId && (
                          <span className="timeline-event__study-link">
                            {event.studyId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {allHistory.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: 'var(--color-text-tertiary, #666)',
            }}>
              <Upload size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No diagnostic history yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Upload a study to see activity here.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="history-sidebar">
          {/* Activity Breakdown */}
          <div className="history-widget">
            <div className="history-widget__title">Activity Summary</div>
            <div className="activity-breakdown">
              {[
                { label: 'Studies Uploaded', count: activityCounts.upload || 0, icon: Upload, bg: 'var(--color-accent-glow)', color: 'var(--color-accent)' },
                { label: 'AI Predictions', count: activityCounts.prediction || 0, icon: Brain, bg: 'rgba(129,140,248,0.15)', color: '#818CF8' },
                { label: 'Reports Generated', count: activityCounts.report || 0, icon: FileText, bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
                { label: 'Critical Alerts', count: activityCounts.alert || 0, icon: AlertTriangle, bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
              ].map((item) => (
                <div key={item.label} className="activity-item">
                  <div className="activity-item__icon" style={{ background: item.bg, color: item.color }}>
                    <item.icon size={14} />
                  </div>
                  <span className="activity-item__label">{item.label}</span>
                  <span className="activity-item__count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter by Type */}
          <div className="history-widget" style={{ animationDelay: '250ms' }}>
            <div className="history-widget__title">Filter by Type</div>
            <div className="history-type-filters">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`history-type-btn ${typeFilter === t.id ? 'active' : ''}`}
                  onClick={() => setTypeFilter(t.id)}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
