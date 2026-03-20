import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { joinRoom, completeSession } from '../services/api'

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ParticipantCard = ({ p, isMe }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
    borderRadius: 12, background: p.isSpeaking ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.03)',
    border: `1.5px solid ${p.isSpeaking ? '#6366f1' : 'transparent'}`,
    transition: 'all 0.2s',
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
      boxShadow: p.isSpeaking ? '0 0 0 3px rgba(99,102,241,0.4)' : 'none',
    }}>
      {p.name?.charAt(0).toUpperCase()}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.name} {isMe && <span style={{ color: '#6366f1', fontSize: 11 }}>(you)</span>}
      </div>
      {p.isSpeaking && <div style={{ fontSize: 11, color: '#6366f1' }}>Speaking...</div>}
    </div>
    <span style={{ fontSize: 16 }}>{p.isMuted ? '🔇' : '🎙️'}</span>
  </div>
)

const ChatMessage = ({ msg, isMe }) => (
  <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 12 }}>
    <div style={{
      width: 30, height: 30, borderRadius: '50%', background: isMe ? '#6366f1' : '#e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: isMe ? '#fff' : '#475569', fontWeight: 700, fontSize: 12, flexShrink: 0,
    }}>
      {msg.name?.charAt(0).toUpperCase()}
    </div>
    <div style={{ maxWidth: '72%' }}>
      {!isMe && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{msg.name}</div>}
      <div style={{
        padding: '8px 12px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isMe ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#f1f5f9',
        color: isMe ? '#fff' : '#1e293b', fontSize: 14, lineHeight: 1.5,
        wordBreak: 'break-word',
      }}>
        {msg.message}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
        {fmtTime(msg.timestamp)}
      </div>
    </div>
  </div>
)

