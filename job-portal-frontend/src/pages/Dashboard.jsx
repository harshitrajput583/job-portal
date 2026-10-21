
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

  let user = null

  try {
    user = JSON.parse(sessionStorage.getItem('user') || 'null')
  } catch {
    user = null
  }

  const isRecruiter = user?.role === 'RECRUITER'

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <Link to="/" className="dashboard-logo">
          Job<span>Portal</span>
        </Link>

        <button
          className="dashboard-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </nav>

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <h1>
            Welcome, {user?.username || 'User'}!
          </h1>

          <p>
            {isRecruiter
              ? 'Manage your jobs and review applications.'
              : 'Your next career opportunity starts here.'}
          </p>

          <p>Role: {user?.role || 'Not available'}</p>
        </section>

        <h2 className="dashboard-section-title">
          {isRecruiter ? 'Recruiter Dashboard' : 'Your Dashboard'}
        </h2>

        <div className="dashboard-grid">
          {isRecruiter ? (
            <>
              <article className="dashboard-card">
                <h3>Add New Job</h3>
                <p>
                  Create a new job posting for your company.
                </p>
                <Link
                  to="/recruiter/jobs/new"
                  className="dashboard-action"
                >
                  + Add New Job
                </Link>
              </article>

              <article className="dashboard-card">
                <h3>My Jobs</h3>
                <p>
                  View your posted jobs and track applications.
                </p>
                <Link
                  to="/recruiter/jobs"
                  className="dashboard-action"
                >
                  Manage Jobs
                </Link>
              </article>

              <article className="dashboard-card">
                <h3>Company Profile</h3>
                <p>
                  Review your recruiter and company information.
                </p>
                <Link
                  to="/my-profile"
                  className="dashboard-action"
                >
                  View Profile
                </Link>
              </article>
            </>
          ) : (
            <>
              <article className="dashboard-card">
                <h3>Find Jobs</h3>
                <p>
                  Discover opportunities that match your skills.
                </p>
                <Link
                  to="/#jobs"
                  className="dashboard-action"
                >
                  Explore Jobs
                </Link>
              </article>

              <article className="dashboard-card">
                <h3>My Profile</h3>
                <p>
                  Manage your professional information and skills.
                </p>
                <Link
                  to="/my-profile"
                  className="dashboard-action"
                >
                  Edit Profile
                </Link>
              </article>

              <article className="dashboard-card">
                <h3>My Applications</h3>
                <p>
                  Keep track of the jobs you have applied for.
                </p>
                <Link
                  to="/my-applications"
                  className="dashboard-action"
                >
                  View Applications
                </Link>
              </article>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard




