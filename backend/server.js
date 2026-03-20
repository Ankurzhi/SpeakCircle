// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:5173',
//   credentials: true
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/rooms', require('./routes/rooms'));
// app.use('/api', require('./routes/general'));

// // Health check
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', message: 'SpeakCircle API is running 🎤' });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ success: false, message: 'Route not found' });
// });

// // Error handler
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ success: false, message: 'Internal server error' });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 SpeakCircle server running on port ${PORT}`);
// });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // Wrap express in http server

// ─── Socket.IO Setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,       // 60s before declaring client disconnected
  pingInterval: 25000,      // Send ping every 25s
  transports: ['websocket', 'polling'], // Try websocket first, fall back to polling
});

// ─── In-memory room state (fast, no DB round-trips for chat/mic) ─────────────
// roomUsers[roomId] = Map<socketId, { userId, name, avatar, isMuted, isSpeaking }>
const roomUsers = {};

// ─── Socket.IO Authentication Middleware ─────────────────────────────────────
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: no token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // attach user info to socket
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

// ─── Socket.IO Event Handlers ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id} | User: ${socket.user.name}`);

  // ── JOIN ROOM ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId }) => {
    if (!roomId) return;

    socket.join(roomId);

    // Initialize room map if needed
    if (!roomUsers[roomId]) roomUsers[roomId] = new Map();

    const userData = {
      userId: socket.user.id,
      name: socket.user.name,
      socketId: socket.id,
      isMuted: false,
      isSpeaking: false,
      joinedAt: new Date().toISOString(),
    };

    roomUsers[roomId].set(socket.id, userData);
    socket.currentRoom = roomId; // track for cleanup on disconnect

    // Tell everyone else in the room that a new user joined
    socket.to(roomId).emit('user-joined', userData);

    // Send the new user the current participant list
    socket.emit('room-participants', Array.from(roomUsers[roomId].values()));

    console.log(`👤 ${socket.user.name} joined room ${roomId}`);
  });

  // ── LEAVE ROOM ────────────────────────────────────────────────────────────
  socket.on('leave-room', ({ roomId }) => {
    _leaveRoom(socket, roomId);
  });

  // ── CHAT MESSAGE ─────────────────────────────────────────────────────────
  socket.on('chat-message', ({ roomId, message }) => {
    if (!roomId || !message?.trim()) return;

    const payload = {
      id: `${socket.id}-${Date.now()}`,
      userId: socket.user.id,
      name: socket.user.name,
      message: message.trim().slice(0, 500), // limit to 500 chars
      timestamp: new Date().toISOString(),
    };

    // Broadcast to EVERYONE in room (including sender)
    io.to(roomId).emit('chat-message', payload);
  });

  // ── MIC TOGGLE ───────────────────────────────────────────────────────────
  socket.on('toggle-mute', ({ roomId, isMuted }) => {
    if (!roomId || !roomUsers[roomId]) return;

    const user = roomUsers[roomId].get(socket.id);
    if (user) {
      user.isMuted = isMuted;
      socket.to(roomId).emit('user-mute-changed', {
        socketId: socket.id,
        userId: socket.user.id,
        isMuted,
      });
    }
  });

  // ── SPEAKING INDICATOR ────────────────────────────────────────────────────
  socket.on('speaking', ({ roomId, isSpeaking }) => {
    if (!roomId || !roomUsers[roomId]) return;

    const user = roomUsers[roomId].get(socket.id);
    if (user) {
      user.isSpeaking = isSpeaking;
      socket.to(roomId).emit('user-speaking', {
        socketId: socket.id,
        userId: socket.user.id,
        isSpeaking,
      });
    }
  });

  // ── TYPING INDICATOR ─────────────────────────────────────────────────────
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      userId: socket.user.id,
      name: socket.user.name,
      isTyping,
    });
  });

  // ── WebRTC SIGNALING (Peer-to-Peer Voice) ─────────────────────────────────
  // These relay WebRTC offers/answers/ICE candidates between peers
  socket.on('webrtc-offer', ({ to, offer }) => {
    io.to(to).emit('webrtc-offer', { from: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ to, answer }) => {
    io.to(to).emit('webrtc-answer', { from: socket.id, answer });
  });

  socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
    if (socket.currentRoom) {
      _leaveRoom(socket, socket.currentRoom);
    }
  });
});

// ─── Helper: remove user from room ───────────────────────────────────────────
function _leaveRoom(socket, roomId) {
  socket.leave(roomId);

  if (roomUsers[roomId]) {
    roomUsers[roomId].delete(socket.id);

    // Notify others
    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      userId: socket.user?.id,
      name: socket.user?.name,
    });

    // Clean up empty rooms
    if (roomUsers[roomId].size === 0) {
      delete roomUsers[roomId];
    }
  }

  console.log(`👋 ${socket.user?.name} left room ${roomId}`);
}

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api', require('./routes/general'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpeakCircle API is running 🎤' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SpeakCircle server running on port ${PORT}`);
  console.log(`🔌 Socket.IO is ready for real-time connections`);
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});