import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AOS from 'aos'
import { useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Loader from './components/Loader'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Room from './pages/Room'
import RoomLive from './pages/RoomLive'
import About from './pages/About'
import Contact from './pages/Contact'
import FAQ from './pages/FAQ'
import Profile from './pages/Profile'

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  const { loading } = useAuth()

  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 })
  }, [])

  if (loading) return <Loader />

  return (
    <SocketProvider>
      <Routes>
        {/* Live room — fullscreen, no Navbar/Footer */}
        <Route path="/room/:id/live" element={
          <ProtectedRoute><RoomLive /></ProtectedRoute>
        } />

        {/* All other pages — with Navbar + Footer */}
        <Route path="*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/room" element={<ProtectedRoute><Room /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Footer />
          </>
        } />
      </Routes>
    </SocketProvider>
  )
}

export default App