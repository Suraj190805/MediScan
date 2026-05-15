import { useState, useMemo } from 'react'
import {
  Search, FileText, CheckCircle, Clock, Download, Eye,
  Printer, User, Calendar, Scan, X, AlertCircle, ChevronDown
} from 'lucide-react'
import { useDiagnostics } from '../contexts/DiagnosticContext'
import { reportsList as mockReports } from '../data/reportsData'
import jsPDF from 'jspdf'
import './Reports.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_FILTERS = ['All', 'Finalized', 'Draft', 'Pending Review']

function generatePDF(report) {
  const doc = new jsPDF()
  const margin = 20
  let y = margin

  // Header
  doc.setFillColor(10, 15, 30)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(0, 212, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('MediScan AI', margin, 18)
  doc.setFontSize(10)
  doc.setTextColor(180, 180, 200)
  doc.text('AI-Assisted Diagnostic Report', margin, 26)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text(`Report ID: ${report.id}`, 210 - margin, 18, { align: 'right' })
  doc.text(`Generated: ${formatDate(report.generatedAt)}`, 210 - margin, 26, { align: 'right' })

  y = 50

  // Patient Info Box
  doc.setFillColor(240, 245, 255)
  doc.roundedRect(margin, y, 170, 28, 3, 3, 'F')
  doc.setTextColor(60, 60, 80)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PATIENT INFORMATION', margin + 6, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Name: ${report.patientName}`, margin + 6, y + 16)
  doc.text(`Patient ID: ${report.patientId}`, margin + 80, y + 16)
  doc.text(`DOB: ${report.dob || 'N/A'}`, margin + 6, y + 23)
  doc.text(`Modality: ${report.modality}`, margin + 80, y + 23)

  y += 36

  // Diagnosis Box
  const isNormal = ['Normal', 'notumor', 'not fractured', 'non-COVID'].includes(report.prediction)
  doc.setFillColor(isNormal ? 220 : 255, isNormal ? 255 : 230, isNormal ? 220 : 230)
  doc.roundedRect(margin, y, 170, 22, 3, 3, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 100)
  doc.text('AI DIAGNOSIS', margin + 6, y + 8)
  doc.setFontSize(16)
  doc.setTextColor(isNormal ? 34 : 220, isNormal ? 150 : 50, isNormal ? 80 : 50)
  doc.text(report.prediction, margin + 6, y + 18)
  doc.setFontSize(14)
  doc.setTextColor(60, 60, 80)
  const confPct = report.confidence <= 1 ? (report.confidence * 100).toFixed(1) : report.confidence.toFixed(1)
  doc.text(`${confPct}%`, 210 - margin, y + 18, { align: 'right' })

  y += 30

  // Classification Results
  if (report.topPredictions && report.topPredictions.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 100)
    doc.text('CLASSIFICATION RESULTS', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 60)
    report.topPredictions.forEach((p, i) => {
      const conf = `${(p.confidence * 100).toFixed(1)}%`
      doc.text(`${i + 1}. ${p.class}`, margin + 4, y)
      doc.text(conf, margin + 100, y)
      // Bar
      doc.setFillColor(220, 225, 240)
      doc.rect(margin + 115, y - 3, 55, 4, 'F')
      doc.setFillColor(0, 180, 220)
      doc.rect(margin + 115, y - 3, 55 * p.confidence, 4, 'F')
      y += 7
    })
    y += 4
  }

  // Region Importance
  if (report.regionImportance && report.regionImportance.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 100)
    doc.text('REGION IMPORTANCE (SHAP ANALYSIS)', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const maxImp = report.regionImportance[0]?.importance || 1
    report.regionImportance.slice(0, 5).forEach((r) => {
      const pct = (r.importance / maxImp) * 100
      doc.setTextColor(40, 40, 60)
      doc.text(r.name, margin + 4, y)
      doc.text(`${(r.importance * 100).toFixed(0)}%`, margin + 55, y)
      // Bar
      doc.setFillColor(240, 240, 245)
      doc.rect(margin + 65, y - 3, 50, 4, 'F')
      doc.setFillColor(pct > 60 ? 220 : pct > 30 ? 200 : 100, pct > 60 ? 80 : pct > 30 ? 160 : 180, pct > 60 ? 80 : pct > 30 ? 0 : 220)
      doc.rect(margin + 65, y - 3, 50 * pct / 100, 4, 'F')
      y += 7
    })
    y += 4
  }

  // AI Reasoning
  if (report.reasoning) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 100)
    doc.text('AI REASONING', margin, y)
    y += 7

    doc.setFillColor(235, 245, 255)
    doc.roundedRect(margin, y, 170, 14, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 120, 180)
    doc.text('Primary Finding:', margin + 4, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 60)
    doc.text(report.reasoning.finding || '', margin + 40, y + 5)
    y += 18

    // Evidence
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 100)
    const evidenceLines = doc.splitTextToSize(report.reasoning.evidence || '', 165)
    doc.text(evidenceLines, margin + 4, y)
    y += evidenceLines.length * 4 + 4

    // Key Features
    if (report.reasoning.key_features) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 100)
      doc.text('Key Features:', margin + 4, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      report.reasoning.key_features.forEach(f => {
        doc.text(`• ${f}`, margin + 8, y)
        y += 4
      })
      y += 4
    }

    // Confidence Note
    if (report.reasoning.confidence_note) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 120)
      doc.text(report.reasoning.confidence_note, margin + 4, y)
      y += 8
    }
  }

  // Heatmap & SHAP images — add new page if needed
  if (report.heatmapBase64 || report.shapBase64) {
    if (y > 160) {
      doc.addPage()
      y = margin
    }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 120, 180)
    doc.text('EXPLAINABILITY VISUALIZATIONS', margin, y)
    y += 8

    if (report.heatmapBase64) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 100)
      doc.text('Grad-CAM Attention Map', margin, y)
      y += 4
      try {
        doc.addImage(`data:image/png;base64,${report.heatmapBase64}`, 'PNG', margin, y, 80, 80)
      } catch (e) { /* skip if image fails */ }
      if (report.shapBase64) {
        doc.text('SHAP Region Importance Map', margin + 90, y - 4)
        try {
          doc.addImage(`data:image/png;base64,${report.shapBase64}`, 'PNG', margin + 90, y, 80, 80)
        } catch (e) { /* skip */ }
      }
      y += 86
    } else if (report.shapBase64) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 100)
      doc.text('SHAP Region Importance Map', margin, y)
      y += 4
      try {
        doc.addImage(`data:image/png;base64,${report.shapBase64}`, 'PNG', margin, y, 80, 80)
      } catch (e) { /* skip */ }
      y += 86
    }

    // Legend
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 140)
    doc.text('Red = high diagnostic significance | Blue = low significance', margin, y)
    y += 8
  }

  // Disclaimer
  doc.setFillColor(255, 248, 230)
  doc.roundedRect(margin, Math.min(y, 270), 170, 10, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(180, 140, 50)
  doc.text('⚕ AI-assisted analysis — not a substitute for professional medical diagnosis.', margin + 4, Math.min(y + 6, 276))

  doc.save(`MediScan_Report_${report.id}.pdf`)
}

