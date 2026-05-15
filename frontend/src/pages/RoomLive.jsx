import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { joinRoom, completeSession, getRoom, getLiveKitToken } from '../services/api'
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants } from '@livekit/components-react'
import '@livekit/components-styles'

const fmtTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

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

// ── LiveKitSync: must be inside <LiveKitRoom> to use LiveKit hooks ────────────
// Handles mute sync AND speaking indicators using LiveKit's built-in server-side VAD
const LiveKitSync = ({ isMuted, onSpeakingChange, onSelfSpeaking }) => {
  const { localParticipant } = useLocalParticipant()
  const lkParticipants = useParticipants()

  // Sync mute button -> LiveKit
  useEffect(() => {
    if (!localParticipant) return
    localParticipant.setMicrophoneEnabled(!isMuted)
  }, [isMuted, localParticipant])

  // Sync LiveKit speaking state -> participant cards
  // LiveKit does server-side VAD so isSpeaking is accurate and works for everyone
  // participant.identity = the userId string we set when generating the token
  useEffect(() => {
    if (!lkParticipants) return
    const map = {}
    lkParticipants.forEach(p => { map[String(p.identity)] = p.isSpeaking })
    onSpeakingChange(map)
  }, [lkParticipants.map(p => p.identity + ':' + p.isSpeaking).join(',')])

  // Track your own speaking state for your card
  useEffect(() => {
    if (!localParticipant) return
    onSelfSpeaking(!!localParticipant.isSpeaking)
  }, [localParticipant?.isSpeaking])

  return null
}

