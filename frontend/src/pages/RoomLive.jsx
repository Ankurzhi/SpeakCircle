import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { joinRoom, completeSession, getRoom } from '../services/api'

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥']

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
      position: 'relative',
    }}>
      {p.name?.charAt(0).toUpperCase()}
      {p.handRaised && (
        <span style={{
          position: 'absolute', top: -6, right: -6, fontSize: 14,
          animation: 'wave 0.6s infinite alternate',
        }}>🖐</span>
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.name} {isMe && <span style={{ color: '#6366f1', fontSize: 11 }}>(you)</span>}
      </div>
      {p.isSpeaking && <div style={{ fontSize: 11, color: '#6366f1' }}>Speaking...</div>}
      {p.handRaised && !p.isSpeaking && <div style={{ fontSize: 11, color: '#f59e0b' }}>Hand raised</div>}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 14 }}>{p.isMuted ? '🔇' : '🎙️'}</span>
    </div>
  </div>
)

const ChatMessage = ({ msg, isMe, onReact, reactions }) => {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div
      style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 12 }}
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: isMe ? '#6366f1' : '#e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isMe ? '#fff' : '#475569', fontWeight: 700, fontSize: 12, flexShrink: 0,
      }}>
        {msg.name?.charAt(0).toUpperCase()}
      </div>
      <div style={{ maxWidth: '72%' }}>
        {!isMe && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{msg.name}</div>}
        <div style={{ position: 'relative' }}>
          <div style={{
            padding: '8px 12px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isMe ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#f1f5f9',
            color: isMe ? '#fff' : '#1e293b', fontSize: 14, lineHeight: 1.5,
            wordBreak: 'break-word',
          }}>
            {msg.message}
          </div>

          {/* Reaction picker */}
          {showPicker && (
            <div style={{
              position: 'absolute', [isMe ? 'right' : 'left']: 0, bottom: '100%', marginBottom: 4,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
              padding: '4px 8px', display: 'flex', gap: 4, zIndex: 10,
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
            }}>
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, padding: '2px 3px', borderRadius: 6,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reaction counts */}
        {reactions && Object.keys(reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {Object.entries(reactions).map(([emoji, count]) => (
              <span
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                style={{
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: '2px 7px', fontSize: 12,
                  cursor: 'pointer', userSelect: 'none',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                {emoji} <span style={{ fontWeight: 600 }}>{count}</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
          {fmtTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

// ─── Main RoomLive Component ──────────────────────────────────────────────────
const RoomLive = () => {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, connected } = useSocket()

  // State
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [messageReactions, setMessageReactions] = useState({}) // { msgId: { emoji: count } }
  const [inputMsg, setInputMsg] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [sessionStart] = useState(Date.now())
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [handRaised, setHandRaised] = useState(false)

  // Refs
  const messagesEndRef = useRef(null)
  const typingTimeout = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef({})
  // ✅ FIX: Keep a live ref of participants to avoid stale closures in async callbacks
  const participantsRef = useRef([])

  // Keep participantsRef in sync with state
  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  // WebRTC config
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:443',
          'turn:a.relay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10,
  }

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Join room via REST then socket ────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !user) return

    getRoom(roomId)
      .then(r => setRoomInfo(r.data.room))
      .catch(() => {})

    joinRoom(roomId)
      .then(() => setJoined(true))
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not join room')
      })

    return () => {
      stopVoice()
    }
  }, [roomId, user])

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !joined || !roomId) return

    socket.emit('join-room', { roomId })

    socket.on('room-participants', (list) => {
      setParticipants(list)
    })

    socket.on('user-joined', (userData) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === userData.socketId)) return prev
        return [...prev, userData]
      })
      addSystemMessage(`${userData.name} joined the room`)

      // ✅ FIX: Add 500ms delay so the new peer's socket is fully ready before
      //         sending a WebRTC offer. This ensures 3+ person calls work reliably.
      if (localStreamRef.current) {
        setTimeout(() => callPeer(userData.socketId, localStreamRef.current), 500)
      }
    })

    socket.on('user-left', ({ socketId, name }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
      closePeer(socketId)
      addSystemMessage(`${name} left the room`)
    })

    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'chat' }])
    })

    socket.on('user-mute-changed', ({ socketId, isMuted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMuted } : p))
      )
    })

    socket.on('user-speaking', ({ socketId, isSpeaking }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isSpeaking } : p))
      )
    })

    socket.on('user-typing', ({ userId, name, isTyping }) => {
      if (userId === user.id) return
      setTypingUsers((prev) =>
        isTyping
          ? prev.includes(name) ? prev : [...prev, name]
          : prev.filter((n) => n !== name)
      )
    })

    socket.on('user-hand-raised', ({ socketId, handRaised }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, handRaised } : p))
      )
    })

    // ✅ FIX: Reactions now update from server broadcast (not local state only)
    socket.on('message-reaction', ({ messageId, reactions }) => {
      setMessageReactions(prev => ({ ...prev, [messageId]: reactions }))
    })

    // ── WebRTC Signaling ──────────────────────────────────────────────────
    socket.on('webrtc-offer', async ({ from, offer }) => {
      if (!localStreamRef.current) return
      const pc = createPeer(from)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc-answer', { to: from, answer })
      } catch (e) {
        console.error('Error handling offer:', e)
      }
    })

    socket.on('webrtc-answer', async ({ from, answer }) => {
      const pc = peersRef.current[from]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (e) {
          console.error('Error setting answer:', e)
        }
      }
    })

    socket.on('webrtc-ice-candidate', ({ from, candidate }) => {
      const pc = peersRef.current[from]
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e =>
          console.warn('ICE candidate error:', e)
        )
      }
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
      socket.off('user-hand-raised')
      socket.off('message-reaction')
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
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted
      })
    }
    socket?.emit('toggle-mute', { roomId, isMuted: newMuted })
  }

  // ── Raise hand ────────────────────────────────────────────────────────────
  const toggleHand = () => {
    const newState = !handRaised
    setHandRaised(newState)
    socket?.emit('raise-hand', { roomId, handRaised: newState })
    if (newState) addSystemMessage('You raised your hand ✋')
  }

  // ── Message reaction ──────────────────────────────────────────────────────
  const handleReact = (messageId, emoji) => {
    socket?.emit('message-reaction', { roomId, messageId, emoji })
  }

  // ── WebRTC: get microphone & call all existing participants ───────────────
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      })
      localStreamRef.current = stream
      setVoiceEnabled(true)
      setupVoiceActivityDetection(stream)

      // ✅ FIX: Use participantsRef (not stale `participants` from closure)
      //         This ensures we call ALL current participants when joining voice mid-session
      participantsRef.current.forEach((p) => {
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
    Object.keys(peersRef.current).forEach(closePeer)
    setVoiceEnabled(false)
  }

  // ── Create RTCPeerConnection ──────────────────────────────────────────────
  const createPeer = (remoteSocketId) => {
    if (peersRef.current[remoteSocketId]) {
      peersRef.current[remoteSocketId].close()
    }

    const pc = new RTCPeerConnection(rtcConfig)
    peersRef.current[remoteSocketId] = pc

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current))
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc-ice-candidate', { to: remoteSocketId, candidate: e.candidate })
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        console.warn('ICE failed — restarting...')
        pc.restartIce()
      }
    }

    pc.ontrack = (e) => {
      const audioEl = new Audio()
      audioEl.srcObject = e.streams[0]
      audioEl.autoplay = true
      audioEl.id = `audio-${remoteSocketId}`
      const existing = document.getElementById(`audio-${remoteSocketId}`)
      if (existing) existing.remove()
      document.body.appendChild(audioEl)
    }

    return pc
  }

  const callPeer = async (remoteSocketId, stream) => {
    if (!stream) return
    const pc = createPeer(remoteSocketId)
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket?.emit('webrtc-offer', { to: remoteSocketId, offer })
    } catch (e) {
      console.error('Error creating offer:', e)
    }
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

  // ── Voice activity detection ──────────────────────────────────────────────
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
      // AudioContext not supported
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

      <style>{`
        @keyframes wave {
          from { transform: rotate(-15deg); }
          to   { transform: rotate(15deg); }
        }
      `}</style>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            boxShadow: connected ? '0 0 0 3px rgba(34,197,94,0.3)' : 'none',
          }} />
          <div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              {roomInfo ? roomInfo.title : `Room #${roomId}`}
            </span>
            {roomInfo && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>
                {roomInfo.topic}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Raise hand */}
          <button
            onClick={toggleHand}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: handRaised ? '#f59e0b' : 'rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
            {handRaised ? '✋ Lower Hand' : '🖐 Raise Hand'}
          </button>

          {/* Mute */}
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
            PARTICIPANTS ({participants.length + 1})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Self */}
            <ParticipantCard
              p={{
                name: user?.name,
                isMuted,
                isSpeaking: false,
                socketId: socket?.id,
                handRaised,
              }}
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
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isMe={msg.userId === user?.id}
                  onReact={handleReact}
                  reactions={messageReactions[msg.id]}
                />
              )
            )}
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