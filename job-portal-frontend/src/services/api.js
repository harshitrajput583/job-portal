
const API_BASE_URL = 'http://localhost:3000'

export async function registerUser(formData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed')
  }

  return data
}

export async function loginUser(formData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }

  return data
}

export async function getJobs() {
  const response = await fetch(`${API_BASE_URL}/api/jobs`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch jobs')
  }

  return data
}
export async function getJobById(jobId) {
  const response = await fetch(
    `${API_BASE_URL}/api/jobs/${jobId}`
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch job details')
  }

  return data
}

export async function applyForJob(jobId, applicationData = {}) {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/jobs/${jobId}/apply`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(applicationData),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to apply for job')
  }

  return data
}
export async function getMyApplications() {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/applications/my`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch applications')
  }

  return data
}

export async function getMyProfile() {
  const token = sessionStorage.getItem('token')

  const response = await fetch('http://localhost:3000/api/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch profile')
  }

  return data
}

export async function updateMyProfile(profileData) {
  const token = sessionStorage.getItem('token')

  const response = await fetch('http://localhost:3000/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update profile')
  }

  return data
}

export async function getMySkills() {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/profile/skills`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch skills')
  }

  return data
}

export async function addSkill(skill_name) {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/profile/skills`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ skill_name }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to add skill')
  }

  return data
}

export async function updateSkill(skill_id, skill_name) {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/profile/skills/${skill_id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ skill_name }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update skill')
  }

  return data
}

export async function removeSkill(skill_id) {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/profile/skills/${skill_id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to remove skill')
  }

  return data
}

export async function getApplicationHistory(applicationId) {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/applications/${applicationId}/history`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch application history')
  }

  return data
}

export async function createJob(jobData) {
  const token = sessionStorage.getItem('token')

  const response = await fetch(
    `${API_BASE_URL}/api/recruiter/jobs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(jobData),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create job')
  }

  return data
}



