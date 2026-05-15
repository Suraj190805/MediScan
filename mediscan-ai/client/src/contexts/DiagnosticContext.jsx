import { createContext, useContext, useState, useEffect } from 'react'

const DiagnosticContext = createContext()

const STORAGE_KEY = 'mediscan_diagnostics'

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch (e) {
    console.warn('Failed to load diagnostics from storage:', e)
  }
  return { reports: [], history: [] }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save diagnostics:', e)
  }
}

export function DiagnosticProvider({ children }) {
  const [reports, setReports] = useState(() => loadFromStorage().reports)
  const [history, setHistory] = useState(() => loadFromStorage().history)

  // Persist on change
  useEffect(() => {
    saveToStorage({ reports, history })
  }, [reports, history])

  const addReport = (aiResult, patientInfo, modality, fileName) => {
    const now = new Date().toISOString()
    const reportId = `RPT-${Date.now().toString().slice(-6)}`
    const studyId = `STD-${Date.now().toString().slice(-5)}`

    // Build report object
    const report = {
      id: reportId,
      studyId,
      patientName: patientInfo.patientName,
      patientId: patientInfo.patientId,
      dob: patientInfo.dob,
      notes: patientInfo.notes,
      modality,
      fileName,
      prediction: aiResult.prediction,
      confidence: aiResult.confidence,
      topPredictions: aiResult.topPredictions,
      heatmapBase64: aiResult.heatmapBase64,
      shapBase64: aiResult.shapBase64,
      regionImportance: aiResult.regionImportance,
      reasoning: aiResult.reasoning,
      modelInfo: aiResult.modelInfo,
      modelScope: aiResult.modelScope,
      isUncertain: aiResult.isUncertain,
      oodWarning: aiResult.oodWarning,
      status: 'Finalized',
      generatedAt: now,
      physician: 'AI Engine',
      type: 'AI-Assisted Diagnostic',
    }

    setReports(prev => [report, ...prev])

    // Add history events
    const historyEvents = [
      {
        id: `ACT-${Date.now()}a`,
        type: 'upload',
        title: 'Study Uploaded',
        description: `${modality} image "${fileName}" uploaded for patient ${patientInfo.patientName} (${patientInfo.patientId})`,
        studyId,
        user: 'Clinician',
        timestamp: now,
        icon: 'upload',
      },
      {
        id: `ACT-${Date.now()}b`,
        type: 'prediction',
        title: 'AI Prediction Complete',
        description: `${aiResult.prediction} detected with ${(aiResult.confidence * 100).toFixed(1)}% confidence — ${studyId}`,
        studyId,
        user: 'AI Engine',
        timestamp: new Date(Date.now() + 2000).toISOString(),
        icon: 'brain',
      },
      {
        id: `ACT-${Date.now()}c`,
        type: 'report',
        title: 'Report Generated',
        description: `Diagnostic report ${reportId} generated for ${studyId}`,
        studyId,
        user: 'AI Engine',
        timestamp: new Date(Date.now() + 5000).toISOString(),
        icon: 'file',
      },
    ]

    setHistory(prev => [...historyEvents, ...prev])

    return report
  }

  const clearAll = () => {
    setReports([])
    setHistory([])
  }

  return (
    <DiagnosticContext.Provider value={{ reports, history, addReport, clearAll }}>
      {children}
    </DiagnosticContext.Provider>
  )
}

export function useDiagnostics() {
  const ctx = useContext(DiagnosticContext)
  if (!ctx) throw new Error('useDiagnostics must be used within DiagnosticProvider')
  return ctx
}
