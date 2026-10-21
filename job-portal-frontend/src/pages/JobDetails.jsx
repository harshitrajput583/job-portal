
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getJobById, applyForJob } from '../services/api'
import '../App.css'

function JobDetails() {
  const { jobId } = useParams()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [applying, setApplying] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')
  const [applyError, setApplyError] = useState('')

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true)
        setError('')
        setJob(null)

        const data = await getJobById(jobId)
        setJob(data.job || null)
      } catch (err) {
        setError(err.message || 'Failed to fetch job details')
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  async function handleApply() {
    setApplyMessage('')
    setApplyError('')

    const token = sessionStorage.getItem('token')

    if (!token) {
      setApplyError('Please log in as a job seeker to apply.')
      return
    }

    const storedUser = sessionStorage.getItem('user')

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)

        if (user.role !== 'JOB_SEEKER') {
          setApplyError('Only job seekers can apply for jobs.')
          return
        }
      } catch {
        setApplyError('Your login session is invalid. Please log in again.')
        return
      }
    }

    try {
      setApplying(true)

      const data = await applyForJob(jobId)

      setApplyMessage(
        data.message || 'Your application was submitted successfully!'
      )
    } catch (err) {
      setApplyError(err.message || 'Failed to apply for this job.')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <main className="job-details-page">
        <div className="job-details-state" role="status">
          <div className="job-loading-spinner" />
          <h2>Loading job details...</h2>
          <p>Please wait while we fetch the job information.</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="job-details-page">
        <div className="job-details-state">
          <div className="job-state-icon">!</div>
          <h2>Unable to load job</h2>
          <p role="alert">{error}</p>
          <Link to="/" className="btn-primary">
            Back to Jobs
          </Link>
        </div>
      </main>
    )
  }

  if (!job) {
    return (
      <main className="job-details-page">
        <div className="job-details-state">
          <div className="job-state-icon">?</div>
          <h2>Job not found</h2>
          <p>This job may have been removed or is no longer available.</p>
          <Link to="/" className="btn-primary">
            Browse Jobs
          </Link>
        </div>
      </main>
    )
  }

  const salary =
    job.salary_min != null && job.salary_max != null
      ? `₹${(Number(job.salary_min) / 100000).toFixed(1)}–${(
          Number(job.salary_max) / 100000
        ).toFixed(1)} LPA`
      : 'Not specified'

  const employmentType = (job.employment_type || 'Not specified')
    .replaceAll('_', ' ')

  const experience =
    job.experience_min != null || job.experience_max != null
      ? `${job.experience_min ?? 0}–${job.experience_max ?? 'Not specified'} years`
      : 'Not specified'

  const companyName = job.company_name || 'Company not specified'
  const companyInitial = companyName.charAt(0).toUpperCase()

  return (
    <div className="job-details-page">
      <header className="job-details-navbar">
        <Link className="logo" to="/">
          Job<span>Portal</span>
        </Link>

        <Link to="/" className="btn-outline">
          ← Back to Jobs
        </Link>
      </header>

      <main className="job-details-container">
        <nav className="job-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>Job Details</span>
        </nav>

        <section className="job-details-header">
          <div className="job-company-avatar">
            {companyInitial}
          </div>

          <div className="job-details-heading">
            <p className="job-details-eyebrow">
              JOB OPPORTUNITY
            </p>

            <h1>{job.job_title || 'Untitled Job'}</h1>
            <p className="job-details-company">{companyName}</p>

            <div className="job-details-tags">
              <span>⌖ {job.location || 'Location not specified'}</span>
              <span>{employmentType}</span>
            </div>
          </div>
        </section>

        <div className="job-details-layout">
          <section className="job-description-card">
            <h2>About this role</h2>

            <div className="job-description-text">
              {job.description || 'No description provided.'}
            </div>
          </section>

          <aside className="job-summary-card">
            <h2>Job Overview</h2>

            <div className="job-summary-item">
              <span className="job-summary-icon">₹</span>
              <div>
                <p>Salary Range</p>
                <strong>{salary}</strong>
              </div>
            </div>

            <div className="job-summary-item">
              <span className="job-summary-icon">⌖</span>
              <div>
                <p>Location</p>
                <strong>{job.location || 'Not specified'}</strong>
              </div>
            </div>

            <div className="job-summary-item">
              <span className="job-summary-icon">◷</span>
              <div>
                <p>Experience</p>
                <strong>{experience}</strong>
              </div>
            </div>

            <div className="job-summary-item">
              <span className="job-summary-icon">▣</span>
              <div>
                <p>Employment Type</p>
                <strong>{employmentType}</strong>
              </div>
            </div>

            <button
              type="button"
              className="job-browse-button"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? 'Applying...' : 'Apply Now'}
            </button>

            {applyMessage && (
              <p role="status" className="apply-success-message">
                {applyMessage}
              </p>
            )}

            {applyError && (
              <p role="alert" className="apply-error-message">
                {applyError}
              </p>
            )}

            <Link to="/" className="btn-outline">
              Browse More Jobs
            </Link>
          </aside>
        </div>

        <div className="job-details-bottom">
          <Link to="/" className="btn-outline">
            ← Back to All Jobs
          </Link>
        </div>
      </main>

      <footer className="footer">
        <Link className="logo" to="/">
          Job<span>Portal</span>
        </Link>
        <p>Connecting talent with opportunity.</p>
      </footer>
    </div>
  )
}

export default JobDetails
