
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJob } from '../services/api'

function AddJob() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    job_title: '',
    description: '',
    location: '',
    salary_min: '',
    salary_max: '',
    experience_min: '',
    experience_max: '',
    employment_type: 'FULL_TIME',
    job_status: 'DRAFT',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const result = await createJob({
        ...formData,
        salary_min: Number(formData.salary_min),
        salary_max: Number(formData.salary_max),
        experience_min: Number(formData.experience_min),
        experience_max: Number(formData.experience_max),
      })

      setSuccess(`Job created successfully! Job ID: ${result.job.job_id}`)

      setTimeout(() => {
        navigate('/recruiter/jobs')
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px' }}>
      <h1>Add New Job</h1>
      <p>Enter the details to create a job posting.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Job Title</label>
          <input
            name="job_title"
            value={formData.job_title}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
          />
        </div>

        <div>
          <label>Location</label>
          <input
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Minimum Salary (₹ per year)</label>
          <input
            type="number"
            name="salary_min"
            value={formData.salary_min}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div>
          <label>Maximum Salary (₹ per year)</label>
          <input
            type="number"
            name="salary_max"
            value={formData.salary_max}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div>
          <label>Minimum Experience (years)</label>
          <input
            type="number"
            name="experience_min"
            value={formData.experience_min}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div>
          <label>Maximum Experience (years)</label>
          <input
            type="number"
            name="experience_max"
            value={formData.experience_max}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div>
          <label>Employment Type</label>
          <select
            name="employment_type"
            value={formData.employment_type}
            onChange={handleChange}
            required
          >
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
        </div>

        <div>
          <label>Job Status</label>
          <select
            name="job_status"
            value={formData.job_status}
            onChange={handleChange}
            required
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Job...' : 'Create Job'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate('/recruiter/jobs')}
        style={{ marginTop: '12px' }}
      >
        Cancel
      </button>
    </div>
  )
}

export default AddJob
