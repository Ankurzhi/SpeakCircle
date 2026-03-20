import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="sc-footer">
      <div className="container">
        <div className="row g-4">
          {/* Brand */}
          <div className="col-lg-4 col-md-6">
            <div className="brand">
              <i className="bi bi-mic-fill me-2" style={{ color: 'var(--primary)' }}></i>
              SpeakCircle
            </div>
            <p style={{ fontSize: '.92rem', lineHeight: 1.7, maxWidth: 300 }}>
              A platform where students and learners connect to practice speaking English confidently with real people.
            </p>
            <div className="d-flex gap-3 mt-3">
              {['twitter', 'instagram', 'linkedin', 'youtube'].map(icon => (
                <a key={icon} href="#" className="social-icon"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,.7)', transition: '0.3s'
                  }}>
                  <i className={`bi bi-${icon}`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="col-lg-2 col-md-3 col-6">
            <div className="footer-title">Platform</div>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/room">Speaking Rooms</Link>
            <Link to="/register">Get Started</Link>
          </div>

          {/* Info */}
          <div className="col-lg-2 col-md-3 col-6">
            <div className="footer-title">Information</div>
            <Link to="/about">About Us</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>

          {/* Contact */}
          <div className="col-lg-4 col-md-6">
            <div className="footer-title">Stay Updated</div>
            <p style={{ fontSize: '.9rem', marginBottom: 14 }}>
              Get tips and new features delivered to your inbox.
            </p>
            <div className="d-flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="form-control form-control-sm"
                style={{
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.15)',
                  color: '#fff',
                  borderRadius: 8,
                }}
              />
              <button className="btn btn-primary btn-sm px-3" style={{ borderRadius: 8, whiteSpace: 'nowrap' }}>
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,.1)', margin: '40px 0 24px' }} />

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <p style={{ margin: 0, fontSize: '.88rem' }}>
            © {new Date().getFullYear()} SpeakCircle. All rights reserved.
          </p>
          <p style={{ margin: 0, fontSize: '.88rem' }}>
            Made with <span style={{ color: '#ef4444' }}>♥</span> for English learners worldwide
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
