import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../services/api'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginUser(form)
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" data-aos="fade-up">
        <div className="text-center mb-4">
          <div style={{
            width: 60, height: 60, background: 'var(--primary-light)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '1.6rem'
          }}>🎤</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.7rem' }}>Welcome back!</h2>
          <p style={{ color: 'var(--gray-600)', marginTop: 6 }}>Sign in to continue your speaking journey</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex gap-2 align-items-center" style={{ borderRadius: 10 }}>
            <i className="bi bi-exclamation-circle-fill"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="sc-form-group">
            <label className="sc-label">Email address</label>
            <input
              type="email"
              className="sc-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="sc-form-group">
            <label className="sc-label">Password</label>
            <input
              type="password"
              className="sc-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn-primary-sc w-100 justify-content-center mt-2"
            disabled={loading} style={{ display: 'flex', padding: '13px' }}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
            ) : (
              <>Sign In <i className="bi bi-arrow-right ms-2"></i></>
            )}
          </button>
        </form>

        <p className="text-center mt-4" style={{ color: 'var(--gray-600)', fontSize: '.92rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
