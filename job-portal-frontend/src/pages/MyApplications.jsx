
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getMyApplications,
  getApplicationHistory,
} from '../services/api'
import './Dashboard.css'

function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [historyData, setHistoryData] = useState({})
  const [historyLoading, setHistoryLoading] = useState({})
  const [historyErrors, setHistoryErrors] = useState({})

  useEffect(() => {
    async function fetchApplications() {
      try {
        setLoading(true)
        setError('')

        const data = await getMyApplications()

        setApplications(
          Array.isArray(data)
            ? data
            : Array.isArray(data.applications)
              ? data.applications
              : []
        )
      } catch (err) {
        setError(err.message || 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  function getStatusClass(status) {
    return (status || 'APPLIED').toLowerCase().replaceAll('_', '-')
  }

  function formatStatus(status) {
    return (status || '').replaceAll('_', ' ')
  }

  function formatDateTime(dateTime) {
    if (!dateTime) return 'Not available'

    const date = new Date(dateTime)

    if (Number.isNaN(date.getTime())) {
      return 'Not available'
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  async function handleViewHistory(applicationId) {
    if (historyData[applicationId]) {
      setHistoryData((previous) => {
        const updated = { ...previous }
        delete updated[applicationId]
        return updated
      })
      return
    }

    try {
      setHistoryLoading((previous) => ({
        ...previous,
        [applicationId]: true,
      }))

      setHistoryErrors((previous) => ({
        ...previous,
        [applicationId]: '',
      }))

      const data = await getApplicationHistory(applicationId)

      setHistoryData((previous) => ({
        ...previous,
        [applicationId]: Array.isArray(data.history)
          ? data.history
          : [],
      }))
    } catch (err) {
      setHistoryErrors((previous) => ({
        ...previous,
        [applicationId]:
          err.message || 'Failed to load application history',
      }))
    } finally {
      setHistoryLoading((previous) => ({
        ...previous,
        [applicationId]: false,
      }))
    }
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <Link to="/" className="dashboard-logo">
          Job<span>Portal</span>
        </Link>

        <Link to="/dashboard" className="dashboard-action">
          Back to Dashboard
        </Link>
      </nav>

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <h1>My Applications</h1>
          <p>Track the jobs you have applied for.</p>
        </section>

        {loading && (
          <p role="status">Loading your applications...</p>
        )}

        {error && (
          <p role="alert" className="apply-error-message">
            {error}
          </p>
        )}

        {!loading && !error && applications.length === 0 && (
          <section className="dashboard-card">
            <h3>No applications yet</h3>
            <p>Explore jobs and submit your first application.</p>
            <Link to="/" className="dashboard-action">
              Explore Jobs
            </Link>
          </section>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="dashboard-grid">
            {applications.map((application) => {
              const applicationId = application.application_id
              const history = historyData[applicationId]

              return (
                <article
                  className="dashboard-card"
                  key={applicationId}
                >
                  <h3>
                    {application.job_title ||
                      `Job #${application.job_id}`}
                  </h3>

                  <p>
                    <strong>Company:</strong>{' '}
                    {application.company_name || 'Not specified'}
                  </p>

                  <p>
                    <strong>Location:</strong>{' '}
                    {application.location || 'Not specified'}
                  </p>

                  <p>
                    <strong>Applied on:</strong>{' '}
                    {application.applied_at
                      ? new Date(
                          application.applied_at
                        ).toLocaleDateString('en-IN')
                      : 'Not available'}
                  </p>

                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`application-status ${getStatusClass(
                        application.status
                      )}`}
                    >
                      {formatStatus(application.status || 'APPLIED')}
                    </span>
                  </p>

                  <div>
                    <Link
                      to={`/jobs/${application.job_id}`}
                      className="dashboard-action"
                    >
                      View Job
                    </Link>{' '}

                    <button
                      type="button"
                      className="dashboard-action"
                      onClick={() =>
                        handleViewHistory(applicationId)
                      }
                      disabled={Boolean(historyLoading[applicationId])}
                    >
                      {historyLoading[applicationId]
                        ? 'Loading History...'
                        : history
                          ? 'Hide History'
                          : 'View History'}
                    </button>
                  </div>

                  {historyErrors[applicationId] && (
                    <p role="alert" className="apply-error-message">
                      {historyErrors[applicationId]}
                    </p>
                  )}

                  {history && (
                    <section className="application-history">
                      <h4>Application Status History</h4>

                      {history.length === 0 ? (
                        <p>No status history is available yet.</p>
                      ) : (
                        <ol>
                          {history.map((item) => (
                            <li key={item.history_id}>
                              <strong>
                                {formatStatus(item.new_status)}
                              </strong>

                              <p>
                                Previous status:{' '}
                                {item.old_status
                                  ? formatStatus(item.old_status)
                                  : 'Initial status'}
                              </p>

                              <small>
                                Changed by user ID:{' '}
                                {item.changed_by ?? 'Not available'}
                              </small>

                              <p>
                                <strong>Changed at:</strong>{' '}
                                {formatDateTime(item.changed_at)}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyApplications

