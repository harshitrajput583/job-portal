
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { registerUser } from '../services/api'
import '../App.css'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'JOB_SEEKER',
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setError('')
    setLoading(true)

    try {
      const result = await registerUser(formData)

      setMessage(result.message)

      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'JOB_SEEKER',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          Job<span>Portal</span>
        </Link>

        <h1>Create Account</h1>
        <p className="auth-subtitle">
          Join us and find your next opportunity.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter username"
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />

          <label htmlFor="role">I want to join as</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="JOB_SEEKER">Job Seeker</option>
            <option value="RECRUITER">Recruiter</option>
          </select>

          {message && (
            <p role="status" style={{ color: 'green' }}>
              {message}
            </p>
          )}

          {error && (
            <p role="alert" style={{ color: 'red' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

export default Register

