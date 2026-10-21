
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Dashboard.css'

function RecruiterJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingJobId, setUpdatingJobId] = useState(null)
  const [success, setSuccess] = useState('')

  async function fetchJobs() {
    try {
      const token = sessionStorage.getItem('token')

      const response = await fetch(
        'http://localhost:3000/api/recruiter/jobs',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not fetch jobs')
      }

      setJobs(data.jobs || [])
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  async function handleStatusToggle(job) {
    const newStatus = job.job_status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'

    setUpdatingJobId(job.job_id)
    setError('')
    setSuccess('')

    try {
      const token = sessionStorage.getItem('token')

      const response = await fetch(
        `http://localhost:3000/api/recruiter/jobs/${job.job_id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            job_status: newStatus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not update job status')
      }

      setJobs((currentJobs) =>
        currentJobs.map((currentJob) =>
          currentJob.job_id === job.job_id
            ? { ...currentJob, job_status: data.job.job_status }
            : currentJob
        )
      )

      setSuccess(`${job.job_title} status updated to ${newStatus}.`)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setUpdatingJobId(null)
    }
  }

  if (loading) {
    return (
      <main className="dashboard-content">
        <p>Loading jobs...</p>
      </main>
    )
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <Link to="/dashboard" className="dashboard-logo">
          Job<span>Portal</span>
        </Link>

        <Link to="/dashboard" className="dashboard-action">
          Back to Dashboard
        </Link>
      </nav>

      <main className="dashboard-content">
        <h1>My Jobs</h1>
        <p>Manage your job postings and track applications.</p>

        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}

        {jobs.length === 0 ? (
          <p>You have not posted any jobs yet.</p>
        ) : (
          <div className="dashboard-grid">
            {jobs.map((job) => (
              <article className="dashboard-card" key={job.job_id}>
                <h3>{job.job_title}</h3>
                <p>{job.company_name}</p>
                <p>{job.location}</p>
                <p>Status: {job.job_status}</p>
                <p>Applications: {job.total_applications}</p>

                <p>
                  Salary: ₹{Number(job.salary_min).toLocaleString('en-IN')}
                  {' – '}
                  ₹{Number(job.salary_max).toLocaleString('en-IN')}
                </p>

                <button
                  type="button"
                  className="dashboard-action"
                  onClick={() => handleStatusToggle(job)}
                  disabled={updatingJobId === job.job_id}
                >
                  {updatingJobId === job.job_id
                    ? 'Updating...'
                    : job.job_status === 'ACTIVE'
                      ? 'Move to Draft'
                      : 'Activate Job'}
                </button>

                <Link
                  to={`/recruiter/jobs/${job.job_id}/applications`}
                  className="dashboard-action"
                >
                  View Applicants
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default RecruiterJobs

