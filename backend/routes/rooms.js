const express = require('express');
const router = express.Router();
const { getRooms, createRoom, joinRoom, completeSession, closeRoom, getRoomById } = require('../controllers/roomController');
const { getLiveKitToken } = require('../controllers/livekitController');
const authMiddleware = require('../middleware/auth');

router.get('/', getRooms);
router.post('/', authMiddleware, createRoom);
router.post('/complete-session', authMiddleware, completeSession); // must be before /:id
router.get('/:id', getRoomById);
router.post('/:id/join', authMiddleware, joinRoom);
router.patch('/:id/close', authMiddleware, closeRoom);
router.get('/:id/livekit-token', authMiddleware, getLiveKitToken); // LiveKit voice token

module.exports = router;