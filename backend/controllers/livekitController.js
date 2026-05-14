const { AccessToken } = require('livekit-server-sdk')

const getLiveKitToken = async (req, res) => {
  try {
    const { id: roomId } = req.params

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(500).json({ success: false, message: 'LiveKit not configured' })
    }

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(req.user.id),
        name: req.user.name,
        ttl: '4h', // token valid for 4 hours
      }
    )

    // Prefix room name with app name — prevents any collision with other projects
    // using the same LiveKit account. Format: speakcircle-room-{id}
    const liveKitRoomName = `speakcircle-room-${roomId}`

    token.addGrant({
      roomJoin: true,
      room: liveKitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await token.toJwt()

    res.json({
      success: true,
      token: jwt,
      url: process.env.LIVEKIT_URL,
    })
  } catch (err) {
    console.error('LiveKit token error:', err)
    res.status(500).json({ success: false, message: 'Could not generate voice token' })
  }
}

module.exports = { getLiveKitToken }