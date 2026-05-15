import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, Scan, ZoomIn, ZoomOut, RotateCcw,
  Download, Maximize2,
  AlertTriangle, Activity, Target,
  Crosshair, Thermometer, Info
} from 'lucide-react'

// ── Heatmap Canvas ──────────────────────────────
function HeatmapCanvas({ width = 500, height = 500, showHeatmap, heatmapOpacity }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height

    // X-ray background
    const grd = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 2)
    grd.addColorStop(0, '#1a1a2e')
    grd.addColorStop(0.5, '#0d0d15')
    grd.addColorStop(1, '#030308')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, width, height)

    // Ribcage
    ctx.strokeStyle = 'rgba(180,190,210,0.12)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 8; i++) {
      const y = 120 + i * 40
      const curve = 20 + i * 3
      ctx.beginPath(); ctx.moveTo(width / 2, y); ctx.quadraticCurveTo(width / 2 - 80, y - curve, width / 2 - 150, y + 10); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(width / 2, y); ctx.quadraticCurveTo(width / 2 + 80, y - curve, width / 2 + 150, y + 10); ctx.stroke()
    }

    // Spine
    ctx.strokeStyle = 'rgba(200,210,230,0.08)'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(width / 2, 80); ctx.lineTo(width / 2, height - 80); ctx.stroke()

    // Lung outlines
    ctx.strokeStyle = 'rgba(160,180,200,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(width / 2 - 80, height / 2 - 20, 100, 160, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(width / 2 + 80, height / 2 - 20, 100, 160, 0, 0, Math.PI * 2); ctx.stroke()

    // Heart
    ctx.fillStyle = 'rgba(180,190,210,0.04)'
    ctx.beginPath(); ctx.ellipse(width / 2 - 20, height / 2 + 20, 50, 60, -0.3, 0, Math.PI * 2); ctx.fill()

    // Heatmap
    if (showHeatmap) {
      ctx.globalAlpha = heatmapOpacity
      const g1 = ctx.createRadialGradient(width / 2 + 70, height / 2 - 40, 10, width / 2 + 70, height / 2 - 40, 90)
      g1.addColorStop(0, 'rgba(255,50,50,0.8)'); g1.addColorStop(0.3, 'rgba(255,100,20,0.5)'); g1.addColorStop(0.6, 'rgba(255,200,0,0.25)'); g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, width, height)

      const g2 = ctx.createRadialGradient(width / 2 - 50, height / 2 + 30, 5, width / 2 - 50, height / 2 + 30, 50)
      g2.addColorStop(0, 'rgba(255,200,0,0.4)'); g2.addColorStop(0.5, 'rgba(100,200,255,0.15)'); g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }
  }, [width, height, showHeatmap, heatmapOpacity])

  return <canvas ref={canvasRef} style={{ borderRadius: '8px' }} />
}

// ── Finding Card ────────────────────────────────
function FindingCard({ finding, index, isActive, onClick }) {
  const colors = {
    high: { bg: 'rgba(244,63,94,0.05)', border: isActive ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)', dot: '#F43F5E', text: '#F43F5E' },
    medium: { bg: 'rgba(245,158,11,0.05)', border: isActive ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)', dot: '#F59E0B', text: '#F59E0B' },
    low: { bg: 'rgba(16,185,129,0.05)', border: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)', dot: '#10B981', text: '#10B981' },
  }
  const c = colors[finding.severity]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: '10px',
        border: `1px solid ${c.border}`,
        background: isActive ? c.bg : '#0e1520',
        padding: '14px',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ marginTop: '4px', height: '10px', width: '10px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{finding.name}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: c.text }}>{finding.severity}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginBottom: '8px' }}>{finding.description}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>{finding.location}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>{finding.confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const findings = [
  { name: 'Right Lower Lobe Opacity', severity: 'high', description: 'Dense consolidation suggesting pneumonia. Recommend clinical correlation and follow-up imaging.', location: 'R.L.L', confidence: 94.2 },
  { name: 'Mild Cardiomegaly', severity: 'medium', description: 'Cardiothoracic ratio slightly elevated at 0.54. Consider echocardiography.', location: 'Cardiac', confidence: 78.5 },
  { name: 'Clear Left Lung', severity: 'low', description: 'No significant abnormalities detected in the left lung field.', location: 'L.Lung', confidence: 97.1 },
]

const steps = ['Image Pre-processing', 'Feature Extraction', 'Region Analysis', 'Classification', 'Report Synthesis']

