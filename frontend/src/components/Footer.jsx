import { Link } from 'react-router-dom'

// ── Social links — update the href values to your real profiles ───────────────
const SOCIAL_LINKS = [
  { icon: 'instagram',  href: 'https://instagram.com/samsung_ankur_',  label: 'Instagram' },
  { icon: 'facebook',   href: 'https://facebook.com/ankur.ankurraj5245',                  label: 'Facebook'  },
  { icon: 'github',     href: 'https://github.com/Ankurzhi',                    label: 'GitHub'    },
  { icon: 'linkedin',   href: 'https://linkedin.com/in/ankurkumarzhi',                  label: 'LinkedIn'  },
  { icon: 'globe',    href: 'https://ankurzhi.github.io/Portfolio/',                   label: 'Potfollio'   },
  
]

// ── Internal page links ───────────────────────────────────────────────────────
const PLATFORM_LINKS = [
  { label: 'Home',           to: '/home'          },
  { label: 'Dashboard',      to: '/dashboard' },
  { label: 'Speaking Rooms', to: '/room'      },
  { label: 'Profile',        to: '/profile'   },
  { label: 'Get Started',    to: '/register'  },
]

const INFO_LINKS = [
  { label: 'About Us',       to: '/about'   },
  { label: 'FAQ',            to: '/faq'     },
  { label: 'Contact',        to: '/contact' },
  { label: 'Privacy Policy', to: '/privacy' },
]

const Footer = () => {
  return (
    <footer className="sc-footer">
      <div className="container">
        <div className="row g-4">

          {/* ── Brand + socials ─────────────────────────────────────────────── */}
          <div className="col-lg-4 col-md-6">
            <div className="brand">
              <i className="bi bi-mic-fill me-2" style={{ color: 'var(--primary)' }}></i>
              SpeakCircle
            </div>
            <p style={{ fontSize: '.92rem', lineHeight: 1.7, maxWidth: 300 }}>
              A platform where students and learners connect to practice speaking
              English confidently with real people.
            </p>

            {/* Social icons */}
            <div className="d-flex flex-wrap gap-2 mt-3">
              {SOCIAL_LINKS.map(({ icon, href, label }) => (
                <a
                  key={icon}
                  href={href}
                  target="_blank"          /* opens in new tab */
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(255,255,255,.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,.75)',
                    transition: 'background 0.25s, color 0.25s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--primary)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.08)'
                    e.currentTarget.style.color = 'rgba(255,255,255,.75)'
                  }}
                >
                  <i className={`bi bi-${icon}`} style={{ fontSize: 16 }}></i>
                </a>
              ))}
            </div>
          </div>

          {/* ── Platform links ──────────────────────────────────────────────── */}
          <div className="col-lg-2 col-md-3 col-6">
            <div className="footer-title">Platform</div>
            {PLATFORM_LINKS.map(({ label, to }) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
          </div>

          {/* ── Info links ──────────────────────────────────────────────────── */}
          <div className="col-lg-2 col-md-3 col-6">
            <div className="footer-title">Information</div>
            {INFO_LINKS.map(({ label, to }) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
          </div>

          {/* ── Newsletter ──────────────────────────────────────────────────── */}
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
              <button
                className="btn btn-primary btn-sm px-3"
                style={{ borderRadius: 8, whiteSpace: 'nowrap' }}
              >
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