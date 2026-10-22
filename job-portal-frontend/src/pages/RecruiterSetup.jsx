
import { useState } from 'react'
import { createCompany, createRecruiterProfile } from '../services/api'

function RecruiterSetup() {
  const [form, setForm] = useState({
    company_name: '',
    description: '',
    website: '',
    location: '',
    first_name: '',
    last_name: '',
  })

  const [companyId, setCompanyId] = useState(
    sessionStorage.getItem('pendingRecruiterCompanyId') || ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      let currentCompanyId = companyId

      if (!currentCompanyId) {
        const companyData = await createCompany({
          company_name: form.company_name.trim(),
          description: form.description.trim(),
          website: form.website.trim(),
          location: form.location.trim(),
        })

        currentCompanyId =
          companyData.company?.company_id ??
          companyData.data?.company_id ??
          companyData.company_id

        if (!currentCompanyId) {
          throw new Error(
            'Company created, but its ID was not returned. Please check the API response.'
          )
        }

        setCompanyId(String(currentCompanyId))
        sessionStorage.setItem(
          'pendingRecruiterCompanyId',
          String(currentCompanyId)
        )
      }

      await createRecruiterProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company_id: Number(currentCompanyId),
      })

      sessionStorage.removeItem('pendingRecruiterCompanyId')
      setSuccess('Recruiter profile setup complete! You can now create jobs.')
    } catch (err) {
      setError(err.message || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Recruiter Setup</h2>
      <p>Create your company and recruiter profile before posting jobs.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        {!companyId && (
          <>
            <h3>Company Details</h3>

            <input
              name="company_name"
              placeholder="Company name"
              value={form.company_name}
              onChange={handleChange}
              required
            />

            <textarea
              name="description"
              placeholder="Company description"
              value={form.description}
              onChange={handleChange}
            />

            <input
              name="website"
              placeholder="Company website"
              value={form.website}
              onChange={handleChange}
            />

            <input
              name="location"
              placeholder="Company location"
              value={form.location}
              onChange={handleChange}
              required
            />
          </>
        )}

        <h3>Recruiter Details</h3>

        <input
          name="first_name"
          placeholder="First name"
          value={form.first_name}
          onChange={handleChange}
          required
        />

        <input
          name="last_name"
          placeholder="Last name"
          value={form.last_name}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : companyId
              ? 'Complete Recruiter Setup'
              : 'Create Company & Profile'}
        </button>
      </form>
    </div>
  )
}

export default RecruiterSetup
