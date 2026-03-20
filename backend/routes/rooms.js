const express = require('express');
const router = express.Router();
const { getRooms, createRoom, joinRoom, completeSession, closeRoom } = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth');

router.get('/', getRooms);
router.post('/', authMiddleware, createRoom);
router.post('/:id/join', authMiddleware, joinRoom);
router.post('/complete-session', authMiddleware, completeSession);
router.patch('/:id/close', authMiddleware, closeRoom); // host ends the room

module.exports = router;