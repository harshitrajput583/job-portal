
import '../App.css'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getJobs } from '../services/api'

function Home() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [locationTerm, setLocationTerm] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const jobsPerPage = 5

  const filteredJobs = jobs.filter((job) => {
    const search = searchTerm.toLowerCase().trim()
    const location = locationTerm.toLowerCase().trim()

    const matchesSearch =
      (job.job_title || '').toLowerCase().includes(search) ||
      (job.company_name || '').toLowerCase().includes(search)

    const matchesLocation =
      (job.location || '').toLowerCase().includes(location)

    const matchesEmploymentType =
      !employmentType || job.employment_type === employmentType

    return (
      matchesSearch &&
      matchesLocation &&
      matchesEmploymentType
    )
  })

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'salary_high') {
      return Number(b.salary_max || 0) - Number(a.salary_max || 0)
    }

    if (sortBy === 'salary_low') {
      return Number(a.salary_min || 0) - Number(b.salary_min || 0)
    }

    if (sortBy === 'newest') {
      return (
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
      )
    }

    return 0
  })

  const totalPages = Math.ceil(sortedJobs.length / jobsPerPage)
  const startIndex = (currentPage - 1) * jobsPerPage
  const paginatedJobs = sortedJobs.slice(
    startIndex,
    startIndex + jobsPerPage
  )

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await getJobs()
        setJobs(data.jobs || [])
      } catch (err) {
        setError(err.message || 'Failed to fetch jobs')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, locationTerm, employmentType, sortBy])

  return (
    <div className="app">
      <nav className="navbar">
        <Link className="logo" to="/">
          Job<span>Portal</span>
        </Link>

        <div className="nav-links">
          <a href="#jobs">Find Jobs</a>
          <a href="#companies">Companies</a>
          <a href="#about">About Us</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="btn-login">
            Login
          </Link>

          <Link to="/register" className="btn-primary">
            Register
          </Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">
              YOUR NEXT OPPORTUNITY STARTS HERE
            </p>

            <h1>
              Find a job that
              <br />
              <span>fits your future.</span>
            </h1>

            <p className="hero-description">
              Discover opportunities, connect with companies, and take
              the next step in your career.
            </p>

            <form
              className="search-bar"
              onSubmit={(event) => {
                event.preventDefault()
                document.getElementById('jobs')?.scrollIntoView({
                  behavior: 'smooth',
                })
              }}
            >
              <input
                type="text"
                aria-label="Job title"
                placeholder="Job title or keyword"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <input
                type="text"
                aria-label="Location"
                placeholder="City or remote"
                value={locationTerm}
                onChange={(event) => setLocationTerm(event.target.value)}
              />

              <button className="btn-primary" type="submit">
                Search Jobs
              </button>
            </form>

            <p className="popular">
              Popular: <span>Node.js</span> <span>React</span>{' '}
              <span>Backend</span>
            </p>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="visual-card">
              <div className="visual-card-top">
                <div className="visual-icon">J</div>
                <div>
                  <strong>Your next role</strong>
                  <p>is closer than you think.</p>
                </div>
              </div>

              <div className="visual-line line-wide" />
              <div className="visual-line line-short" />

              <div className="visual-stats">
                <div>
                  <strong>Explore</strong>
                  <span>New roles</span>
                </div>

                <div>
                  <strong>Connect</strong>
                  <span>With teams</span>
                </div>
              </div>

              <div className="visual-check">✓</div>
            </div>

            <div className="floating-tag">✦ Career growth</div>
          </div>
        </section>

        <section className="jobs-section" id="jobs">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HANDPICKED FOR YOU</p>
              <h2>Featured opportunities</h2>
              <p>Explore roles to take your career forward.</p>
            </div>

            <a href="#jobs" className="view-all">
              View all jobs →
            </a>
          </div>

          <div className="job-filters">
            <label htmlFor="employmentType">
              Employment Type:
            </label>

            <select
              id="employmentType"
              value={employmentType}
              onChange={(event) => setEmploymentType(event.target.value)}
            >
              <option value="">All Employment Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </select>

            <label htmlFor="sortBy">Sort by:</label>

            <select
              id="sortBy"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="salary_high">Highest Salary</option>
              <option value="salary_low">Lowest Salary</option>
            </select>
          </div>

          {loading && <p>Loading jobs...</p>}

          {!loading && error && (
            <p role="alert" style={{ color: 'red' }}>
              {error}
            </p>
          )}

          {!loading && !error && jobs.length === 0 && (
            <p>No active jobs available right now.</p>
          )}

          {!loading && !error && jobs.length > 0 && (
            <>
              {sortedJobs.length === 0 ? (
                <p>
                  No jobs match your search or filters. Try different
                  keywords, location, or employment type.
                </p>
              ) : (
                <>
                  <div className="job-grid">
                    {paginatedJobs.map((job) => (
                      <article className="job-card" key={job.job_id}>
                        <div className="job-card-top">
                          <div className="company-icon">
                            {(job.company_name || 'C').charAt(0)}
                          </div>

                          <span className="job-type">
                            {(job.employment_type || 'Not specified')
                              .replaceAll('_', ' ')}
                          </span>
                        </div>

                        <h3>{job.job_title}</h3>

                        <p className="company-name">
                          {job.company_name}
                        </p>

                        <p className="job-location">
                          ⌖ {job.location || 'Location not specified'}
                        </p>

                        <div className="job-card-footer">
                          <strong>
                            {job.salary_min != null &&
                            job.salary_max != null
                              ? `₹${(
                                  Number(job.salary_min) / 100000
                                ).toFixed(1)}–${(
                                  Number(job.salary_max) / 100000
                                ).toFixed(1)} LPA`
                              : 'Salary not specified'}
                          </strong>

                          <Link
                            to={`/jobs/${job.job_id}`}
                            className="btn-outline"
                          >
                            View job
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="pagination">
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((page) => page - 1)
                      }}
                    >
                      Previous
                    </button>

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="btn-outline"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((page) => page + 1)
                      }}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
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

export default Home