export default function Reports() {
  const { reports: aiReports } = useDiagnostics()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewReport, setViewReport] = useState(null)

  // Combine AI reports with mock data
  const allReports = useMemo(() => {
    const aiFormatted = aiReports.map(r => ({
      ...r,
      diagnosis: r.prediction,
      isAI: true,
    }))
    return [...aiFormatted, ...mockReports.map(r => ({ ...r, isAI: false }))]
  }, [aiReports])

  const filtered = useMemo(() => {
    return allReports.filter((r) => {
      const name = r.patientName || ''
      const diag = r.diagnosis || r.prediction || ''
      const matchSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        diag.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'All' || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, allReports])

  const totalReports = allReports.length
  const finalized = allReports.filter(r => r.status === 'Finalized').length
  const aiCount = aiReports.length

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-page__header">
        <div>
          <h1 className="reports-page__title">Reports</h1>
          <p className="reports-page__subtitle">AI-generated diagnostic reports with SHAP explainability</p>
        </div>
      </div>

      {/* Stats */}
      <div className="reports-stats">
        <div className="reports-stat">
          <div className="reports-stat__icon accent"><FileText size={20} /></div>
          <div className="reports-stat__info">
            <span className="reports-stat__value">{totalReports}</span>
            <span className="reports-stat__label">Total Reports</span>
          </div>
        </div>
        <div className="reports-stat">
          <div className="reports-stat__icon success"><CheckCircle size={20} /></div>
          <div className="reports-stat__info">
            <span className="reports-stat__value">{finalized}</span>
            <span className="reports-stat__label">Finalized</span>
          </div>
        </div>
        <div className="reports-stat">
          <div className="reports-stat__icon" style={{ background: 'rgba(129,140,248,0.15)', color: '#818CF8' }}><Scan size={20} /></div>
          <div className="reports-stat__info">
            <span className="reports-stat__value">{aiCount}</span>
            <span className="reports-stat__label">AI Reports</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="reports-filter-bar">
        <div className="reports-filter-bar__search">
          <Search size={16} className="reports-filter-bar__search-icon" />
          <input
            type="text" className="input"
            style={{ paddingLeft: 'var(--space-10)' }}
            placeholder="Search reports..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {STATUS_FILTERS.map((s) => (
            <button key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="reports-grid">
        {filtered.map((report) => {
          const statusClass = report.status.toLowerCase().replace(' ', '-')
          const diag = report.diagnosis || report.prediction
          return (
            <div key={report.id} className={`report-card ${report.isAI ? 'report-card--ai' : ''}`}>
              <div className="report-card__header">
                <div>
                  <div className="report-card__id">
                    {report.id}
                    {report.isAI && <span style={{ marginLeft: 6, fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8, background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>AI</span>}
                  </div>
                  <div className="report-card__type">{report.type || 'AI Diagnostic'}</div>
                </div>
                <span className={`report-card__status ${statusClass}`}>
                  {report.status === 'Finalized' && <CheckCircle size={10} />}
                  {report.status === 'Draft' && <FileText size={10} />}
                  {report.status === 'Pending Review' && <Clock size={10} />}
                  {report.status}
                </span>
              </div>

              <div className="report-card__body">
                <div className="report-card__patient">{report.patientName}</div>
                <div className="report-card__meta">
                  <span className="report-card__meta-item"><User size={12} /> {report.patientId}</span>
                  <span className="report-card__meta-item"><Scan size={12} /> {report.modality}</span>
                  <span className="report-card__meta-item"><Calendar size={12} /> {formatDate(report.generatedAt)}</span>
                </div>

                <div className="report-card__diagnosis-row">
                  <div>
                    <div className="report-card__diagnosis-label">AI Diagnosis</div>
                    <div className="report-card__diagnosis-value">{diag}</div>
                  </div>
                  <div className="report-card__confidence">
                    <div className="confidence-bar" style={{ width: 40 }}>
                      <div
                        className={`confidence-bar__fill ${(report.isAI ? report.confidence * 100 : report.confidence) >= 85 ? 'high' : 'medium'}`}
                        style={{ width: `${report.isAI ? report.confidence * 100 : report.confidence}%` }}
                      />
                    </div>
                    {report.isAI ? (report.confidence * 100).toFixed(1) : report.confidence}%
                  </div>
                </div>
              </div>

              <div className="report-card__footer">
                <span className="report-card__physician">
                  {report.physician} • {formatTime(report.generatedAt)}
                </span>
                <div className="report-card__actions">
                  {report.isAI && (
                    <button className="report-card__action-btn" title="View Full Report" onClick={() => setViewReport(report)}>
                      <Eye size={14} />
                    </button>
                  )}
                  {report.isAI && (
                    <button className="report-card__action-btn" title="Download PDF" onClick={() => generatePDF(report)}>
                      <Download size={14} />
                    </button>
                  )}
                  <button className="report-card__action-btn" title="Print" onClick={() => report.isAI && generatePDF(report)}>
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full Report Modal */}
      {viewReport && (
        <div className="report-modal-overlay" onClick={() => setViewReport(null)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="report-modal__header">
              <h2>Diagnostic Report — {viewReport.id}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => generatePDF(viewReport)}>
                  <Download size={14} /> Download PDF
                </button>
                <button className="report-modal__close" onClick={() => setViewReport(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="report-modal__body">
              {/* Patient Info */}
              <div className="report-modal__section">
                <div className="report-modal__section-title">Patient Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                  <div><strong>Name:</strong> {viewReport.patientName}</div>
                  <div><strong>ID:</strong> {viewReport.patientId}</div>
                  <div><strong>DOB:</strong> {viewReport.dob || 'N/A'}</div>
                  <div><strong>Modality:</strong> {viewReport.modality}</div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="report-modal__section" style={{
                background: ['Normal', 'notumor', 'not fractured', 'non-COVID'].includes(viewReport.prediction)
                  ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: ['Normal', 'notumor', 'not fractured', 'non-COVID'].includes(viewReport.prediction)
                  ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
              }}>
                <div className="report-modal__section-title">AI Diagnosis</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: ['Normal', 'notumor', 'not fractured', 'non-COVID'].includes(viewReport.prediction) ? '#22c55e' : '#ef4444' }}>
                  {viewReport.prediction}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #aaa)', marginTop: 4 }}>
                  Confidence: {(viewReport.confidence <= 1 ? viewReport.confidence * 100 : viewReport.confidence).toFixed(1)}%
                </div>
              </div>

              {/* Classification */}
              {viewReport.topPredictions && (
                <div className="report-modal__section">
                  <div className="report-modal__section-title">Classification Results</div>
                  {viewReport.topPredictions.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.85rem' }}>
                      <span style={{ width: 20, fontWeight: 600, color: i === 0 ? '#00d4ff' : 'var(--text-tertiary)' }}>{i+1}.</span>
                      <span style={{ flex: 1 }}>{p.class}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: i === 0 ? '#00d4ff' : 'var(--text-secondary)' }}>{(p.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Heatmaps */}
              {(viewReport.heatmapBase64 || viewReport.shapBase64) && (
                <div className="report-modal__section">
                  <div className="report-modal__section-title">Explainability Visualizations</div>
                  <div style={{ display: 'grid', gridTemplateColumns: viewReport.shapBase64 ? '1fr 1fr' : '1fr', gap: 12 }}>
                    {viewReport.heatmapBase64 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Grad-CAM Attention</div>
                        <img src={`data:image/png;base64,${viewReport.heatmapBase64}`} alt="Grad-CAM" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                      </div>
                    )}
                    {viewReport.shapBase64 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>SHAP Region Map</div>
                        <img src={`data:image/png;base64,${viewReport.shapBase64}`} alt="SHAP" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {viewReport.reasoning && (
                <div className="report-modal__section">
                  <div className="report-modal__section-title">AI Reasoning</div>
                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#00d4ff', marginBottom: 4, fontWeight: 600 }}>Primary Finding</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{viewReport.reasoning.finding}</div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{viewReport.reasoning.evidence}</p>
                  {viewReport.reasoning.key_features && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>Key Features</div>
                      {viewReport.reasoning.key_features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <span style={{ color: '#00d4ff' }}>▸</span> {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <div style={{
                padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.72rem', color: '#f59e0b',
              }}>
                ⚕️ AI-assisted analysis — not a substitute for professional medical diagnosis.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
