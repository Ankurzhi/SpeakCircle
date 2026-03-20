import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRooms, createRoom, joinRoom } from '../services/api'
import Toast from '../components/Toast'
import API from '../services/api'

const Room = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', topic: '', level: 'Beginner', max_participants: 4 })
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState(null)
  const [joining, setJoining] = useState(null)
  const [ending, setEnding] = useState(null)

  const fetchRooms = () => {
    setLoading(true)
    getRooms(filter ? { level: filter } : {})
      .then(r => setRooms(r.data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRooms() }, [filter])

  useEffect(() => {
    const interval = setInterval(fetchRooms, 15000)
    return () => clearInterval(interval)
  }, [filter])

  const handleEnter = async (id) => {
    setJoining(id)
    try {
      await joinRoom(id)
      navigate(`/room/${id}/live`)
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Could not join room', type: 'error' })
      setJoining(null)
    }
  }

  const handleEndRoom = async (id) => {
    if (!window.confirm('End this room? All participants will be removed.')) return
    setEnding(id)
    try {
      await API.patch(`/rooms/${id}/close`)
      setToast({ message: 'Room ended successfully.', type: 'success' })
      fetchRooms()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Could not end room', type: 'error' })
    } finally {
      setEnding(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await createRoom(form)
      const newRoomId = res.data.room_id
      setShowCreate(false)
      setForm({ title: '', topic: '', level: 'Beginner', max_participants: 4 })
      navigate(`/room/${newRoomId}/live`)
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Could not create room', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const getRoomButton = (room) => {
    const isHost = room.host_id === user?.id
    const isFull = room.current_participants >= room.max_participants

    if (isHost) {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-primary-sc justify-content-center"
            style={{ display: 'flex', padding: '9px', flex: 1 }}
            onClick={() => handleEnter(room.id)}
            disabled={joining === room.id}
          >
            {joining === room.id
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Entering...</>
              : <><i className="bi bi-door-open me-2"></i>Enter Room</>}
          </button>
          <button
            onClick={() => handleEndRoom(room.id)}
            disabled={ending === room.id}
            title="End this room"
            style={{
              padding: '9px 14px', borderRadius: 10, border: '1.5px solid #ef4444',
              background: 'transparent', color: '#ef4444', cursor: 'pointer',
              fontWeight: 600, fontSize: '.85rem', flexShrink: 0,
            }}
          >
            {ending === room.id
              ? <span className="spinner-border spinner-border-sm"></span>
              : <i className="bi bi-stop-circle"></i>}
          </button>
        </div>
      )
    }

    if (isFull) {
      return (
        <button className="btn btn-secondary btn-sm w-100"
          style={{ display: 'flex', padding: '9px', justifyContent: 'center' }} disabled>
          Room Full
        </button>
      )
    }

    return (
      <button
        className="btn-primary-sc w-100 justify-content-center"
        style={{ display: 'flex', padding: '9px' }}
        onClick={() => handleEnter(room.id)}
        disabled={joining === room.id}
      >
        {joining === room.id
          ? <><span className="spinner-border spinner-border-sm me-2"></span>Joining...</>
          : <><i className="bi bi-box-arrow-in-right me-2"></i>Join Room</>}
      </button>
    )
  }

  return (
    <div style={{ background: 'var(--gray-100)', minHeight: '100vh', paddingBottom: 60 }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '48px 0' }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div data-aos="fade-up">
              <h1 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800 }}>
                Speaking Rooms 🎤
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Join a live room or create your own — real-time voice & chat
              </p>
            </div>
            <button className="btn-primary-sc" onClick={() => setShowCreate(true)}
              data-aos="fade-up" data-aos-delay="100" style={{ padding: '10px 20px' }}>
              <i className="bi bi-plus-lg me-2"></i> Create Room
            </button>
          </div>
        </div>
      </div>

      <div className="container mt-4">
        <div className="d-flex gap-2 mb-4 flex-wrap" data-aos="fade-up">
          {['', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
            <button key={lvl} onClick={() => setFilter(lvl)}
              className={filter === lvl ? 'btn-primary-sc' : 'btn-outline-sc'}
              style={{ padding: '7px 18px', fontSize: '.85rem' }}>
              {lvl || 'All Levels'}
            </button>
          ))}
          <button onClick={fetchRooms} className="btn-outline-sc ms-auto" style={{ padding: '7px 14px', fontSize: '.85rem' }}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-sc mx-auto"></div></div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-5" data-aos="fade-up">
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎤</div>
            <h4 style={{ fontFamily: 'Syne', fontWeight: 700 }}>No rooms found</h4>
            <p style={{ color: 'var(--gray-600)' }}>Be the first — create a new speaking room!</p>
            <button className="btn-primary-sc mt-2" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex' }}>
              Create Room <i className="bi bi-plus ms-2"></i>
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {rooms.map((room, i) => (
              <div key={room.id} className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay={i * 60}>
                <div className="room-card h-100 d-flex flex-column" style={{
                  border: room.host_id === user?.id ? '2px solid #6366f1' : undefined,
                }}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`level-badge level-${room.level?.toLowerCase()}`}>{room.level}</span>
                      {room.host_id === user?.id && (
                        <span style={{
                          fontSize: '.72rem', fontWeight: 700, color: '#6366f1',
                          background: '#eef2ff', padding: '2px 8px', borderRadius: 20,
                        }}>HOST</span>
                      )}
                    </div>
                    {room.status === 'active' && (
                      <span style={{ fontSize: '.78rem', color: '#ef4444', fontWeight: 700 }}>
                        <span className="live-dot"></span>LIVE
                      </span>
                    )}
                  </div>
                  <h6 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 6 }}>{room.title}</h6>
                  <p style={{ color: 'var(--gray-600)', fontSize: '.88rem', lineHeight: 1.6, flex: 1 }}>{room.topic}</p>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 14 }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '.75rem' }}>
                          {room.host_name?.charAt(0)}
                        </div>
                        <span style={{ fontSize: '.83rem', color: 'var(--gray-600)' }}>{room.host_name}</span>
                      </div>
                      <span style={{ fontSize: '.83rem', color: 'var(--gray-600)' }}>
                        <i className="bi bi-people me-1"></i>
                        {room.current_participants}/{room.max_participants}
                      </span>
                    </div>
                    {getRoomButton(room)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 style={{ fontFamily: 'Syne', fontWeight: 800, margin: 0 }}>Create a Room</h5>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="sc-form-group">
                <label className="sc-label">Room Title</label>
                <input className="sc-input" placeholder="e.g. Morning English Practice"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="sc-form-group">
                <label className="sc-label">Topic / Description</label>
                <textarea className="sc-input" rows={3} placeholder="What will you discuss?"
                  value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} required style={{ resize: 'vertical' }}></textarea>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <div className="sc-form-group">
                    <label className="sc-label">Level</label>
                    <select className="sc-input" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                      <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                    </select>
                  </div>
                </div>
                <div className="col-6">
                  <div className="sc-form-group">
                    <label className="sc-label">Max Participants</label>
                    <select className="sc-input" value={form.max_participants} onChange={e => setForm({ ...form, max_participants: +e.target.value })}>
                      {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} people</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button type="button" className="btn-outline-sc flex-1" onClick={() => setShowCreate(false)}
                  style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '11px' }}>Cancel</button>
                <button type="submit" className="btn-primary-sc flex-1" disabled={creating}
                  style={{ flex: 1, justifyContent: 'center', display: 'flex', padding: '11px' }}>
                  {creating ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Room