
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './ProtectedRoute'
import JobDetails from './pages/JobDetails'
import MyApplications from './pages/MyApplications'
import MyProfile from './pages/MyProfile'
import RecruiterJobs from './pages/RecruiterJobs'
import RecruiterApplications from './pages/RecruiterApplications'
import AddJob from './pages/AddJob'
import RecruiterSetup from './pages/RecruiterSetup'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/jobs/:jobId" element={<JobDetails />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Job Seeker Applications */}
        <Route
          path="/my-applications"
          element={
            <ProtectedRoute>
              <MyApplications />
            </ProtectedRoute>
          }
        />

        {/* User Profile */}
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />

        {/* Recruiter Setup */}
        <Route
          path="/recruiter/setup"
          element={
            <ProtectedRoute>
              <RecruiterSetup />
            </ProtectedRoute>
          }
        />

        {/* Recruiter Jobs */}
        <Route
          path="/recruiter/jobs"
          element={
            <ProtectedRoute>
              <RecruiterJobs />
            </ProtectedRoute>
          }
        />

        {/* Add New Job */}
        <Route
          path="/recruiter/jobs/new"
          element={
            <ProtectedRoute>
              <AddJob />
            </ProtectedRoute>
          }
        />

        {/* Recruiter Applications */}
        <Route
          path="/recruiter/jobs/:job_id/applications"
          element={
            <ProtectedRoute>
              <RecruiterApplications />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
