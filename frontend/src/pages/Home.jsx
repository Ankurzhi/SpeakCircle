import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDailyTopic, getStats } from '../services/api'

const testimonials = [
  { text: "My confidence improved dramatically in just 2 weeks. The live rooms are brilliant!", name: "Ankur S.", role: "Student, Delhi" },
  { text: "Best platform for spoken English practice. Real people, real conversations.", name: "Priya M.", role: "Professional, Mumbai" },
  { text: "Daily topics keep me engaged every single day. I love this platform!", name: "Rahul K.", role: "Learner, Bangalore" },
  { text: "I went from nervous to fluent in 3 months. SpeakCircle changed my life.", name: "Sneha P.", role: "MBA Student" },
  { text: "Short 10-minute sessions fit perfectly into my busy schedule.", name: "Arjun T.", role: "Engineer" },
  { text: "The gamified points system keeps me motivated to practice daily.", name: "Nisha R.", role: "Teacher" },
]

const features = [
  { icon: '🎤', title: 'Live Speaking Rooms', desc: 'Join topic-based rooms with 3-4 learners at your level. Real conversation, real improvement.' },
  { icon: '📈', title: 'Track Your Progress', desc: 'Earn points after every session, level up, and watch your fluency grow over time.' },
  { icon: '⏱', title: '10-Min Sessions', desc: 'Short, focused sessions designed to build confidence without overwhelming your schedule.' },
  { icon: '🌍', title: 'Global Community', desc: 'Connect with English learners from India and around the world, anytime, anywhere.' },
  { icon: '🎯', title: 'Daily Topics', desc: 'Fresh conversation topics every day to ensure you always have something interesting to talk about.' },
  { icon: '🏆', title: 'Leaderboard & Badges', desc: 'Compete with others, earn badges and certificates to showcase your speaking achievements.' },
]

