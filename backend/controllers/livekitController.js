const { AccessToken } = require('livekit-server-sdk')

const getLiveKitToken = async (req, res) => {
  try {
    const { roomId } = req.params

    // Create a LiveKit access token for this user
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(req.user.id),
        name: req.user.name,
      }
    )

    // Give this user permission to join the specific room
    token.addGrant({
      roomJoin: true,
      room: String(roomId),
      canPublish: true,      // can send audio
      canSubscribe: true,    // can receive audio
      canPublishData: true,  // can send data messages
    })

    const jwt = await token.toJwt()

    res.json({
      success: true,
      token: jwt,
      url: process.env.LIVEKIT_URL,
    })
  } catch (err) {
    console.error('LiveKit token error:', err)
    res.status(500).json({ success: false, message: 'Could not generate token' })
  }
}

module.exports = { getLiveKitToken }