// ─── Main RoomLive Component ──────────────────────────────────────────────────
const RoomLive = () => {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, connected } = useSocket()

  // State
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [sessionStart] = useState(Date.now())
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  // Refs
  const messagesEndRef = useRef(null)
  const typingTimeout = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef({}) // socketId -> RTCPeerConnection

  // WebRTC config (STUN for NAT traversal)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Join room via REST then socket ────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !user) return

    joinRoom(roomId)
      .then(() => {
        setJoined(true)
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not join room')
      })

    return () => {
      // Clean up voice on unmount
      stopVoice()
    }
  }, [roomId, user])

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !joined || !roomId) return

    // Join the socket room
    socket.emit('join-room', { roomId })

    // Receive current participant list on first join
    socket.on('room-participants', (list) => {
      setParticipants(list)
    })

    // New user joined
    socket.on('user-joined', (userData) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === userData.socketId)) return prev
        return [...prev, userData]
      })
      addSystemMessage(`${userData.name} joined the room`)
    })

    // User left
    socket.on('user-left', ({ socketId, name }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
      closePeer(socketId)
      addSystemMessage(`${name} left the room`)
    })

    // Incoming chat message
    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'chat' }])
    })

    // Mute state changes
    socket.on('user-mute-changed', ({ socketId, isMuted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMuted } : p))
      )
    })

    // Speaking indicator
    socket.on('user-speaking', ({ socketId, isSpeaking }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isSpeaking } : p))
      )
    })

    // Typing indicator
    socket.on('user-typing', ({ userId, name, isTyping }) => {
      if (userId === user.id) return
      setTypingUsers((prev) =>
        isTyping
          ? prev.includes(name) ? prev : [...prev, name]
          : prev.filter((n) => n !== name)
      )
    })

    // ── WebRTC Signaling ────────────────────────────────────────────────────
    socket.on('webrtc-offer', async ({ from, offer }) => {
      if (!localStreamRef.current) return
      const pc = createPeer(from)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('webrtc-answer', { to: from, answer })
    })

    socket.on('webrtc-answer', async ({ from, answer }) => {
      const pc = peersRef.current[from]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    socket.on('webrtc-ice-candidate', ({ from, candidate }) => {
      const pc = peersRef.current[from]
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    return () => {
      socket.emit('leave-room', { roomId })
      socket.off('room-participants')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('chat-message')
      socket.off('user-mute-changed')
      socket.off('user-speaking')
      socket.off('user-typing')
      socket.off('webrtc-offer')
      socket.off('webrtc-answer')
      socket.off('webrtc-ice-candidate')
    }
  }, [socket, joined, roomId])

  // ── Helper: system message ────────────────────────────────────────────────
  const addSystemMessage = (text) => {
    setMessages((prev) => [...prev, {
      id: Date.now(),
      type: 'system',
      message: text,
      timestamp: new Date().toISOString(),
    }])
  }

  // ── Send chat message ─────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!inputMsg.trim() || !socket) return
    socket.emit('chat-message', { roomId, message: inputMsg })
    setInputMsg('')
    socket.emit('typing', { roomId, isTyping: false })
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTyping = (e) => {
    setInputMsg(e.target.value)
    if (!socket) return
    socket.emit('typing', { roomId, isTyping: true })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false })
    }, 1500)
  }

  // ── Toggle mute ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)

    // Mute actual audio track
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted
      })
    }

    socket?.emit('toggle-mute', { roomId, isMuted: newMuted })
  }

  // ── WebRTC: get microphone & call all existing participants ───────────────
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setVoiceEnabled(true)

      // Set up voice activity detection
      setupVoiceActivityDetection(stream)

      // Call every existing participant
      participants.forEach((p) => {
        if (p.socketId !== socket?.id) {
          callPeer(p.socketId, stream)
        }
      })
    } catch (err) {
      alert('Microphone access denied. Please allow mic access to use voice chat.')
    }
  }

  const stopVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    // Close all peer connections
    Object.keys(peersRef.current).forEach(closePeer)
    setVoiceEnabled(false)
  }

  // ── Create RTCPeerConnection ──────────────────────────────────────────────
  const createPeer = (remoteSocketId) => {
    const pc = new RTCPeerConnection(rtcConfig)
    peersRef.current[remoteSocketId] = pc

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current))
    }

    // Send ICE candidates to the remote peer via socket
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc-ice-candidate', { to: remoteSocketId, candidate: e.candidate })
      }
    }

    // Play remote audio when track received
    pc.ontrack = (e) => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.autoplay = true
      audio.id = `audio-${remoteSocketId}`
      // Replace if already exists
      const existing = document.getElementById(`audio-${remoteSocketId}`)
      if (existing) existing.remove()
      document.body.appendChild(audio)
    }

    return pc
  }

  const callPeer = async (remoteSocketId, stream) => {
    const pc = createPeer(remoteSocketId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket?.emit('webrtc-offer', { to: remoteSocketId, offer })
  }

  const closePeer = (socketId) => {
    const pc = peersRef.current[socketId]
    if (pc) {
      pc.close()
      delete peersRef.current[socketId]
    }
    const audio = document.getElementById(`audio-${socketId}`)
    if (audio) audio.remove()
  }

  // ── Voice activity detection (speaking indicator) ─────────────────────────
  const setupVoiceActivityDetection = (stream) => {
    try {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      const src = ctx.createMediaStreamSource(stream)
      src.connect(analyser)
      analyser.fftSize = 512

      const data = new Uint8Array(analyser.frequencyBinCount)
      let speakingState = false

      const check = () => {
        if (!localStreamRef.current) return
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const nowSpeaking = avg > 20

        if (nowSpeaking !== speakingState) {
          speakingState = nowSpeaking
          socket?.emit('speaking', { roomId, isSpeaking: nowSpeaking })
        }
        requestAnimationFrame(check)
      }
      check()
    } catch (e) {
      // AudioContext not supported, skip
    }
  }

  // ── Leave room ────────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    stopVoice()
    const durationMin = Math.round((Date.now() - sessionStart) / 60000)
    if (durationMin >= 1) {
      await completeSession({ room_id: roomId, duration_minutes: durationMin }).catch(() => {})
    }
    navigate('/rooms')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <h4>{error}</h4>
        <button className="btn-primary-sc" onClick={() => navigate('/rooms')}>Back to Rooms</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            boxShadow: connected ? '0 0 0 3px rgba(34,197,94,0.3)' : 'none',
          }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Room #{roomId}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Mute button */}
          <button
            onClick={toggleMute}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
            {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
          </button>
          {/* Voice toggle */}
          <button
            onClick={voiceEnabled ? stopVoice : startVoice}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: voiceEnabled ? '#6366f1' : 'rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
            {voiceEnabled ? '🔊 Voice On' : '🎧 Join Voice'}
          </button>
          {/* Leave */}
          <button
            onClick={leaveRoom}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
            Leave
          </button>
        </div>
      </div>

      {/* ── Main Body ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: Participants ──────────────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: '1px solid #e2e8f0',
          background: '#fff', padding: 16, overflowY: 'auto',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, letterSpacing: 1 }}>
            PARTICIPANTS ({participants.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Self */}
            <ParticipantCard
              p={{ name: user?.name, isMuted, isSpeaking: false, socketId: socket?.id }}
              isMe
            />
            {/* Others */}
            {participants
              .filter((p) => p.userId !== user?.id)
              .map((p) => (
                <ParticipantCard key={p.socketId} p={p} isMe={false} />
              ))}
          </div>
        </div>

        {/* ── Right: Chat ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💬</div>
                <p>No messages yet. Say hello!</p>
              </div>
            )}
            {messages.map((msg) =>
              msg.type === 'system' ? (
                <div key={msg.id} style={{
                  textAlign: 'center', fontSize: 12, color: '#94a3b8',
                  margin: '8px 0', padding: '4px 12px', background: '#f1f5f9',
                  borderRadius: 20, display: 'inline-block', width: '100%',
                }}>
                  {msg.message}
                </div>
              ) : (
                <ChatMessage key={msg.id} msg={msg} isMe={msg.userId === user?.id} />
              )
            )}
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #e2e8f0',
            background: '#fff', display: 'flex', gap: 10, alignItems: 'flex-end',
          }}>
            <textarea
              value={inputMsg}
              onChange={handleTyping}
              onKeyDown={handleInputKeyDown}
              placeholder="Type a message... (Enter to send)"
              rows={1}
              style={{
                flex: 1, resize: 'none', border: '1.5px solid #e2e8f0',
                borderRadius: 12, padding: '10px 14px', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
                maxHeight: 80, overflowY: 'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMsg.trim()}
              style={{
                padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: inputMsg.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#e2e8f0',
                color: inputMsg.trim() ? '#fff' : '#94a3b8',
                fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
              }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomLive