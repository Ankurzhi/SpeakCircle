import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { registerUser } from '../services/api'

const Register = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters')
    }
    setLoading(true)
    try {
      const res = await registerUser(form)
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
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
          }}>🚀</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.7rem' }}>Create your account</h2>
          <p style={{ color: 'var(--gray-600)', marginTop: 6 }}>Start your English speaking journey today — free!</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex gap-2 align-items-center" style={{ borderRadius: 10 }}>
            <i className="bi bi-exclamation-circle-fill"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="sc-form-group">
            <label className="sc-label">Full Name</label>
            <input type="text" className="sc-input" placeholder="Your full name"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>

          <div className="sc-form-group">
            <label className="sc-label">Email Address</label>
            <input type="email" className="sc-input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="sc-form-group">
            <label className="sc-label">Password</label>
            <input type="password" className="sc-input" placeholder="Min. 6 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            <p style={{ fontSize: '.78rem', color: 'var(--gray-400)', marginTop: 4 }}>
              At least 6 characters
            </p>
          </div>

          <button type="submit" className="btn-primary-sc w-100 justify-content-center mt-2"
            disabled={loading} style={{ display: 'flex', padding: '13px' }}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Creating account...</>
            ) : (
              <>Create Account <i className="bi bi-arrow-right ms-2"></i></>
            )}
          </button>
        </form>

        <p className="text-center mt-3" style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="text-center mt-3" style={{ color: 'var(--gray-600)', fontSize: '.92rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