export default function Analysis() {
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65)
  const [activeFinding, setActiveFinding] = useState(0)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setAnalysisStep(i + 1), (i + 1) * 700))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: 'calc(100vh - 92px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Brain size={22} style={{ color: '#00D4FF' }} />
            AI Diagnostic Analysis
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Study STD-2847 · James Wilson · Chest X-Ray</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '16px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  height: '8px',
                  width: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.5s ease',
                  background: i < analysisStep ? '#00D4FF' : i === analysisStep ? '#F59E0B' : 'rgba(255,255,255,0.1)',
                  boxShadow: i < analysisStep ? '0 0 6px rgba(0,212,255,0.5)' : 'none',
                }} />
                {i < steps.length - 1 && (
                  <div style={{ height: '1px', width: '16px', background: i < analysisStep ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)' }} />
                )}
              </div>
            ))}
            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
              {analysisStep >= 5 ? 'Analysis Complete' : steps[Math.min(analysisStep, 4)]}
            </span>
          </div>
          <button className="btn-secondary" style={{ fontSize: '12px', padding: '8px 12px' }}><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', minHeight: 0 }}>
        {/* Image Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.04)',
            background: '#060b12',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Corner frame */}
            {['top:12px;left:12px;border-top:2px solid rgba(0,212,255,0.25);border-left:2px solid rgba(0,212,255,0.25);border-radius:4px 0 0 0',
              'top:12px;right:12px;border-top:2px solid rgba(0,212,255,0.25);border-right:2px solid rgba(0,212,255,0.25);border-radius:0 4px 0 0',
              'bottom:12px;left:12px;border-bottom:2px solid rgba(0,212,255,0.25);border-left:2px solid rgba(0,212,255,0.25);border-radius:0 0 0 4px',
              'bottom:12px;right:12px;border-bottom:2px solid rgba(0,212,255,0.25);border-right:2px solid rgba(0,212,255,0.25);border-radius:0 0 4px 0',
            ].map((s, i) => {
              const styleObj = { position: 'absolute', height: '24px', width: '24px' }
              s.split(';').forEach(pair => {
                const [k, v] = pair.split(':')
                if (k && v) {
                  const camelKey = k.replace(/-([a-z])/g, (_, l) => l.toUpperCase())
                  styleObj[camelKey] = v
                }
              })
              return <div key={i} style={styleObj} />
            })}

            {/* Patient info */}
            <div style={{ position: 'absolute', top: '16px', left: '48px', fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.15)', lineHeight: 1.6 }}>
              <div>PT: James Wilson</div>
              <div>DOB: 1985-03-15</div>
              <div>Study: 2025-05-14</div>
            </div>
            <div style={{ position: 'absolute', top: '16px', right: '48px', textAlign: 'right', fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.15)', lineHeight: 1.6 }}>
              <div>Chest PA</div>
              <div>110kV 5mAs</div>
              <div>AI Enhanced</div>
            </div>

            {/* Canvas */}
            <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s ease' }}>
              <HeatmapCanvas showHeatmap={showHeatmap} heatmapOpacity={heatmapOpacity} />
            </div>

            {/* Crosshair */}
            {showHeatmap && (
              <motion.div
                key={activeFinding}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  top: activeFinding === 0 ? '38%' : activeFinding === 1 ? '55%' : '45%',
                  left: activeFinding === 0 ? '60%' : activeFinding === 1 ? '42%' : '35%',
                }}
              >
                <Crosshair size={24} style={{ color: 'rgba(0,212,255,0.5)' }} />
              </motion.div>
            )}

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: '16px', left: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>Activation</span>
              <div style={{ height: '8px', width: '96px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, rgba(56,189,248,0.4), rgba(245,158,11,0.6), rgba(239,68,68,0.8))', borderRadius: '999px' }} />
              </div>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>Low</span>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>High</span>
            </div>
          </div>

          {/* Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.04)',
            background: '#0e1520',
            padding: '10px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="btn-icon" onClick={() => setZoom(z => Math.min(z + 0.2, 2))}><ZoomIn size={15} /></button>
              <button className="btn-icon" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}><ZoomOut size={15} /></button>
              <button className="btn-icon" onClick={() => setZoom(1)}><RotateCcw size={15} /></button>
              <div style={{ margin: '0 8px', height: '16px', width: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <button className="btn-icon"><Maximize2 size={15} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Heatmap</span>
                <button onClick={() => setShowHeatmap(!showHeatmap)} style={{
                  position: 'relative', height: '20px', width: '36px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  background: showHeatmap ? '#00D4FF' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', height: '16px', width: '16px', borderRadius: '50%', background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
                    transform: showHeatmap ? 'translateX(16px)' : 'translateX(2px)',
                  }} />
                </button>
              </label>
              {showHeatmap && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>Opacity</span>
                  <input
                    type="range" min="0" max="1" step="0.05" value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                    style={{ width: '80px', accentColor: '#00D4FF' }}
                  />
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>{Math.round(heatmapOpacity * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Critical Summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{
            borderRadius: '14px',
            border: '1px solid rgba(244,63,94,0.12)',
            background: 'linear-gradient(135deg, rgba(244,63,94,0.04), transparent)',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertTriangle size={15} style={{ color: '#F43F5E' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#F43F5E' }}>Critical Finding</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '4px' }}>Pneumonia Detected</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Confidence: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>94.2%</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Brain size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>ResNet-50</span>
              </div>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '94.2%' }}
                transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #F43F5E, #F59E0B)' }}
              />
            </div>
          </motion.div>

          {/* Findings */}
          <div>
            <div style={{ marginBottom: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>Detected Findings ({findings.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {findings.map((f, i) => (
                <FindingCard key={i} finding={f} index={i} isActive={activeFinding === i} onClick={() => setActiveFinding(i)} />
              ))}
            </div>
          </div>

          {/* Model Info */}
          <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', background: '#0e1520', padding: '16px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Info size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)' }}>Model Details</span>
            </div>
            {[['Architecture', 'ResNet-50'], ['Technique', 'Grad-CAM'], ['Input Size', '512 × 512'], ['Inference Time', '2.4 sec'], ['Training Data', '120K images']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>{k}</span>
                <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
