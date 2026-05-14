import { Link } from 'react-router-dom'

const team = [
  { name: 'Ankur Kumar', role: 'Founder & CEO', emoji: '👨‍💻' },
  { name: 'Priya Gupta', role: 'Head of Community', emoji: '👩‍🏫' },
  { name: 'Arjun Mehta', role: 'Lead Developer', emoji: '🧑‍💻' },
  { name: 'Sneha Patel', role: 'Content & Curriculum', emoji: '📚' },
]

const values = [
  { icon: '🌍', title: 'Accessible to All', desc: 'We believe quality English practice should be free and available to everyone, everywhere.' },
  { icon: '🤝', title: 'Community First', desc: 'Learning is better together. Our platform is built around real human connections and conversations.' },
  { icon: '🚀', title: 'Continuous Growth', desc: 'We\'re constantly improving based on learner feedback to make your journey as effective as possible.' },
  { icon: '🔒', title: 'Safe Environment', desc: 'A respectful, supportive space where every learner feels comfortable and confident to speak.' },
]

const About = () => {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '90px 0' }}>
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6" data-aos="fade-up">
              <span className="section-tag" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                🎤 ABOUT US
              </span>
              <h1 className="section-title mt-3" style={{ color: '#fff' }}>
                We're on a mission to make English speaking fearless
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginTop: 16, fontSize: '1.05rem' }}>
                SpeakCircle was born from a simple idea: the best way to improve spoken English is by actually speaking — with real people, on real topics, every single day.
              </p>
              <Link to="/register" className="btn-primary-sc mt-4" style={{ display: 'inline-flex', padding: '12px 28px' }}>
                Join Our Community <i className="bi bi-arrow-right ms-2"></i>
              </Link>
            </div>
            <div className="col-lg-6" data-aos="fade-left" data-aos-delay="100">
              <div className="row g-3">
                {[
                  { value: '15,000+', label: 'Active Learners' },
                  { value: '50,000+', label: 'Sessions Completed' },
                  { value: '120+', label: 'Countries' },
                  { value: '4.9★', label: 'Average Rating' },
                ].map((s, i) => (
                  <div key={i} className="col-6">
                    <div style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 16, padding: '24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontFamily: 'Syne', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{s.value}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.85rem' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="sc-section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6" data-aos="fade-right">
              <span className="section-tag">📖 OUR STORY</span>
              <h2 className="section-title mt-2">Built by learners, for learners</h2>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, marginTop: 16 }}>
                In 2025, our founder Ankur struggled with spoken English despite years of study. He knew grammar, he understood movies but freezing up in conversations was a constant problem.
              </p>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, marginTop: 12 }}>
                The solution? Practice daily with real people. He built SpeakCircle to connect learners worldwide, making daily speaking practice as easy as joining a room online.
              </p>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, marginTop: 12 }}>
                Today, thousands of learners use SpeakCircle every day to transform their confidence and fluency.
              </p>
            </div>
            <div className="col-lg-6" data-aos="fade-left" data-aos-delay="100">
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
                borderRadius: 20, padding: 40, textAlign: 'center'
              }}>
                <div style={{ fontSize: '5rem', marginBottom: 20 }}>🎤</div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 800, color: 'var(--dark)' }}>
                  "Speak more, fear less"
                </h3>
                <p style={{ color: 'var(--gray-600)', fontSize: '1.05rem', marginTop: 12, fontStyle: 'italic' }}>
                  Our guiding philosophy since day one
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="sc-section-alt">
        <div className="container">
          <div className="text-center mb-5" data-aos="fade-up">
            <span className="section-tag">💡 OUR VALUES</span>
            <h2 className="section-title mt-2">What we stand for</h2>
          </div>
          <div className="row g-4">
            {values.map((v, i) => (
              <div key={i} className="col-lg-3 col-md-6" data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="sc-card p-4 text-center h-100">
                  <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{v.icon}</div>
                  <h6 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 10 }}>{v.title}</h6>
                  <p style={{ color: 'var(--gray-600)', fontSize: '.9rem', lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="sc-section">
        <div className="container">
          <div className="text-center mb-5" data-aos="fade-up">
            <span className="section-tag">👥 THE TEAM</span>
            <h2 className="section-title mt-2">Meet the people behind SpeakCircle</h2>
          </div>
          <div className="row g-4 justify-content-center">
            {team.map((t, i) => (
              <div key={i} className="col-lg-3 col-md-4 col-6" data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="sc-card p-4 text-center">
                  <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>{t.emoji}</div>
                  <h6 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 4 }}>{t.name}</h6>
                  <p style={{ color: 'var(--gray-600)', fontSize: '.85rem', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container position-relative" data-aos="zoom-in">
          <h2 className="section-title" style={{ color: '#fff' }}>Ready to join our community?</h2>
          <p className="section-subtitle mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Start speaking English with confidence today. It's completely free.
          </p>
          <Link to="/register" className="btn-primary-sc mt-4" style={{ display: 'inline-flex', padding: '14px 32px', fontSize: '1rem' }}>
            Join SpeakCircle Free <i className="bi bi-arrow-right ms-2"></i>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default About
