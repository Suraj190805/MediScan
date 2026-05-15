import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload as UploadIcon, CloudUpload, FileImage, X, CheckCircle,
  AlertCircle, Info, Scan, Brain, Bone, Stethoscope
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { studiesAPI } from '../utils/api'
import { useDiagnostics } from '../contexts/DiagnosticContext'
import toast from 'react-hot-toast'
import './Upload.css'

const ACCEPTED_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tiff', '.tif'],
  'application/dicom': ['.dcm'],
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const modalities = [
  { id: 'xray', label: 'X-Ray', icon: Stethoscope, description: 'Pneumonia & TB detection', apiValue: 'X-Ray' },
  { id: 'mri', label: 'MRI', icon: Brain, description: 'Brain tumor classification', apiValue: 'MRI' },
  { id: 'fracture', label: 'Fracture', icon: Bone, description: 'Bone fracture detection', apiValue: 'Fracture' },
  { id: 'covid', label: 'CT Scan', icon: Scan, description: 'COVID-19 CT detection', apiValue: 'CT' },
]

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Upload() {
  const navigate = useNavigate()
  const { addReport } = useDiagnostics()
  const [files, setFiles] = useState([])
  const [modality, setModality] = useState('xray')
  const [patientInfo, setPatientInfo] = useState({
    patientId: '',
    patientName: '',
    dob: '',
    bodyPart: '',
    notes: '',
  })
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected
    rejectedFiles.forEach((f) => {
      const err = f.errors[0]
      if (err.code === 'file-too-large') {
        toast.error(`${f.file.name} exceeds 100MB limit`)
      } else if (err.code === 'file-invalid-type') {
        toast.error(`${f.file.name} — unsupported format`)
      }
    })

    // Add accepted files
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      status: 'ready',
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 50,
  })

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearFiles = () => setFiles([])
  const [aiResult, setAiResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [explainTab, setExplainTab] = useState('gradcam')
  const resultsRef = useRef(null)

  const AI_SERVICE_URL = 'http://localhost:8000'

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please add at least one image')
      return
    }
    if (!patientInfo.patientId || !patientInfo.patientName) {
      toast.error('Patient ID and Name are required')
      return
    }

    setUploading(true)
    setAnalyzing(true)
    setAiResult(null)

    try {
      // Map modality to AI service key
      const modalityMap = { xray: 'xray', mri: 'brain', fracture: 'fracture', covid: 'covid' }
      const aiModality = modalityMap[modality] || 'xray'

      // Call FastAPI AI service directly
      const formData = new FormData()
      formData.append('file', files[0].file)
      formData.append('modality', aiModality)
      formData.append('explain', 'true')
      formData.append('top_k', '5')

      const response = await fetch(`${AI_SERVICE_URL}/inference/predict`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'AI analysis failed')
      }

      const data = await response.json()
      setAiResult({
        prediction: data.prediction,
        confidence: data.confidence,
        topPredictions: data.top_predictions,
        heatmapBase64: data.heatmap_base64,
        shapBase64: data.shap_base64,
        regionImportance: data.region_importance,
        reasoning: data.reasoning,
        modelInfo: data.model_info,
        modelScope: data.model_scope,
        isUncertain: data.is_uncertain,
        oodWarning: data.ood_warning,
        modality: aiModality,
        patientName: patientInfo.patientName,
        patientId: patientInfo.patientId,
      })
      setExplainTab('gradcam')

      // Save report to context (shared with Reports & History pages)
      const modalityLabel = modalities.find(m => m.id === modality)?.label || modality
      addReport({
        prediction: data.prediction,
        confidence: data.confidence,
        topPredictions: data.top_predictions,
        heatmapBase64: data.heatmap_base64,
        shapBase64: data.shap_base64,
        regionImportance: data.region_importance,
        reasoning: data.reasoning,
        modelInfo: data.model_info,
        modelScope: data.model_scope,
        isUncertain: data.is_uncertain,
        oodWarning: data.ood_warning,
      }, patientInfo, modalityLabel, files[0].name)

      if (data.is_uncertain) {
        toast.error(`⚠️ Image may not match model scope — see report below`)
      }

      // Auto-scroll to results after render
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  return (
    <div className="upload-page">
      {/* Header */}
      <div className="upload-page__header">
        <h1 className="upload-page__title">Upload Study</h1>
        <p className="upload-page__subtitle">
          Upload medical images for AI-assisted diagnostic analysis
        </p>
      </div>

      <div className="upload-page__grid">
        {/* Left: Drop Zone + File List */}
        <div className="dropzone-container">
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="dropzone__icon">
              <CloudUpload size={32} />
            </div>
            <h3 className="dropzone__title">
              {isDragActive ? 'Drop images here...' : 'Drag & drop medical images'}
            </h3>
            <p className="dropzone__subtitle">
              or click to browse files • Max 100MB per file • Up to 50 images
            </p>
            <div className="dropzone__formats">
              {['.dcm', '.png', '.jpg', '.tiff'].map((fmt) => (
                <span key={fmt} className="dropzone__format-tag">{fmt}</span>
              ))}
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="file-list">
              <div className="file-list__title">
                <span>{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                <button className="btn btn-ghost btn-sm" onClick={clearFiles}>
                  Clear all
                </button>
              </div>
              {files.map((f) => (
                <div key={f.id} className="file-item">
                  <div className="file-item__icon">
                    <FileImage size={18} />
                  </div>
                  <div className="file-item__info">
                    <div className="file-item__name">{f.name}</div>
                    <div className="file-item__size">{formatFileSize(f.size)}</div>
                  </div>
                  <span className={`file-item__status ${f.status}`}>
                    {f.status === 'ready' && <><CheckCircle size={12} /> Ready</>}
                    {f.status === 'error' && <><AlertCircle size={12} /> Error</>}
                  </span>
                  <button className="file-item__remove" onClick={() => removeFile(f.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Patient Info + Modality + Submit */}
        <div className="upload-panel">
          {/* Modality */}
          <div className="upload-card">
            <div className="upload-card__title">Imaging Modality</div>
            <div className="modality-grid">
              {modalities.map((m) => (
                <div
                  key={m.id}
                  className={`modality-btn ${modality === m.id ? 'selected' : ''}`}
                  onClick={() => setModality(m.id)}
                >
                  <div className="modality-btn__icon"><m.icon size={24} /></div>
                  <span className="modality-btn__label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Information */}
          <div className="upload-card" style={{ animationDelay: '150ms' }}>
            <div className="upload-card__title">Patient Information</div>
            <div className="upload-card__form">
              <div className="input-group">
                <label className="input-label">Patient ID *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="PT-00000"
                  value={patientInfo.patientId}
                  onChange={(e) => setPatientInfo({ ...patientInfo, patientId: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Patient Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Full name"
                  value={patientInfo.patientName}
                  onChange={(e) => setPatientInfo({ ...patientInfo, patientName: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Date of Birth</label>
                <input
                  type="date"
                  className="input"
                  value={patientInfo.dob}
                  onChange={(e) => setPatientInfo({ ...patientInfo, dob: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Clinical Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Relevant symptoms, history..."
                  value={patientInfo.notes}
                  onChange={(e) => setPatientInfo({ ...patientInfo, notes: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="upload-card" style={{ animationDelay: '200ms' }}>
            <div className="upload-submit">
              <div className="upload-submit__info">
                <Info size={14} />
                Images will be processed by the AI inference engine
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: 'var(--space-4)' }}
                onClick={handleSubmit}
                disabled={uploading || files.length === 0}
              >
                {uploading ? (
                  <><span className="animate-spin" style={{ display: 'inline-flex' }}>⟳</span> {analyzing ? 'Analyzing with AI...' : 'Uploading...'}</>
                ) : (
                  <><UploadIcon size={16} /> Upload & Analyze ({files.length} file{files.length !== 1 ? 's' : ''})</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Results Panel — Full Width Below Upload ─────────── */}
      {aiResult && (
        <div ref={resultsRef} className="ai-results-section" style={{ animation: 'fadeInUp 0.5s ease' }}>
          {/* Results Header */}
          <div className="ai-results__header">
            <div className="ai-results__badge" style={{
              background: (aiResult.prediction === 'Normal' || aiResult.prediction === 'notumor' || aiResult.prediction === 'not fractured' || aiResult.prediction === 'non-COVID')
                ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              border: (aiResult.prediction === 'Normal' || aiResult.prediction === 'notumor' || aiResult.prediction === 'not fractured' || aiResult.prediction === 'non-COVID')
                ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
              borderRadius: 16, padding: '20px 28px', flex: 1,
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary, #888)', marginBottom: 6 }}>AI Diagnosis</div>
              <div style={{
                fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display, Inter)',
                color: (aiResult.prediction === 'Normal' || aiResult.prediction === 'notumor' || aiResult.prediction === 'not fractured' || aiResult.prediction === 'non-COVID')
                  ? '#22c55e' : '#ef4444',
              }}>{aiResult.prediction}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #aaa)', marginTop: 4 }}>
                Patient: {aiResult.patientName} ({aiResult.patientId}) • {aiResult.modelInfo?.architecture}
              </div>
            </div>

            {/* Confidence Gauge */}
            <div style={{
              background: 'var(--color-bg-secondary, #1a1a2e)', border: '1px solid var(--color-border, #333)',
              borderRadius: 16, padding: '20px 28px', minWidth: 200, textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary, #888)', marginBottom: 8 }}>Confidence</div>
              <div style={{
                fontSize: '2.2rem', fontWeight: 800, fontFamily: 'monospace',
                background: aiResult.confidence > 0.9 ? 'linear-gradient(135deg, #00d4ff, #00ff88)' : 'linear-gradient(135deg, #ffaa00, #ff5544)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{(aiResult.confidence * 100).toFixed(1)}%</div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, width: `${aiResult.confidence * 100}%`,
                  background: aiResult.confidence > 0.9 ? 'linear-gradient(90deg, #00d4ff, #00ff88)' : 'linear-gradient(90deg, #ffaa00, #ff5544)',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          </div>

          {/* OOD Warning */}
          {aiResult.isUncertain && aiResult.oodWarning && (
            <div style={{
              padding: '14px 18px', borderRadius: 12, marginTop: 'var(--space-4, 16px)',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', fontSize: '0.85rem', lineHeight: 1.5,
            }}>
              <strong>⚠️ Out-of-Scope Warning:</strong> {aiResult.oodWarning}
            </div>
          )}

          {/* Model Scope */}
          {aiResult.modelScope && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginTop: 'var(--space-3, 12px)',
              background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
              fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)',
            }}>
              📋 <strong>Trained on:</strong> {aiResult.modelScope.trained_on} • <strong>Detects:</strong> {aiResult.modelScope.supported_conditions?.join(', ')}
            </div>
          )}

          {/* Main Content: 3-Column Layout */}
          <div className="ai-results__grid">
            {/* Column 1: Classification Results */}
            <div className="ai-results__card">
              <h4 className="ai-results__card-title">📊 Classification Results</h4>
              {aiResult.topPredictions?.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, marginBottom: 6,
                  background: i === 0 ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: i === 0 ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: i === 0 ? '#00d4ff' : 'var(--text-secondary, #888)',
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary, #eee)' }}>{p.class}</span>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, width: `${p.confidence * 100}%`,
                        background: i === 0 ? '#00d4ff' : 'rgba(255,255,255,0.2)',
                      }} />
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', minWidth: 48, textAlign: 'right',
                    color: i === 0 ? '#00d4ff' : 'var(--text-secondary, #888)',
                  }}>{(p.confidence * 100).toFixed(1)}%</span>
                </div>
              ))}

              {/* Region Importance */}
              {aiResult.regionImportance && aiResult.regionImportance.length > 0 && (
                <div style={{ marginTop: 'var(--space-4, 16px)' }}>
                  <h4 className="ai-results__card-title" style={{ marginTop: 0 }}>🗺️ Region Importance (SHAP)</h4>
                  {aiResult.regionImportance.slice(0, 5).map((r, i) => {
                    const maxImp = aiResult.regionImportance[0]?.importance || 1
                    const pct = (r.importance / maxImp) * 100
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: '0.8rem' }}>
                        <span style={{ minWidth: 120, color: i < 2 ? '#ff6b6b' : 'var(--text-secondary, #888)', fontWeight: i < 2 ? 600 : 400 }}>
                          {r.name}
                        </span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3, width: `${pct}%`,
                            background: pct > 60 ? 'linear-gradient(90deg, #ff6b6b, #ff4444)' : pct > 30 ? 'linear-gradient(90deg, #ffaa00, #ff8800)' : 'rgba(0,212,255,0.4)',
                            transition: 'width 0.8s ease',
                          }} />
                        </div>
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-tertiary, #666)', minWidth: 36 }}>
                          {(r.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Column 2: Explainability Visualizations */}
            <div className="ai-results__card">
              <h4 className="ai-results__card-title">🔍 Explainability (XAI)</h4>
              {/* Tabs for Grad-CAM and SHAP */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-3, 12px)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border, #333)' }}>
                <button
                  onClick={() => setExplainTab && setExplainTab('gradcam')}
                  className="ai-results__tab"
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    background: (!explainTab || explainTab === 'gradcam') ? 'rgba(0,212,255,0.15)' : 'var(--color-bg-tertiary, #222)',
                    color: (!explainTab || explainTab === 'gradcam') ? '#00d4ff' : 'var(--text-secondary, #888)',
                  }}
                >Grad-CAM</button>
                <button
                  onClick={() => setExplainTab && setExplainTab('shap')}
                  className="ai-results__tab"
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    borderLeft: '1px solid var(--color-border, #333)',
                    background: explainTab === 'shap' ? 'rgba(0,212,255,0.15)' : 'var(--color-bg-tertiary, #222)',
                    color: explainTab === 'shap' ? '#00d4ff' : 'var(--text-secondary, #888)',
                  }}
                >SHAP Regions</button>
              </div>

              {/* Grad-CAM View */}
              {(!explainTab || explainTab === 'gradcam') && aiResult.heatmapBase64 && (
                <div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={`data:image/png;base64,${aiResult.heatmapBase64}`} alt="Grad-CAM" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary, #666)', marginTop: 6, textAlign: 'center' }}>
                    🔴 Red = high diagnostic significance • 🔵 Blue = low significance
                  </p>
                </div>
              )}

              {/* SHAP View */}
              {explainTab === 'shap' && aiResult.shapBase64 && (
                <div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={`data:image/png;base64,${aiResult.shapBase64}`} alt="SHAP Regions" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary, #666)', marginTop: 6, textAlign: 'center' }}>
                    🔴 Red regions = high impact on prediction • 🔵 Blue = low impact
                  </p>
                </div>
              )}

              {!aiResult.heatmapBase64 && !aiResult.shapBase64 && (
                <p style={{ color: 'var(--text-tertiary, #666)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-6, 24px)' }}>
                  Explainability visualizations not available
                </p>
              )}
            </div>

            {/* Column 3: Clinical Reasoning */}
            <div className="ai-results__card">
              <h4 className="ai-results__card-title">🧠 AI Reasoning</h4>
              {aiResult.reasoning ? (
                <>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10, marginBottom: 'var(--space-3, 12px)',
                    background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)',
                  }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#00d4ff', marginBottom: 6, fontWeight: 600 }}>
                      Primary Finding
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary, #eee)', fontWeight: 600, lineHeight: 1.4 }}>
                      {aiResult.reasoning.finding}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #aaa)', lineHeight: 1.6, marginBottom: 'var(--space-3, 12px)' }}>
                    {aiResult.reasoning.evidence}
                  </div>

                  <div style={{ marginBottom: 'var(--space-3, 12px)' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary, #666)', marginBottom: 8, fontWeight: 600 }}>
                      Key Features Detected
                    </div>
                    {aiResult.reasoning.key_features?.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                        fontSize: '0.82rem', color: 'var(--text-secondary, #aaa)',
                      }}>
                        <span style={{ color: '#00d4ff', fontSize: '0.7rem' }}>▸</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Top Contributing Regions */}
                  {aiResult.reasoning.top_regions && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, marginBottom: 'var(--space-3, 12px)',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary, #666)', marginBottom: 6 }}>
                        Top Contributing Regions
                      </div>
                      {aiResult.reasoning.top_regions.map((r, i) => (
                        <span key={i} style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 12, marginRight: 6, marginBottom: 4,
                          fontSize: '0.75rem', fontWeight: 600,
                          background: i === 0 ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.05)',
                          color: i === 0 ? '#ff6b6b' : 'var(--text-secondary, #888)',
                          border: i === 0 ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}>{r.name}</span>
                      ))}
                    </div>
                  )}

                  <div style={{
                    fontSize: '0.78rem', color: 'var(--text-secondary, #aaa)', fontStyle: 'italic',
                    marginBottom: 'var(--space-2, 8px)',
                  }}>
                    {aiResult.reasoning.confidence_note}
                  </div>

                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                    fontSize: '0.72rem', color: '#f59e0b',
                  }}>
                    ⚕️ {aiResult.reasoning.disclaimer}
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-tertiary, #666)', fontSize: '0.85rem' }}>
                  Enable explainability for AI reasoning analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
