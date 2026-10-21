
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getMyProfile,
  updateMyProfile,
  getMySkills,
  addSkill,
  updateSkill,
  removeSkill,
} from '../services/api'
import './Dashboard.css'

function MyProfile() {
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    address: '',
    graduation: '',
    bio: '',
    experience_years: 0,
    resume_url: '',
    linkedin_url: '',
    github_url: '',
  })

  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [editingSkillId, setEditingSkillId] = useState(null)
  const [editingSkillName, setEditingSkillName] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillActionLoading, setSkillActionLoading] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [skillError, setSkillError] = useState('')
  const [skillMessage, setSkillMessage] = useState('')

  async function fetchSkills() {
    try {
      setSkillsLoading(true)
      setSkillError('')

      const data = await getMySkills()
      setSkills(data.skills || [])
    } catch (err) {
      setSkillError(err.message || 'Failed to load skills')
    } finally {
      setSkillsLoading(false)
    }
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getMyProfile()

        setProfile((previous) => ({
          ...previous,
          ...data.profile,
        }))
      } catch (err) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
    fetchSkills()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!profile.first_name.trim()) {
      setError('First name is required')
      return
    }

    try {
      setSaving(true)

      const data = await updateMyProfile({
        ...profile,
        experience_years: Number(profile.experience_years) || 0,
      })

      setProfile((previous) => ({
        ...previous,
        ...data.profile,
      }))

      setMessage('Profile updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSkill(event) {
    event.preventDefault()

    const skillName = newSkill.trim()

    if (!skillName) {
      setSkillError('Please enter a skill name')
      return
    }

    try {
      setSkillActionLoading(true)
      setSkillError('')
      setSkillMessage('')

      await addSkill(skillName)

      setNewSkill('')
      await fetchSkills()
      setSkillMessage('Skill added successfully!')
    } catch (err) {
      setSkillError(err.message || 'Failed to add skill')
    } finally {
      setSkillActionLoading(false)
    }
  }

  function startEditing(skill) {
    setEditingSkillId(skill.skill_id)
    setEditingSkillName(skill.skill_name)
    setSkillError('')
    setSkillMessage('')
  }

  function cancelEditing() {
    setEditingSkillId(null)
    setEditingSkillName('')
  }

  async function handleUpdateSkill(event) {
    event.preventDefault()

    const skillName = editingSkillName.trim()

    if (!skillName) {
      setSkillError('Skill name cannot be empty')
      return
    }

    try {
      setSkillActionLoading(true)
      setSkillError('')
      setSkillMessage('')

      await updateSkill(editingSkillId, skillName)

      cancelEditing()
      await fetchSkills()
      setSkillMessage('Skill updated successfully!')
    } catch (err) {
      setSkillError(err.message || 'Failed to update skill')
    } finally {
      setSkillActionLoading(false)
    }
  }

  async function handleRemoveSkill(skillId) {
    const confirmed = window.confirm(
      'Are you sure you want to remove this skill?'
    )

    if (!confirmed) return

    try {
      setSkillActionLoading(true)
      setSkillError('')
      setSkillMessage('')

      await removeSkill(skillId)

      setSkills((previous) =>
        previous.filter((skill) => skill.skill_id !== skillId)
      )

      setSkillMessage('Skill removed successfully!')
    } catch (err) {
      setSkillError(err.message || 'Failed to remove skill')
    } finally {
      setSkillActionLoading(false)
    }
  }

  if (loading) {
    return <main className="dashboard-content">Loading profile...</main>
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
          <h1>My Profile</h1>
          <p>Manage your professional information and skills.</p>
        </section>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        <form onSubmit={handleSubmit} className="dashboard-card">
          <h2>Personal Information</h2>

          <label>
            First Name *
            <input
              name="first_name"
              value={profile.first_name || ''}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Last Name
            <input
              name="last_name"
              value={profile.last_name || ''}
              onChange={handleChange}
            />
          </label>

          <label>
            Address
            <input
              name="address"
              value={profile.address || ''}
              onChange={handleChange}
            />
          </label>

          <label>
            Graduation
            <input
              name="graduation"
              value={profile.graduation || ''}
              onChange={handleChange}
              placeholder="e.g. B.Tech CSE"
            />
          </label>

          <label>
            Experience (years)
            <input
              type="number"
              name="experience_years"
              min="0"
              value={profile.experience_years ?? 0}
              onChange={handleChange}
            />
          </label>

          <label>
            Bio
            <textarea
              name="bio"
              value={profile.bio || ''}
              onChange={handleChange}
              rows="4"
            />
          </label>

          <label>
            Resume URL
            <input
              type="url"
              name="resume_url"
              value={profile.resume_url || ''}
              onChange={handleChange}
              placeholder="https://..."
            />
          </label>

          <label>
            LinkedIn URL
            <input
              type="url"
              name="linkedin_url"
              value={profile.linkedin_url || ''}
              onChange={handleChange}
              placeholder="https://..."
            />
          </label>

          <label>
            GitHub URL
            <input
              type="url"
              name="github_url"
              value={profile.github_url || ''}
              onChange={handleChange}
              placeholder="https://..."
            />
          </label>

          <button
            type="submit"
            className="dashboard-action"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <section
          className="dashboard-card"
          style={{ marginTop: '24px' }}
        >
          <h2>My Skills</h2>
          <p>Add the technologies and skills you know.</p>

          {skillError && <p role="alert">{skillError}</p>}
          {skillMessage && <p role="status">{skillMessage}</p>}

          <form onSubmit={handleAddSkill}>
            <label>
              Add a Skill
              <input
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                placeholder="e.g. Node.js, PostgreSQL, C++"
              />
            </label>

            <button
              type="submit"
              className="dashboard-action"
              disabled={skillActionLoading}
            >
              {skillActionLoading ? 'Please wait...' : 'Add Skill'}
            </button>
          </form>

          <div style={{ marginTop: '20px' }}>
            {skillsLoading ? (
              <p>Loading skills...</p>
            ) : skills.length === 0 ? (
              <p>No skills added yet. Add your first skill above.</p>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.skill_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '12px 0',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  {editingSkillId === skill.skill_id ? (
                    <form
                      onSubmit={handleUpdateSkill}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        flex: 1,
                      }}
                    >
                      <input
                        value={editingSkillName}
                        onChange={(event) =>
                          setEditingSkillName(event.target.value)
                        }
                        required
                        aria-label="Updated skill name"
                      />

                      <button
                        type="submit"
                        className="dashboard-action"
                        disabled={skillActionLoading}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={skillActionLoading}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: 500 }}>
                        {skill.skill_name}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEditing(skill)}
                        disabled={skillActionLoading}
                      >
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.skill_id)}
                        disabled={skillActionLoading}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default MyProfile

