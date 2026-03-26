import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { joinRoom, completeSession, getRoom } from '../services/api'

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const ParticipantCard = ({ p, isMe }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
    borderRadius: 10,
    background: p.isSpeaking ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.03)',
    border: `1.5px solid ${p.isSpeaking ? '#6366f1' : 'transparent'}`,
    transition: 'all 0.2s',
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg,#6366f1,#a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
      boxShadow: p.isSpeaking ? '0 0 0 3px rgba(99,102,241,0.4)' : 'none',
    }}>
      {p.name?.charAt(0).toUpperCase()}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.name} {isMe && <span style={{ color: '#6366f1', fontSize: 10 }}>(you)</span>}
      </div>
      {p.isSpeaking && <div style={{ fontSize: 10, color: '#6366f1' }}>Speaking...</div>}
    </div>
    <span style={{ fontSize: 14 }}>{p.isMuted ? '🔇' : '🎙️'}</span>
  </div>
)

const ChatMessage = ({ msg, isMe }) => (
  <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 6, marginBottom: 10 }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: isMe ? '#6366f1' : '#e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: isMe ? '#fff' : '#475569', fontWeight: 700, fontSize: 11, flexShrink: 0,
    }}>
      {msg.name?.charAt(0).toUpperCase()}
    </div>
    <div style={{ maxWidth: '75%' }}>
      {!isMe && <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{msg.name}</div>}
      <div style={{
        padding: '7px 11px',
        borderRadius: isMe ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
        background: isMe ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#f1f5f9',
        color: isMe ? '#fff' : '#1e293b', fontSize: 13, lineHeight: 1.5,
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

// ─── Main Component ───────────────────────────────────────────────────────────
const RoomLive = () => {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, connected } = useSocket()

  // ── State ──────────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [sessionStart] = useState(Date.now())
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [showParticipants, setShowParticipants] = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null)
  const typingTimeout = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef({}) // socketId -> RTCPeerConnection

  // ── WebRTC Config (STUN + TURN for reliable NAT traversal) ─────────────────
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
    iceCandidatePoolSize: 10,
  }

  // ── Scroll to bottom on new message ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Join room via REST, then socket ───────────────────────────────────────
  useEffect(() => {
    if (!roomId || !user) return

    // Fetch room title + topic for the top bar
    getRoom(roomId)
      .then(r => setRoomInfo(r.data.room))
      .catch(() => {})

    joinRoom(roomId)
      .then(() => setJoined(true))
      .catch((err) => setError(err.response?.data?.message || 'Could not join room'))

    return () => {
      stopVoice()
    }
  }, [roomId, user])

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !joined || !roomId) return

    socket.emit('join-room', { roomId })

    // Full participant list on first join
    socket.on('room-participants', (list) => setParticipants(list))

    // New user joined — add to list, show message, and call if in voice
    socket.on('user-joined', (userData) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === userData.socketId)) return prev
        return [...prev, userData]
      })
      addSystemMessage(`${userData.name} joined the room`)
      // If we are already in voice, call the new participant immediately
      if (localStreamRef.current) {
        callPeer(userData.socketId, localStreamRef.current)
      }
    })

    // User left — remove from list, close peer connection
    socket.on('user-left', ({ socketId, name }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
      closePeer(socketId)
      addSystemMessage(`${name} left the room`)
    })

    // Incoming chat message
    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'chat' }])
    })

    // Mute state changes from other users
    socket.on('user-mute-changed', ({ socketId, isMuted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMuted } : p))
      )
    })

    // Speaking indicator from other users
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

    // Room forcibly closed by host/server
    socket.on('room-closed', ({ message }) => {
      alert(message)
      navigate('/rooms')
    })

    // ── WebRTC Signaling ────────────────────────────────────────────────────

    // Incoming call offer from another peer
    socket.on('webrtc-offer', async ({ from, offer }) => {
      if (!localStreamRef.current) return
      const pc = createPeer(from)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('webrtc-answer', { to: from, answer })
    })

    // Answer from the peer we called
    socket.on('webrtc-answer', async ({ from, answer }) => {
      const pc = peersRef.current[from]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    // ICE candidate from any peer
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
      socket.off('room-closed')
      socket.off('webrtc-offer')
      socket.off('webrtc-answer')
      socket.off('webrtc-ice-candidate')
    }
  }, [socket, joined, roomId])

  // ── System message helper ──────────────────────────────────────────────────
  const addSystemMessage = (text) => {
    setMessages((prev) => [...prev, {
      id: Date.now(),
      type: 'system',
      message: text,
      timestamp: new Date().toISOString(),
    }])
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!inputMsg.trim() || !socket) return
    socket.emit('chat-message', { roomId, message: inputMsg })
    setInputMsg('')
    socket.emit('typing', { roomId, isTyping: false })
  }, [inputMsg, socket, roomId])

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

  // ── Mute toggle ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !newMuted })
    }
    socket?.emit('toggle-mute', { roomId, isMuted: newMuted })
  }, [isMuted, socket, roomId])

  // ── Voice: start (get mic + call all existing participants) ────────────────
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
      // Call every participant already in the room
      participants.forEach((p) => {
        if (p.socketId !== socket?.id) callPeer(p.socketId, stream)
      })
    } catch (err) {
      alert('Microphone access denied. Please allow mic access to use voice chat.')
    }
  }

  // ── Voice: stop ────────────────────────────────────────────────────────────
  const stopVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    Object.keys(peersRef.current).forEach(closePeer)
    setVoiceEnabled(false)
  }

  // ── WebRTC: create peer connection ─────────────────────────────────────────
  const createPeer = (remoteSocketId) => {
    const pc = new RTCPeerConnection(rtcConfig)
    peersRef.current[remoteSocketId] = pc

    // Add local audio tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current))
    }

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc-ice-candidate', { to: remoteSocketId, candidate: e.candidate })
      }
    }

    // Play remote audio as soon as we receive the track
    pc.ontrack = (e) => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.autoplay = true
      audio.id = `audio-${remoteSocketId}`
      const existing = document.getElementById(`audio-${remoteSocketId}`)
      if (existing) existing.remove()
      document.body.appendChild(audio)
    }

    // Restart ICE automatically if connection fails
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${remoteSocketId} state: ${pc.connectionState}`)
      if (pc.connectionState === 'failed') {
        console.log('Connection failed — restarting ICE...')
        pc.restartIce()
      }
    }

    return pc
  }

  // ── WebRTC: call a peer (close duplicate first) ────────────────────────────
  const callPeer = async (remoteSocketId, stream) => {
    // Close any existing connection to this peer before re-calling
    if (peersRef.current[remoteSocketId]) closePeer(remoteSocketId)
    const pc = createPeer(remoteSocketId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket?.emit('webrtc-offer', { to: remoteSocketId, offer })
  }

  // ── WebRTC: close a peer connection ───────────────────────────────────────
  const closePeer = (socketId) => {
    const pc = peersRef.current[socketId]
    if (pc) { pc.close(); delete peersRef.current[socketId] }
    const audio = document.getElementById(`audio-${socketId}`)
    if (audio) audio.remove()
  }

  // ── Voice activity detection (speaking indicator) ──────────────────────────
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
      // AudioContext not supported — skip VAD silently
    }
  }

  // ── Leave room ─────────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    stopVoice()
    const durationMin = Math.round((Date.now() - sessionStart) / 60000)
    if (durationMin >= 1) {
      await completeSession({ room_id: roomId, duration_minutes: durationMin }).catch(() => {})
    }
    navigate('/rooms')
  }

  // ── Error screen ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20 }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <h4 style={{ textAlign: 'center' }}>{error}</h4>
        <button className="btn-primary-sc" onClick={() => navigate('/rooms')}>Back to Rooms</button>
      </div>
    )
  }

  const totalParticipants = participants.filter(p => p.userId !== user?.id).length + 1

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .room-layout { height: 100dvh; display: flex; flex-direction: column; background: #f8fafc; overflow: hidden; }
        .room-topbar { background: linear-gradient(135deg,#0f172a,#1e3a5f); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 8px; }
        .room-body { flex: 1; display: flex; overflow: hidden; position: relative; }
        .participants-panel { width: 200px; flex-shrink: 0; border-right: 1px solid #e2e8f0; background: #fff; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .chat-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 12px 14px; -webkit-overflow-scrolling: touch; }
        .chat-input-bar { padding: 10px 12px; border-top: 1px solid #e2e8f0; background: #fff; display: flex; gap: 8px; align-items: flex-end; }
        .topbar-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
        .topbar-right { display: flex; gap: 6px; flex-shrink: 0; }
        .btn-bar { padding: 6px 10px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; }
        .room-title { color: #fff; font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .room-topic { color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .participants-toggle { display: none; }
        .mobile-drawer-overlay { display: none; }
        @media (max-width: 640px) {
          .participants-panel { display: none !important; }
          .participants-toggle { display: flex !important; align-items: center; gap: 4px; }
          .mobile-drawer-overlay { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100; }
          .mobile-drawer-inner { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 20px 20px 0 0; padding: 16px; max-height: 60vh; overflow-y: auto; }
          .room-title { max-width: 100px; font-size: 12px; }
          .btn-bar { padding: 5px 8px; font-size: 11px; }
          .chat-messages { padding: 8px 10px; }
        }
      `}</style>

      <div className="room-layout">

        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <div className="room-topbar">
          <div className="topbar-left">
            {/* Connection status dot */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none',
            }} />
            {/* Room title + topic */}
            <div style={{ minWidth: 0 }}>
              <div className="room-title">{roomInfo ? roomInfo.title : `Room #${roomId}`}</div>
              {roomInfo && <div className="room-topic">{roomInfo.topic}</div>}
            </div>
            {/* Mobile: participants drawer button */}
            <button
              className="participants-toggle btn-bar"
              onClick={() => setShowParticipants(true)}
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              👥 {totalParticipants}
            </button>
            {/* Desktop: participant count text */}
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }} className="hide-mobile">
              {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="topbar-right">
            {/* Mute toggle */}
            <button
              className="btn-bar"
              onClick={toggleMute}
              style={{ background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)' }}>
              {isMuted ? '🔇' : '🎙️'}
            </button>
            {/* Voice join/leave */}
            <button
              className="btn-bar"
              onClick={voiceEnabled ? stopVoice : startVoice}
              style={{ background: voiceEnabled ? '#6366f1' : 'rgba(255,255,255,0.15)' }}>
              {voiceEnabled ? '🔊' : '🎧'}
            </button>
            {/* Leave room */}
            <button className="btn-bar" onClick={leaveRoom} style={{ background: '#ef4444' }}>
              Leave
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="room-body">

          {/* Desktop: participants sidebar */}
          <div className="participants-panel">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: 1 }}>
              PARTICIPANTS ({totalParticipants})
            </div>
            <ParticipantCard
              p={{ name: user?.name, isMuted, isSpeaking: false, socketId: socket?.id }}
              isMe
            />
            {participants.filter((p) => p.userId !== user?.id).map((p) => (
              <ParticipantCard key={p.socketId} p={p} isMe={false} />
            ))}
          </div>

          {/* Mobile: participants bottom drawer */}
          {showParticipants && (
            <div className="mobile-drawer-overlay" onClick={() => setShowParticipants(false)}>
              <div className="mobile-drawer-inner" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Participants ({totalParticipants})</span>
                  <button onClick={() => setShowParticipants(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ParticipantCard
                    p={{ name: user?.name, isMuted, isSpeaking: false, socketId: socket?.id }}
                    isMe
                  />
                  {participants.filter((p) => p.userId !== user?.id).map((p) => (
                    <ParticipantCard key={p.socketId} p={p} isMe={false} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Chat panel ──────────────────────────────────────────────── */}
          <div className="chat-panel">
            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                  <p style={{ fontSize: 13 }}>No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map((msg) =>
                msg.type === 'system' ? (
                  <div key={msg.id} style={{
                    textAlign: 'center', fontSize: 11, color: '#94a3b8',
                    margin: '6px 0', padding: '3px 10px', background: '#f1f5f9',
                    borderRadius: 20, display: 'inline-block', width: '100%',
                  }}>
                    {msg.message}
                  </div>
                ) : (
                  <ChatMessage key={msg.id} msg={msg} isMe={msg.userId === user?.id} />
                )
              )}
              {typingUsers.length > 0 && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="chat-input-bar">
              <textarea
                value={inputMsg}
                onChange={handleTyping}
                onKeyDown={handleInputKeyDown}
                placeholder="Type a message..."
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: '1.5px solid #e2e8f0',
                  borderRadius: 10, padding: '9px 12px', fontSize: 14,
                  fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
                  maxHeight: 80, overflowY: 'auto',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMsg.trim()}
                style={{
                  padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: inputMsg.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#e2e8f0',
                  color: inputMsg.trim() ? '#fff' : '#94a3b8',
                  fontSize: 16, fontWeight: 700, flexShrink: 0,
                }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default RoomLive