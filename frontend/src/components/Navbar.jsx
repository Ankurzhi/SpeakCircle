import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="sc-navbar navbar navbar-expand-lg">
      <div className="container">
        {/* Brand */}
        <Link className="navbar-brand" to="/">
          <i className="bi bi-mic-fill me-1" style={{ color: 'var(--primary)' }}></i>
          SpeakCircle
        </Link>

        {/* Mobile toggle */}
        <button
          className="navbar-toggler border-0"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'} fs-4`}
             style={{ color: 'var(--text)' }}></i>
        </button>

        {/* Menu */}
        <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} id="navMenu">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-2">
            {[
              { to: '/', label: 'Home' },
              { to: '/about', label: 'About' },
              { to: '/faq', label: 'FAQ' },
              { to: '/contact', label: 'Contact' },
            ].map(({ to, label }) => (
              <li className="nav-item" key={to}>
                <NavLink
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  to={to}
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              </li>
            ))}
            {user && (
              <>
                <li className="nav-item">
                  <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    to="/dashboard" onClick={closeMenu}>
                    Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    to="/room" onClick={closeMenu}>
                    Rooms
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* Auth buttons */}
          <div className="d-flex gap-2 align-items-center">
            {user ? (
              <>
                <NavLink to="/profile" className="btn-outline-sc btn" onClick={closeMenu}
                  style={{ padding: '7px 16px', fontSize: '.88rem' }}>
                  <i className="bi bi-person-circle me-1"></i>
                  {user.name?.split(' ')[0]}
                </NavLink>
                <button className="btn btn-danger btn-sm" onClick={handleLogout}
                  style={{ borderRadius: '8px', fontWeight: 600 }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn-outline-sc btn" onClick={closeMenu}
                  style={{ padding: '7px 18px', fontSize: '.88rem' }}>
                  Login
                </NavLink>
                <NavLink to="/register" className="btn-primary-sc btn" onClick={closeMenu}
                  style={{ padding: '8px 18px', fontSize: '.88rem' }}>
                  Get Started
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
