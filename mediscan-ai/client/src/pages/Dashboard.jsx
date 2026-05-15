import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Brain, FileText, TrendingUp, ArrowUpRight,
  ArrowDownRight, Upload, AlertTriangle,
  Zap, BarChart3, Scan, Heart, Eye
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
}

// ── Animated Counter ────────────────────────────
function useCounter(target, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let c = 0
    const step = Math.max(1, Math.floor(target / (duration / 16)))
    const timer = setInterval(() => {
      c += step
      if (c >= target) { setCount(target); clearInterval(timer) }
      else setCount(c)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

// ── Stat Card ───────────────────────────────────
function StatCard({ icon: Icon, label, value, change, changeType, accentColor, glowColor }) {
  const numVal = parseInt(String(value).replace(/[^0-9]/g, '')) || 0
  const count = useCounter(numVal)
  const isPercent = String(value).includes('%')

  return (
    <motion.div variants={item} style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.04)',
      background: '#0e1520',
      padding: '20px',
      transition: 'all 0.3s ease',
      boxShadow: `0 0 25px ${glowColor}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>{label}</div>
          <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.95)' }}>
            {isPercent ? `${count}%` : count.toLocaleString()}
          </div>
          {change && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: changeType === 'up' ? '#10B981' : '#F43F5E' }}>
              {changeType === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {change}
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          height: '40px',
          width: '40px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          background: `${accentColor}14`,
        }}>
          <Icon size={18} style={{ color: accentColor }} />
        </div>
      </div>
    </motion.div>
  )
}

// ── Insight Card ────────────────────────────────
function InsightCard({ title, value, description, icon: Icon, accentColor, gradientBg }) {
  return (
    <motion.div variants={item} style={{
      borderRadius: '12px',
      border: `1px solid ${accentColor}18`,
      background: gradientBg,
      padding: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={14} style={{ color: accentColor }} />
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{title}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{description}</div>
    </motion.div>
  )
}

const recentStudies = [
  { id: 'STD-2847', patient: 'James Wilson', patientId: 'PT-00421', modality: 'X-Ray', bodyPart: 'Chest', status: 'Completed', prediction: 'Pneumonia', confidence: 94.2 },
  { id: 'STD-2846', patient: 'Maria Garcia', patientId: 'PT-00419', modality: 'MRI', bodyPart: 'Brain', status: 'Processing', prediction: null, confidence: null },
  { id: 'STD-2845', patient: 'Robert Kim', patientId: 'PT-00418', modality: 'CT Scan', bodyPart: 'Lung', status: 'Completed', prediction: 'Normal', confidence: 97.8 },
  { id: 'STD-2844', patient: 'Emily Nguyen', patientId: 'PT-00415', modality: 'X-Ray', bodyPart: 'Chest', status: 'Pending', prediction: null, confidence: null },
  { id: 'STD-2843', patient: 'David Johnson', patientId: 'PT-00412', modality: 'MRI', bodyPart: 'Brain', status: 'Completed', prediction: 'Glioma', confidence: 89.1 },
]

const modalityStyle = {
  'X-Ray': { border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF' },
  'CT Scan': { border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6' },
  'MRI': { border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' },
}
const statusStyle = {
  Completed: { background: 'rgba(16,185,129,0.1)', color: '#10B981' },
  Processing: { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  Pending: { background: 'rgba(56,189,248,0.1)', color: '#38BDF8' },
  Failed: { background: 'rgba(244,63,94,0.1)', color: '#F43F5E' },
}

export default function Dashboard() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const thStyle = { padding: '12px 24px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', textAlign: 'left' }
  const tdStyle = { padding: '14px 24px' }

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ maxWidth: '1400px' }}>
      {/* Hero */}
      <motion.div variants={item} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.95)', marginBottom: '4px' }}>
          {greeting}, <span style={{ background: 'linear-gradient(90deg, #00D4FF, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.name?.split(' ')[0] || 'Doctor'}</span>
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Here's your diagnostic workspace overview for today.</p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon={Scan} label="Studies Today" value="12" change="+18% vs yesterday" changeType="up" accentColor="#00D4FF" glowColor="rgba(0,212,255,0.06)" />
        <StatCard icon={Brain} label="AI Predictions" value="847" change="+12% this week" changeType="up" accentColor="#8B5CF6" glowColor="rgba(139,92,246,0.06)" />
        <StatCard icon={TrendingUp} label="Accuracy Rate" value="96%" change="+0.8% improvement" changeType="up" accentColor="#10B981" glowColor="rgba(16,185,129,0.06)" />
        <StatCard icon={AlertTriangle} label="Pending Review" value="3" change="2 critical" changeType="down" accentColor="#F59E0B" glowColor="rgba(245,158,11,0.06)" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Table */}
        <motion.div variants={item} style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', background: '#0e1520', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 24px' }}>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Recent Cases</h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>Latest diagnostic submissions</p>
            </div>
            <button className="btn-ghost" style={{ color: '#00D4FF' }}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Study ID', 'Patient', 'Modality', 'Body Part', 'Status', 'Prediction', 'Confidence', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentStudies.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                >
                  <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(0,212,255,0.65)' }}>{s.id}</span></td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{s.patient}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{s.patientId}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 600, ...modalityStyle[s.modality] }}>{s.modality}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>{s.bodyPart}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', borderRadius: '999px', padding: '3px 10px', fontSize: '10px', fontWeight: 600, ...statusStyle[s.status] }}>{s.status}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{s.prediction || '—'}</td>
                  <td style={tdStyle}>
                    {s.confidence ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ height: '4px', width: '48px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.confidence}%` }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              height: '100%',
                              borderRadius: '999px',
                              background: s.confidence >= 90 ? '#10B981' : '#F59E0B',
                            }}
                          />
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{s.confidence}%</span>
                      </div>
                    ) : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)' }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <button className="btn-icon" style={{ opacity: 0.3 }}><Eye size={14} /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <motion.div variants={item} style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', paddingLeft: '4px' }}>AI Insights</motion.div>

          <InsightCard icon={Zap} title="Processing Speed" value="2.4s" description="Average inference time per scan" accentColor="#00D4FF" gradientBg="linear-gradient(135deg, rgba(0,212,255,0.06), transparent)" />
          <InsightCard icon={Heart} title="Critical Findings" value="3" description="Requiring immediate attention" accentColor="#F43F5E" gradientBg="linear-gradient(135deg, rgba(244,63,94,0.06), transparent)" />
          <InsightCard icon={BarChart3} title="Weekly Volume" value="156" description="Scans processed this week" accentColor="#8B5CF6" gradientBg="linear-gradient(135deg, rgba(139,92,246,0.06), transparent)" />
          <InsightCard icon={Activity} title="Model Accuracy" value="96.4%" description="Across all modalities" accentColor="#10B981" gradientBg="linear-gradient(135deg, rgba(16,185,129,0.06), transparent)" />

          <motion.div variants={item} style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Upload size={15} /> Upload New Study
            </button>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <FileText size={15} /> Generate Report
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
