import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Plus, Eye, FileText, Trash2,
  ChevronLeft, ChevronRight, FolderSearch, Filter
} from 'lucide-react'
import { recentCases } from '../data/mockData'
import './Studies.css'

const STATUS_FILTERS = ['All', 'Completed', 'Processing', 'Pending', 'Failed']

export default function Studies() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 6

  // Filter & Search
  const filtered = useMemo(() => {
    return recentCases.filter((study) => {
      const matchSearch =
        study.patientName.toLowerCase().includes(search.toLowerCase()) ||
        study.id.toLowerCase().includes(search.toLowerCase()) ||
        study.patientId.toLowerCase().includes(search.toLowerCase())

      const matchStatus =
        statusFilter === 'All' || study.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  )

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = { All: recentCases.length }
    recentCases.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1
    })
    return counts
  }, [])

  return (
    <div className="studies-page">
      {/* Header */}
      <div className="studies-page__header">
        <div className="studies-page__title-group">
          <h1 className="studies-page__title">Studies</h1>
          <p className="studies-page__subtitle">
            {recentCases.length} total studies • {statusCounts.Pending || 0} pending review
          </p>
        </div>
        <div className="studies-page__actions">
          <Link to="/upload" className="btn btn-primary btn-sm">
            <Plus size={16} /> New Study
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <Search size={16} className="filter-bar__search-icon" />
          <input
            type="text"
            className="input filter-bar__search-input"
            placeholder="Search studies, patients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div className="filter-pills">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
              onClick={() => { setStatusFilter(status); setCurrentPage(1) }}
            >
              {status}
              <span className="filter-pill__count">
                {statusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="studies-card">
        {paginated.length > 0 ? (
          <>
            <table className="studies-table">
              <thead>
                <tr>
                  <th>Study ID</th>
                  <th>Patient</th>
                  <th>Modality</th>
                  <th>Body Part</th>
                  <th>Status</th>
                  <th>Prediction</th>
                  <th>Confidence</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((study) => (
                  <tr key={study.id}>
                    <td className="study-id-cell">{study.id}</td>
                    <td>
                      <div className="study-patient">
                        <span className="study-patient__name">{study.patientName}</span>
                        <span className="study-patient__id">{study.patientId}</span>
                      </div>
                    </td>
                    <td><span className="study-modality-badge">{study.modality}</span></td>
                    <td>{study.bodyPart}</td>
                    <td>
                      <span className={`cases-table__status ${study.status.toLowerCase()}`}>
                        {study.status}
                      </span>
                    </td>
                    <td style={{ color: study.prediction ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                      {study.prediction || '—'}
                    </td>
                    <td>
                      {study.confidence ? (
                        <div className="cases-table__confidence">
                          <div className="confidence-bar">
                            <div
                              className={`confidence-bar__fill ${study.confidence >= 90 ? 'high' : study.confidence >= 70 ? 'medium' : 'low'}`}
                              style={{ width: `${study.confidence}%` }}
                            />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                            {study.confidence}%
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      {study.date}
                    </td>
                    <td>
                      <div className="study-actions">
                        <button className="study-action-btn" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="study-action-btn" title="Generate Report">
                          <FileText size={14} />
                        </button>
                        <button className="study-action-btn danger" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-footer">
              <span>
                Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
              </span>
              <div className="pagination">
                <button
                  className="pagination__btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`pagination__btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="pagination__btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="studies-empty">
            <div className="studies-empty__icon">
              <FolderSearch size={28} />
            </div>
            <h3 className="studies-empty__title">No studies found</h3>
            <p className="studies-empty__text">
              {search || statusFilter !== 'All'
                ? 'Try adjusting your filters or search terms'
                : 'Upload your first medical image to get started'}
            </p>
            <Link to="/upload" className="btn btn-primary btn-sm">
              <Plus size={16} /> Upload Study
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
