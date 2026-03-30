const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://speak-circle-eight.vercel.app',
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  },
});

// ─── In-memory room state ────────────────────────────────────────────────────
// roomUsers[roomId]     = Map<socketId, { userId, name, isMuted, isSpeaking, ... }>
// roomReactions[roomId] = { [messageId]: { [emoji]: count } }
const roomUsers = {};
const roomReactions = {}; // ✅ NEW: stores reaction counts per message per room

// ─── Socket.IO Authentication Middleware ─────────────────────────────────────
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: no token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
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

    if (!roomUsers[roomId]) roomUsers[roomId] = new Map();
    if (!roomReactions[roomId]) roomReactions[roomId] = {}; // ✅ init reactions store

    const userData = {
      userId: socket.user.id,
      name: socket.user.name,
      socketId: socket.id,
      isMuted: false,
      isSpeaking: false,
      joinedAt: new Date().toISOString(),
    };

    roomUsers[roomId].set(socket.id, userData);
    socket.currentRoom = roomId;

    socket.to(roomId).emit('user-joined', userData);
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
      message: message.trim().slice(0, 500),
      timestamp: new Date().toISOString(),
    };

    io.to(roomId).emit('chat-message', payload);
  });

  // ── MESSAGE REACTION ─────────────────────────────────────────────────────
  // ✅ NEW: This was missing — without this, reactions only updated locally
  //         and were never broadcast to other users in the room.
  socket.on('message-reaction', ({ roomId, messageId, emoji }) => {
    if (!roomId || !messageId || !emoji) return;

    // Init nested objects if needed
    if (!roomReactions[roomId]) roomReactions[roomId] = {};
    if (!roomReactions[roomId][messageId]) roomReactions[roomId][messageId] = {};

    const reactions = roomReactions[roomId][messageId];
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    // Broadcast updated reaction counts to EVERYONE in room (including sender)
    io.to(roomId).emit('message-reaction', {
      messageId,
      emoji,
      reactions: { ...reactions },
    });
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

  // ── RAISE HAND ────────────────────────────────────────────────────────────
  socket.on('raise-hand', ({ roomId, handRaised }) => {
    if (!roomId || !roomUsers[roomId]) return;

    const user = roomUsers[roomId].get(socket.id);
    if (user) {
      user.handRaised = handRaised;
      socket.to(roomId).emit('user-hand-raised', {
        socketId: socket.id,
        userId: socket.user.id,
        handRaised,
      });
    }
  });

  // ── WebRTC SIGNALING ──────────────────────────────────────────────────────
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

    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      userId: socket.user?.id,
      name: socket.user?.name,
    });

    // ✅ Clean up both roomUsers AND roomReactions when room is empty
    if (roomUsers[roomId].size === 0) {
      delete roomUsers[roomId];
      delete roomReactions[roomId];
    }
  }

  console.log(`👋 ${socket.user?.name} left room ${roomId}`);
}

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://speak-circle-eight.vercel.app',
    process.env.CLIENT_URL,
  ].filter(Boolean),
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

app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
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