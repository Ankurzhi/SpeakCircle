const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ─── Allowed origins ──────────────────────────────────────────────────────────
// CLIENT_URL must be set in Render env vars as: https://speak-circle-eight.vercel.app
// EXTRA_ORIGINS can be a comma-separated list of additional allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://speak-circle-eight.vercel.app',  // hardcoded fallback — always works
  process.env.CLIENT_URL,                    // from Render env var
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(',').map(o => o.trim()) : []),
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // deduplicate

console.log('✅ Allowed CORS origins:', allowedOrigins)

// CORS options — shared between Express and Socket.IO
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    console.warn('❌ CORS blocked origin:', origin)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  // polling first — more reliable on Render free tier and mobile networks
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
})

// ─── In-memory room state ─────────────────────────────────────────────────────
const roomUsers = {}

// ─── Socket.IO JWT Auth Middleware ────────────────────────────────────────────
const jwt = require('jsonwebtoken')
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('No token provided'))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.user = decoded
    next()
  } catch (err) {
    next(new Error('Invalid token'))
  }
})

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id} | User: ${socket.user.name}`)

  socket.on('join-room', ({ roomId }) => {
    if (!roomId) return
    const rid = String(roomId) // ALWAYS use string key — prevents number/string mismatch on disconnect
    socket.join(rid)
    if (!roomUsers[rid]) roomUsers[rid] = new Map()
    const userData = {
      userId: socket.user.id,
      name: socket.user.name,
      socketId: socket.id,
      isMuted: false,
      isSpeaking: false,
      joinedAt: new Date().toISOString(),
    }
    roomUsers[rid].set(socket.id, userData)
    socket.currentRoom = rid  // always string — matches roomUsers key
    socket.to(rid).emit('user-joined', userData)
    socket.emit('room-participants', Array.from(roomUsers[rid].values()))
    console.log(`👤 ${socket.user.name} joined room ${rid} (${roomUsers[rid].size} total)`)
  })

  socket.on('leave-room', ({ roomId }) => {
    _leaveRoom(socket, String(roomId))
  })

  socket.on('chat-message', ({ roomId, message }) => {
    if (!roomId || !message?.trim()) return
    const payload = {
      id: `${socket.id}-${Date.now()}`,
      userId: socket.user.id,
      name: socket.user.name,
      message: message.trim().slice(0, 500),
      timestamp: new Date().toISOString(),
    }
    io.to(String(roomId)).emit('chat-message', payload)
  })

  socket.on('toggle-mute', ({ roomId, isMuted }) => {
    if (!roomId || !roomUsers[roomId]) return
    const user = roomUsers[roomId].get(socket.id)
    if (user) {
      user.isMuted = isMuted
      socket.to(String(roomId)).emit('user-mute-changed', {
        socketId: socket.id,
        userId: socket.user.id,
        isMuted,
      })
    }
  })

  socket.on('speaking', ({ roomId, isSpeaking }) => {
    if (!roomId || !roomUsers[roomId]) return
    const user = roomUsers[roomId].get(socket.id)
    if (user) {
      user.isSpeaking = isSpeaking
      socket.to(String(roomId)).emit('user-speaking', {
        socketId: socket.id,
        userId: socket.user.id,
        isSpeaking,
      })
    }
  })

  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(String(roomId)).emit('user-typing', {
      userId: socket.user.id,
      name: socket.user.name,
      isTyping,
    })
  })

  // ── WebRTC signaling ────────────────────────────────────────────────────────
  socket.on('webrtc-offer', ({ to, offer }) => {
    console.log(`📨 Relaying offer from ${socket.id} to ${to}`)
    io.to(to).emit('webrtc-offer', { from: socket.id, offer })
  })

  socket.on('webrtc-answer', ({ to, answer }) => {
    console.log(`📨 Relaying answer from ${socket.id} to ${to}`)
    io.to(to).emit('webrtc-answer', { from: socket.id, answer })
  })

  socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate })
  })

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`)
    if (socket.currentRoom) {
      _leaveRoom(socket, socket.currentRoom)
    }
  })
})

function _leaveRoom(socket, roomId) {
  const rid = String(roomId) // always string to match roomUsers key
  socket.leave(rid)
  const room = roomUsers[rid]
  if (room && room.has(socket.id)) {
    const user = room.get(socket.id)
    room.delete(socket.id)
    // emit to everyone else STILL in the room
    socket.to(rid).emit('user-left', {
      socketId: socket.id,
      userId: user.userId,
      name: user.name,
    })
    console.log(`👋 ${user.name} left room ${rid} — ${room.size} remaining`)
    if (room.size === 0) {
      delete roomUsers[rid]
      console.log(`🗑️  Room ${rid} is now empty — cleaned up`)
    }
  } else {
    console.log(`⚠️  _leaveRoom called but ${socket.id} not found in room ${rid}`)
  }
}

// ─── Auto-close rooms after 12 hours ─────────────────────────────────────────
try {
  const cron = require('node-cron')
  const db = require('./config/db')
  const { safeCloseRoom } = require('./controllers/roomController')

  // Runs every 30 minutes — checks for rooms open longer than 12 hours
  cron.schedule('*/30 * * * *', async () => {
    try {
      const [expiredRooms] = await db.query(
        "SELECT id, title FROM rooms WHERE status != 'closed' AND created_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)"
      )
      if (expiredRooms.length === 0) return

      for (const room of expiredRooms) {
        try {
          await safeCloseRoom(room.id)
          io.to(String(room.id)).emit('room-closed', {
            message: `Room "${room.title}" was automatically closed after 12 hours.`
          })
          console.log(`⏰ Auto-closed room ${room.id}: "${room.title}"`)
        } catch (roomErr) {
          console.error(`⏰ Failed to auto-close room ${room.id}:`, roomErr.message)
        }
      }
      console.log(`⏰ Auto-close complete: ${expiredRooms.length} room(s) closed`)
    } catch (err) {
      console.error('Auto-close cron error:', err.message)
    }
  })
  console.log('⏰ Auto-close cron scheduled (every 30 min, 12h limit)')
} catch (e) {
  console.log('node-cron not installed, skipping auto-close:', e.message)
}

// ─── Express Middleware ───────────────────────────────────────────────────────
app.options('*', cors(corsOptions))
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/rooms', require('./routes/rooms'))
app.use('/api', require('./routes/general'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpeakCircle API is running 🎤', timestamp: new Date() })
})

app.get('/', (req, res) => {
  res.send('SpeakCircle Backend is running 🚀')
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 SpeakCircle server running on port ${PORT}`)
  console.log(`🔌 Socket.IO ready`)
})