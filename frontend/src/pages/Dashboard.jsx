import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRooms, getDailyTopic } from '../services/api'

const Dashboard = () => {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [topic, setTopic] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getRooms().then(r => setRooms(r.data.rooms || [])),
      getDailyTopic().then(r => setTopic(r.data.topic)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const levelProgress = () => {
    const sessions = user?.total_sessions || 0
    if (sessions < 15) return { label: 'Beginner', next: 'Intermediate', current: sessions, max: 15 }
    if (sessions < 50) return { label: 'Intermediate', next: 'Advanced', current: sessions - 15, max: 35 }
    return { label: 'Advanced', next: null, current: sessions, max: sessions }
  }

  const progress = levelProgress()
  const pct = Math.min(100, Math.round((progress.current / progress.max) * 100))

  const statCards = [
    { icon: '🎤', label: 'Sessions Done', value: user?.total_sessions || 0, bg: '#dbeafe', color: '#2563eb' },
    { icon: '⭐', label: 'Total Points', value: user?.total_points || 0, bg: '#fef3c7', color: '#d97706' },
    { icon: '🔥', label: 'Streak Days', value: user?.streak_days || 0, bg: '#dcfce7', color: '#16a34a' },
    { icon: '🏅', label: 'Current Level', value: user?.level || 'Beginner', bg: '#f3e8ff', color: '#7c3aed' },
  ]

  return (
    <div style={{ background: 'var(--gray-100)', minHeight: '100vh', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '48px 0 100px' }}>
        <div className="container">
          <div data-aos="fade-up">
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.9rem', marginBottom: 6 }}>
              Welcome back,
            </p>
            <h1 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800 }}>
              {user?.name} 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
              Keep practicing — you're doing great!
            </p>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: -60 }}>
        {/* Stat cards */}
        <div className="row g-3 mb-4">
          {statCards.map((s, i) => (
            <div key={i} className="col-lg-3 col-md-6" data-aos="fade-up" data-aos-delay={i * 80}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                </div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4">
          {/* Left column */}
          <div className="col-lg-8">
            {/* Level progress */}
            <div className="sc-card p-4 mb-4" data-aos="fade-up">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 4 }}>Your Progress</h5>
                  <p style={{ color: 'var(--gray-600)', fontSize: '.88rem', margin: 0 }}>
                    Level: <strong style={{ color: 'var(--primary)' }}>{progress.label}</strong>
                    {progress.next && ` → ${progress.next}`}
                  </p>
                </div>
                <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 14px', borderRadius: 50, fontSize: '.82rem', fontWeight: 700 }}>
                  {pct}%
                </span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 50, height: 10, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: 50, transition: 'width 1s ease' }}></div>
              </div>
              {progress.next && (
                <p style={{ color: 'var(--gray-400)', fontSize: '.8rem', marginTop: 8 }}>
                  {progress.max - progress.current} more sessions to reach {progress.next}
                </p>
              )}
            </div>

            {/* Available Rooms */}
            <div className="sc-card p-4" data-aos="fade-up">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 style={{ fontFamily: 'Syne', fontWeight: 700, margin: 0 }}>Available Rooms</h5>
                <Link to="/room" className="btn-primary-sc" style={{ padding: '7px 16px', fontSize: '.85rem' }}>
                  Browse All <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              </div>

              {loading ? (
                <div className="text-center py-4"><div className="spinner-sc mx-auto"></div></div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎤</div>
                  <p style={{ color: 'var(--gray-600)' }}>No rooms available right now.</p>
                  <Link to="/room" className="btn-primary-sc" style={{ display: 'inline-flex', marginTop: 8 }}>
                    Create a Room
                  </Link>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {rooms.slice(0, 5).map((room, i) => (
                    <div key={i} className="room-card d-flex align-items-center justify-content-between">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className={`level-badge level-${room.level?.toLowerCase()}`}>{room.level}</span>
                          {room.status === 'active' && (
                            <span style={{ fontSize: '.78rem', color: '#ef4444', fontWeight: 600 }}>
                              <span className="live-dot"></span>LIVE
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{room.title}</p>
                        <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--gray-600)' }}>
                          {room.topic?.substring(0, 60)}{room.topic?.length > 60 ? '...' : ''}
                        </p>
                        <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--gray-400)', marginTop: 4 }}>
                          <i className="bi bi-person me-1"></i>Host: {room.host_name}
                          <span className="ms-3"><i className="bi bi-people me-1"></i>
                            {room.current_participants}/{room.max_participants}
                          </span>
                        </p>
                      </div>
                      <Link to="/room" className="btn-primary-sc" style={{ padding: '8px 16px', fontSize: '.85rem', flexShrink: 0 }}>
                        Join
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="col-lg-4">
            {/* Daily Topic */}
            {topic && (
              <div data-aos="fade-up" data-aos-delay="100">
                <div className="topic-banner mb-4">
                  <p style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
                    🎯 Today's Topic
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
                    {topic.topic}
                  </p>
                  <Link to="/room" style={{ color: '#fcd34d', fontWeight: 700, textDecoration: 'none', fontSize: '.88rem' }}>
                    Discuss this topic <i className="bi bi-arrow-right ms-1"></i>
                  </Link>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="sc-card p-4" data-aos="fade-up" data-aos-delay="150">
              <h6 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 16 }}>Quick Actions</h6>
              <div className="d-flex flex-column gap-2">
                {[
                  { to: '/room', icon: 'mic', label: 'Join a Speaking Room', color: 'var(--primary)' },
                  { to: '/room', icon: 'plus-circle', label: 'Create New Room', color: '#7c3aed' },
                  { to: '/profile', icon: 'person', label: 'Edit Profile', color: '#10b981' },
                  { to: '/faq', icon: 'question-circle', label: 'Help & FAQ', color: '#f59e0b' },
                ].map((a, i) => (
                  <Link key={i} to={a.to} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--gray-100)', textDecoration: 'none',
                    color: 'var(--text)', fontWeight: 500, fontSize: '.9rem',
                    transition: '0.2s'
                  }}>
                    <i className={`bi bi-${a.icon}`} style={{ color: a.color, fontSize: '1.1rem' }}></i>
                    {a.label}
                    <i className="bi bi-chevron-right ms-auto" style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}></i>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