// ── Main Component ────────────────────────────────────────────────────────────
const RoomLive = () => {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, connected } = useSocket()

  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [sessionStart] = useState(Date.now())
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [showParticipants, setShowParticipants] = useState(false)

  // LiveKit voice state
  // Single voice state object — batched updates prevent the re-render loop
  // where onDisconnected fires multiple setState calls causing LiveKitRoom to remount
  const [voice, setVoice] = useState({ enabled: false, token: null, url: null, loading: false, error: null })
  // Track which roomId this voice session belongs to
  const voiceRoomRef = useRef(null)
  // Convenience aliases so existing JSX doesn't need changing
  const voiceEnabled = voice.enabled
  const livekitToken = voice.token
  const livekitUrl = voice.url
  const voiceLoading = voice.loading
  const voiceError = voice.error
  const setVoiceError = (msg) => setVoice(v => ({ ...v, error: msg }))
  // LiveKit speaking indicators — keyed by userId string
  const [speakingMap, setSpeakingMap] = useState({})
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false)

  // Callbacks passed to LiveKitSync (must be stable references to avoid loop)
  const onSpeakingChange = (map) => setSpeakingMap(map)
  const onSelfSpeaking = (val) => setIsSelfSpeaking(val)

  const messagesEndRef = useRef(null)
  const typingTimeout = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!roomId || !user) return
    getRoom(roomId).then(r => setRoomInfo(r.data.room)).catch(() => {})
    joinRoom(roomId)
      .then(() => setJoined(true))
      .catch((err) => setError(err.response?.data?.message || 'Could not join room'))
  }, [roomId, user])

  useEffect(() => {
    if (!socket || !joined || !roomId) return

    socket.emit('join-room', { roomId: String(roomId) })

    // room-participants: server sends full list including self — filter self out
    socket.on('room-participants', (list) => {
      setParticipants(list.filter(p => p.userId != user?.id))
    })

    socket.on('user-joined', (userData) => {
      if (userData.userId == user?.id) return // ignore own join echo
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === userData.socketId)) return prev
        return [...prev, userData]
      })
      addSystemMessage(`${userData.name} joined the room`)
    })

    // user-left: uses functional updater so it always has latest state
    // even if this effect re-runs between the emit and the handler firing
    socket.on('user-left', ({ socketId, name }) => {
      console.log('[user-left] removing socketId:', socketId)
      setParticipants((prev) => {
        console.log('[user-left] prev:', prev.map(p => p.socketId), '→ removing:', socketId)
        return prev.filter((p) => p.socketId !== socketId)
      })
      if (name) addSystemMessage(`${name} left the room`)
    })
    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'chat' }])
    })
    socket.on('user-mute-changed', ({ socketId, isMuted }) => {
      setParticipants((prev) => prev.map((p) =>
        p.socketId === socketId ? { ...p, isMuted } : p
      ))
    })
    socket.on('user-speaking', ({ socketId, isSpeaking }) => {
      setParticipants((prev) => prev.map((p) =>
        p.socketId === socketId ? { ...p, isSpeaking } : p
      ))
    })
    socket.on('user-typing', ({ userId, name, isTyping }) => {
      if (userId === user.id) return
      setTypingUsers((prev) =>
        isTyping ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((n) => n !== name)
      )
    })
    socket.on('room-closed', ({ message }) => {
      alert(message)
      navigate('/room')
    })

    return () => {
      // Only remove listeners — do NOT emit leave-room here.
      // leave-room is emitted by leaveRoom() and by the beforeunload handler below.
      // Emitting it here causes double-leave on React StrictMode re-mount.
      socket.off('room-participants')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('chat-message')
      socket.off('user-mute-changed')
      socket.off('user-speaking')
      socket.off('user-typing')
      socket.off('room-closed')
    }
  }, [socket, joined, roomId])

  const addSystemMessage = (text) => {
    setMessages((prev) => [...prev, {
      id: Date.now(), type: 'system', message: text,
      timestamp: new Date().toISOString(),
    }])
  }

  const sendMessage = () => {
    if (!inputMsg.trim() || !socket) return
    socket.emit('chat-message', { roomId, message: inputMsg })
    setInputMsg('')
    socket.emit('typing', { roomId, isTyping: false })
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
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

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    socket?.emit('toggle-mute', { roomId, isMuted: newMuted })
  }

  const startVoice = async () => {
    setVoice(v => ({ ...v, loading: true, error: null }))
    try {
      const res = await getLiveKitToken(roomId)
      // Single atomic update — all three values set together, no intermediate renders
      voiceRoomRef.current = roomId  // record which room this voice belongs to
      setVoice({ enabled: true, token: res.data.token, url: res.data.url, loading: false, error: null })
    } catch (err) {
      console.error('LiveKit error:', err)
      setVoice(v => ({ ...v, loading: false, error: 'Could not connect to voice. Try again.' }))
    }
  }

  const stopVoice = () => {
    // Single atomic reset — prevents onDisconnected -> setState -> remount loop
    setVoice({ enabled: false, token: null, url: null, loading: false, error: null })
  }

  // CRITICAL: if roomId changes while voice is active (e.g. user navigates to
  // another room in same tab), immediately kill the voice connection.
  // This is the main guard against audio leaking between rooms.
  useEffect(() => {
    if (voice.enabled && voiceRoomRef.current && voiceRoomRef.current !== roomId) {
      console.warn(`[Voice] roomId changed from ${voiceRoomRef.current} to ${roomId} — stopping voice`)
      stopVoice()
    }
  }, [roomId])

  // Emit leave-room on tab close / browser close — covers the case where
  // user closes the tab without clicking Leave button
  useEffect(() => {
    const handleUnload = () => {
      if (socket && roomId) socket.emit('leave-room', { roomId: String(roomId) })
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [socket, roomId])

  const leaveRoom = async () => {
    // Emit leave-room FIRST before anything else so server updates immediately
    if (socket) socket.emit('leave-room', { roomId: String(roomId) })
    stopVoice()
    const durationMin = Math.round((Date.now() - sessionStart) / 60000)
    if (durationMin >= 1) {
      await completeSession({ room_id: roomId, duration_minutes: durationMin }).catch(() => {})
    }
    navigate('/room')
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20 }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <h4 style={{ textAlign: 'center' }}>{error}</h4>
        <button onClick={() => navigate('/room')}>Back to Rooms</button>
      </div>
    )
  }

  // participants state never includes yourself (filtered on receive), so just add 1 for self
  const totalParticipants = participants.length + 1

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
        .room-topic { color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 1px; }
        .participants-toggle { display: none !important; }
        .mobile-drawer-overlay { display: none; }
        @media (max-width: 640px) {
          .participants-panel { display: none !important; }
          .participants-toggle { display: flex !important; align-items: center; gap: 4px; }
          .mobile-drawer-overlay { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100; }
          .mobile-drawer-inner { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 20px 20px 0 0; padding: 16px; max-height: 60vh; overflow-y: auto; }
          .room-title { max-width: 100px; font-size: 12px; }
          .btn-bar { padding: 5px 8px; font-size: 11px; }
        }
      `}</style>

      <div className="room-layout">
        <div className="room-topbar">
          <div className="topbar-left">
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: connected ? '#22c55e' : '#ef4444' }} />
            <div style={{ minWidth: 0 }}>
              <div className="room-title">{roomInfo ? roomInfo.title : `Room #${roomId}`}</div>
              {roomInfo && <div className="room-topic">{roomInfo.topic}</div>}
            </div>
            <button className="participants-toggle btn-bar" onClick={() => setShowParticipants(true)} style={{ background: 'rgba(255,255,255,0.15)' }}>
              👥 {totalParticipants}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }}>
              {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="topbar-right">
            {voiceEnabled && (
              <button className="btn-bar" onClick={toggleMute}
                style={{ background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)' }}>
                {isMuted ? '🔇' : '🎙️'}
              </button>
            )}
            <button className="btn-bar"
              onClick={voiceEnabled ? stopVoice : startVoice}
              disabled={voiceLoading}
              style={{ background: voiceEnabled ? '#6366f1' : voiceLoading ? '#64748b' : 'rgba(255,255,255,0.15)' }}>
              {voiceLoading ? '⟳ Connecting...' : voiceEnabled ? '🔊 Voice On' : '🎧 Join Voice'}
            </button>
            <button className="btn-bar" onClick={leaveRoom} style={{ background: '#ef4444' }}>Leave</button>
          </div>
        </div>

        <div className="room-body">
          <div className="participants-panel">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: 1 }}>
              PARTICIPANTS ({totalParticipants})
            </div>
            <ParticipantCard p={{ name: user?.name, isMuted, isSpeaking: isSelfSpeaking, socketId: socket?.id }} isMe />
            {participants.map((p) => (
              <ParticipantCard
                key={p.socketId}
                p={{ ...p, isSpeaking: !!speakingMap[String(p.userId)] }}
                isMe={false}
              />
            ))}
            {voiceEnabled && (
              <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, fontSize: 11, color: '#6366f1', textAlign: 'center' }}>
                🔊 Voice active
              </div>
            )}
            {voiceError && (
              <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 11, color: '#ef4444', textAlign: 'center' }}>
                {voiceError}
              </div>
            )}
          </div>

          {showParticipants && (
            <div className="mobile-drawer-overlay" onClick={() => setShowParticipants(false)}>
              <div className="mobile-drawer-inner" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Participants ({totalParticipants})</span>
                  <button onClick={() => setShowParticipants(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ParticipantCard p={{ name: user?.name, isMuted, isSpeaking: isSelfSpeaking, socketId: socket?.id }} isMe />
                  {participants.map((p) => (
                    <ParticipantCard
                      key={p.socketId}
                      p={{ ...p, isSpeaking: !!speakingMap[String(p.userId)] }}
                      isMe={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  <div key={msg.id} style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '6px 0', padding: '3px 10px', background: '#f1f5f9', borderRadius: 20, display: 'inline-block', width: '100%' }}>
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

            <div className="chat-input-bar">
              <textarea
                value={inputMsg}
                onChange={handleTyping}
                onKeyDown={handleInputKeyDown}
                placeholder="Type a message..."
                rows={1}
                style={{ flex: 1, resize: 'none', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMsg.trim()}
                style={{ padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: inputMsg.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#e2e8f0', color: inputMsg.trim() ? '#fff' : '#94a3b8', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LiveKit handles ALL audio automatically — no UI needed */}
      {/* key={roomId+livekitToken} forces full unmount when room changes — prevents audio leaking between rooms */}
      {voiceEnabled && livekitToken && livekitUrl && (
        <LiveKitRoom
          key={`${roomId}-${livekitToken}`}
          token={livekitToken}
          serverUrl={livekitUrl}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => addSystemMessage('Voice connected')}
          onDisconnected={() => stopVoice()}
          onError={(err) => { console.error('LiveKit error:', err); setVoiceError('Voice failed. Try again.'); stopVoice() }}
        >
          <RoomAudioRenderer />
          <LiveKitSync isMuted={isMuted} onSpeakingChange={onSpeakingChange} onSelfSpeaking={onSelfSpeaking} />
        </LiveKitRoom>
      )}
    </>
  )
}

export default RoomLive