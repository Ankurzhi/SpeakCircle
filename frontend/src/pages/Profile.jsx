import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../services/api'
import Toast from '../components/Toast'

const Profile = () => {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', level: user?.level || 'Beginner' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateProfile(form)
      setUser(res.data.user)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setToast({ message: 'Profile updated successfully!', type: 'success' })
    } catch {
      setToast({ message: 'Failed to update profile', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--gray-100)', minHeight: '100vh', paddingBottom: 60 }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '48px 0 80px' }}>
        <div className="container text-center" data-aos="fade-up">
          <div className="avatar-circle mx-auto mb-3"
            style={{ width: 80, height: 80, fontSize: '2rem', background: 'var(--primary)' }}>
            {user?.name?.charAt(0)}
          </div>
          <h2 style={{ color: '#fff', fontFamily: 'Syne', fontWeight: 800 }}>{user?.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.email}</p>
          <span style={{
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            padding: '4px 16px', borderRadius: 50, fontSize: '.83rem', fontWeight: 600
          }}>
            {user?.level}
          </span>
        </div>
      </div>

      <div className="container" style={{ marginTop: -40 }}>
        <div className="row g-4 justify-content-center">
          {/* Stats */}
          <div className="col-lg-4">
            <div className="sc-card p-4" data-aos="fade-up">
              <h6 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 20 }}>Your Stats</h6>
              {[
                { label: 'Sessions Completed', value: user?.total_sessions || 0, icon: '🎤' },
                { label: 'Total Points', value: user?.total_points || 0, icon: '⭐' },
                { label: 'Streak Days', value: user?.streak_days || 0, icon: '🔥' },
                { label: 'Member Since', value: new Date(user?.created_at || Date.now()).getFullYear(), icon: '📅' },
              ].map((s, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center py-3"
                  style={{ borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ color: 'var(--gray-600)', fontSize: '.9rem' }}>
                    {s.icon} {s.label}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Profile */}
          <div className="col-lg-8">
            <div className="sc-card p-4" data-aos="fade-up" data-aos-delay="100">
              <h6 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 24 }}>Edit Profile</h6>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="sc-form-group">
                      <label className="sc-label">Full Name</label>
                      <input className="sc-input" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="sc-form-group">
                      <label className="sc-label">Speaking Level</label>
                      <select className="sc-input" value={form.level}
                        onChange={e => setForm({ ...form, level: e.target.value })}>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sc-form-group">
                  <label className="sc-label">Bio <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
                  <textarea className="sc-input" rows={3} placeholder="Tell others about yourself..."
                    value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                    style={{ resize: 'vertical' }}></textarea>
                </div>

                <div className="sc-form-group">
                  <label className="sc-label">Email Address</label>
                  <input className="sc-input" value={user?.email} disabled
                    style={{ background: 'var(--gray-100)', cursor: 'not-allowed' }} />
                  <p style={{ fontSize: '.78rem', color: 'var(--gray-400)', marginTop: 4 }}>
                    Email cannot be changed
                  </p>
                </div>

                <button type="submit" className="btn-primary-sc" disabled={saving}
                  style={{ display: 'inline-flex', padding: '11px 28px' }}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