const Home = () => {
  const [dailyTopic, setDailyTopic] = useState(null)
  const [stats, setStats] = useState({ total_users: '10,000+', total_sessions: '50,000+', active_rooms: 24 })
  const [liveUsers, setLiveUsers] = useState(0)

  useEffect(() => {
    getDailyTopic().then(r => setDailyTopic(r.data.topic)).catch(() => {})
    getStats().then(r => setStats(r.data.stats)).catch(() => {})

    setLiveUsers(Math.floor(Math.random() * 60) + 80)
    const interval = setInterval(() => {
      setLiveUsers(Math.floor(Math.random() * 60) + 80)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="hero-blob"></div>
        <div className="hero-blob-2"></div>
        <div className="container position-relative">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="hero-badge" data-aos="fade-down">
                <span className="dot"></span>
                TRUSTED BY 15,000+ LEARNERS WORLDWIDE
              </div>

              <h1 className="hero-title" data-aos="fade-up" data-aos-delay="100">
                Speak English<br />
                <span className="highlight">Confidently</span> — Every Day
              </h1>

              <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                Join live speaking rooms with real learners. Practice daily, track your progress,
                and build the fluency you've always wanted.
              </p>

              <div className="d-flex gap-3 flex-wrap" data-aos="fade-up" data-aos-delay="300">
                <Link to="/register" className="btn-primary-sc" style={{ padding: '13px 28px', fontSize: '1rem' }}>
                  Start Speaking Free <i className="bi bi-arrow-right ms-1"></i>
                </Link>
                <Link to="/about" className="btn-outline-sc"
                  style={{ padding: '13px 28px', fontSize: '1rem', borderColor: 'rgba(255,255,255,.35)', color: '#fff' }}>
                  Learn More
                </Link>
              </div>

              <div className="hero-stats-row" data-aos="fade-up" data-aos-delay="400">
                <div className="hero-stat">
                  <span className="number">{stats.total_users || '10K+'}</span>
                  <span className="label">Active Learners</span>
                </div>
                <div className="hero-stat">
                  <span className="number">{stats.total_sessions || '50K+'}</span>
                  <span className="label">Sessions Done</span>
                </div>
                <div className="hero-stat">
                  <span className="number">{stats.active_rooms || 24}</span>
                  <span className="label">Live Rooms Now</span>
                </div>
              </div>
            </div>

            {/* Hero card */}
            <div className="col-lg-6" data-aos="fade-left" data-aos-delay="200">
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: 32
              }}>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span className="live-dot"></span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{liveUsers} students practicing right now</span>
                </div>

                {dailyTopic && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: '18px 20px',
                    marginBottom: 20
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                      🎯 Today's Speaking Topic
                    </p>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                      {dailyTopic.topic}
                    </p>
                    <span style={{
                      display: 'inline-block', marginTop: 8, background: 'rgba(245,158,11,0.2)',
                      color: '#fcd34d', padding: '2px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600
                    }}>
                      {dailyTopic.category}
                    </span>
                  </div>
                )}

                {[
                  { level: 'Beginner', topic: 'My Daily Routine', users: 3, max: 4 },
                  { level: 'Intermediate', topic: 'Future of AI', users: 2, max: 4 },
                  { level: 'Advanced', topic: 'Global Economy', users: 4, max: 4 },
                ].map((room, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span className={`level-badge level-${room.level.toLowerCase()} me-2`}>{room.level}</span>
                      <span style={{ color: '#fff', fontSize: '.9rem', fontWeight: 500 }}>{room.topic}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.82rem' }}>
                      {room.users}/{room.max} <i className="bi bi-people-fill ms-1"></i>
                    </span>
                  </div>
                ))}

                <Link to="/register" className="btn-primary-sc w-100 justify-content-center mt-2"
                  style={{ display: 'flex', padding: '12px' }}>
                  Join a Room Now <i className="bi bi-arrow-right ms-2"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="sc-section">
        <div className="container">
          <div className="text-center mb-5" data-aos="fade-up">
            <span className="section-tag">✨ WHY SPEAKCIRCLE?</span>
            <h2 className="section-title mt-2">Everything you need to speak fluently</h2>
            <p className="section-subtitle mt-3 mx-auto">
              We've built every feature with one goal: making you a confident English speaker as fast as possible.
            </p>
          </div>

          <div className="row g-4">
            {features.map((f, i) => (
              <div key={i} className="col-lg-4 col-md-6"
                data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="sc-card h-100 p-4">
                  <div className="feature-icon">{f.icon}</div>
                  <h5 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 10 }}>{f.title}</h5>
                  <p style={{ color: 'var(--gray-600)', fontSize: '.94rem', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Daily Topic Highlight ── */}
      {dailyTopic && (
        <section className="sc-section-alt">
          <div className="container">
            <div className="row align-items-center g-5">
              <div className="col-lg-6" data-aos="fade-right">
                <span className="section-tag">🎯 DAILY PRACTICE</span>
                <h2 className="section-title mt-2">Today's Speaking Topic</h2>
                <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, marginTop: 14 }}>
                  Every day we publish a new conversation topic to keep your practice fresh and engaging.
                  Join a room and start discussing!
                </p>
                <Link to="/room" className="btn-primary-sc mt-3" style={{ display: 'inline-flex' }}>
                  Join a Room <i className="bi bi-arrow-right ms-2"></i>
                </Link>
              </div>
              <div className="col-lg-6" data-aos="fade-left" data-aos-delay="100">
                <div className="topic-banner">
                  <p style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: 1, opacity: 0.7, marginBottom: 10, textTransform: 'uppercase' }}>
                    Category: {dailyTopic.category}
                  </p>
                  <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>
                    {dailyTopic.topic}
                  </h3>
                  <div className="d-flex gap-3 flex-wrap">
                    {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                      <span key={lvl} style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        padding: '5px 14px',
                        borderRadius: 50,
                        fontSize: '.8rem',
                        fontWeight: 600
                      }}>
                        {lvl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How it Works ── */}
      <section className="sc-section">
        <div className="container">
          <div className="text-center mb-5" data-aos="fade-up">
            <span className="section-tag">🚀 HOW IT WORKS</span>
            <h2 className="section-title mt-2">Start speaking in 3 simple steps</h2>
          </div>
          <div className="row g-4 justify-content-center">
            {[
              { step: '01', icon: 'person-plus', title: 'Create Account', desc: 'Sign up free in seconds. No credit card needed. Just your name and email.' },
              { step: '02', icon: 'search', title: 'Choose a Room', desc: 'Browse rooms by level and topic. Join one that matches your interests.' },
              { step: '03', icon: 'mic', title: 'Start Speaking', desc: 'Jump into a live conversation and start improving your fluency right away.' },
            ].map((s, i) => (
              <div key={i} className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay={i * 120}>
                <div className="text-center p-4">
                  <div style={{
                    width: 70, height: 70, borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    position: 'relative'
                  }}>
                    <i className={`bi bi-${s.icon}`} style={{ fontSize: '1.6rem', color: 'var(--primary)' }}></i>
                    <span style={{
                      position: 'absolute', top: -8, right: -8,
                      background: 'var(--primary)', color: '#fff',
                      width: 26, height: 26, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.72rem', fontWeight: 800
                    }}>{s.step}</span>
                  </div>
                  <h5 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>{s.title}</h5>
                  <p style={{ color: 'var(--gray-600)', fontSize: '.94rem', lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="sc-section-alt">
        <div className="container">
          <div className="text-center mb-5" data-aos="fade-up">
            <span className="section-tag">💬 STUDENT STORIES</span>
            <h2 className="section-title mt-2">What our students say</h2>
          </div>
          <div className="row g-4">
            {testimonials.map((t, i) => (
              <div key={i} className="col-lg-4 col-md-6"
                data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="testimonial-card h-100">
                  <div style={{ paddingTop: 20, color: 'var(--text)', lineHeight: 1.7, marginBottom: 20, fontSize: '.95rem' }}>
                    {t.text}
                  </div>
                  <div className="d-flex align-items-center gap-3 mt-auto">
                    <div className="avatar-circle">{t.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{t.name}</div>
                      <div style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{t.role}</div>
                    </div>
                    <div className="ms-auto">
                      {[...Array(5)].map((_, j) => (
                        <i key={j} className="bi bi-star-fill" style={{ color: '#f59e0b', fontSize: '.75rem' }}></i>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container position-relative">
          <div data-aos="zoom-in">
            <span className="section-tag" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              🎤 START TODAY
            </span>
            <h2 className="section-title mt-3" style={{ color: '#fff' }}>
              Ready to speak with confidence?
            </h2>
            <p className="section-subtitle mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Join thousands of learners who transformed their English speaking skills with SpeakCircle. It's completely free.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap mt-4">
              <Link to="/register" className="btn-primary-sc" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                Create Free Account <i className="bi bi-arrow-right ms-2"></i>
              </Link>
              <Link to="/room" className="btn-outline-sc"
                style={{ padding: '14px 32px', fontSize: '1rem', borderColor: 'rgba(255,255,255,.35)', color: '#fff' }}>
                Browse Rooms
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
