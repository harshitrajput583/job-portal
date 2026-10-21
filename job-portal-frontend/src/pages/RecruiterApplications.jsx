
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './Dashboard.css'

function RecruiterApplications() {
  const { job_id } = useParams()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    async function fetchApplications() {
      try {
        setLoading(true)
        setError('')

        const token = sessionStorage.getItem('token')

        const response = await fetch(
          `http://localhost:3000/api/recruiter/jobs/${job_id}/applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to load applications'
          )
        }

        const rows = Array.isArray(data)
          ? data
          : data.applications || data.rows || []

        setApplications(rows)
      } catch (err) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [job_id])

  async function updateApplicationStatus(applicationId, newStatus) {
    try {
      setUpdatingId(applicationId)
      setError('')
      setMessage('')

      const token = sessionStorage.getItem('token')

      const response = await fetch(
        `http://localhost:3000/api/recruiter/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to update application status'
        )
      }

      setApplications((previousApplications) =>
        previousApplications.map((application) =>
          application.application_id === applicationId
            ? { ...application, status: newStatus }
            : application
        )
      )

      setMessage(`Application status updated to ${newStatus}.`)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <Link to="/dashboard" className="dashboard-logo">
          Job<span>Portal</span>
        </Link>

        <Link to="/recruiter/jobs" className="dashboard-action">
          Back to My Jobs
        </Link>
      </nav>

      <main className="dashboard-content">
        <h1>Job Applicants</h1>
        <p>Job ID: {job_id}</p>

        {loading && <p>Loading applicants...</p>}

        {error && (
          <p role="alert" style={{ color: 'red' }}>
            {error}
          </p>
        )}

        {message && (
          <p role="status" style={{ color: 'green' }}>
            {message}
          </p>
        )}

        {!loading && !error && applications.length === 0 && (
          <p>No applications found for this job.</p>
        )}

        {!loading && applications.length > 0 && (
          <div className="dashboard-grid">
            {applications.map((application, index) => (
              <article
                className="dashboard-card"
                key={application.application_id || index}
              >
                <h3>
                  {application.username ||
                    application.full_name ||
                    application.name ||
                    `Applicant ${index + 1}`}
                </h3>

                <p>
                  Email: {application.email || 'Not provided'}
                </p>

                <p>
                  Status: {application.status || 'Not available'}
                </p>

                <p>
                  Application ID:{' '}
                  {application.application_id || 'N/A'}
                </p>

                {application.application_id && (
                  <div>
                    <label
                      htmlFor={`status-${application.application_id}`}
                    >
                      Update Status:
                    </label>

                    <select
                      id={`status-${application.application_id}`}
                      value={application.status || 'APPLIED'}
                      disabled={
                        updatingId === application.application_id ||
                        application.status === 'HIRED' ||
                        application.status === 'REJECTED'
                      }
                      onChange={(event) =>
                        updateApplicationStatus(
                          application.application_id,
                          event.target.value
                        )
                      }
                    >
                      <option value="APPLIED">Applied</option>
                      <option value="SHORTLISTED">Shortlisted</option>
                      <option value="INTERVIEW">Interview</option>
                      <option value="HIRED">Hired</option>
                      <option value="REJECTED">Rejected</option>
                    </select>

                    {updatingId === application.application_id && (
                      <p>Updating status...</p>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default RecruiterApplications

