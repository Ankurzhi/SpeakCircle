const db = require('../config/db');

// Get all active rooms
const getRooms = async (req, res) => {
  try {
    const { level } = req.query;
    let query = `
      SELECT r.*, u.name as host_name, u.avatar as host_avatar,
             (SELECT COUNT(*) FROM room_participants WHERE room_id = r.id AND left_at IS NULL) as active_participants
      FROM rooms r
      JOIN users u ON r.host_id = u.id
      WHERE r.status != 'closed'
    `;
    const params = [];
    if (level) { query += ' AND r.level = ?'; params.push(level); }
    query += ' ORDER BY r.created_at DESC LIMIT 20';
    const [rooms] = await db.query(query, params);
    res.json({ success: true, rooms });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create room
const createRoom = async (req, res) => {
  try {
    const { title, topic, level, max_participants } = req.body;
    if (!title || !topic) return res.status(400).json({ success: false, message: 'Title and topic are required' });

    const [result] = await db.query(
      'INSERT INTO rooms (title, topic, level, max_participants, host_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, topic, level || 'Beginner', max_participants || 4, req.user.id, 'waiting']
    );
    await db.query('INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)', [result.insertId, req.user.id]);
    await db.query('UPDATE rooms SET current_participants = 1 WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, message: 'Room created!', room_id: result.insertId });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Join room
const joinRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const [rooms] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Room not found' });

    const room = rooms[0];
    if (room.status === 'closed') return res.status(400).json({ success: false, message: 'This room has ended' });
    if (room.current_participants >= room.max_participants) return res.status(400).json({ success: false, message: 'Room is full' });

    const [existing] = await db.query(
      'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
      [id, req.user.id]
    );
    if (existing.length > 0) return res.json({ success: true, message: 'Already in room' });

    await db.query(
      'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE left_at = NULL, joined_at = NOW()',
      [id, req.user.id]
    );
    await db.query('UPDATE rooms SET current_participants = current_participants + 1, status = "active" WHERE id = ?', [id]);

    res.json({ success: true, message: 'Joined room!' });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Complete session
const completeSession = async (req, res) => {
  try {
    const { room_id, duration_minutes } = req.body;
    const points = Math.max(10, duration_minutes * 2);

    await db.query(
      'INSERT INTO sessions (room_id, user_id, duration_minutes, points_earned) VALUES (?, ?, ?, ?)',
      [room_id, req.user.id, duration_minutes, points]
    );
    await db.query(
      'UPDATE users SET total_sessions = total_sessions + 1, total_points = total_points + ? WHERE id = ?',
      [points, req.user.id]
    );

    const [users] = await db.query('SELECT total_sessions FROM users WHERE id = ?', [req.user.id]);
    const sessions = users[0].total_sessions;
    let level = 'Beginner';
    if (sessions >= 50) level = 'Advanced';
    else if (sessions >= 15) level = 'Intermediate';
    await db.query('UPDATE users SET level = ? WHERE id = ?', [level, req.user.id]);

    res.json({ success: true, message: 'Session completed!', points_earned: points });
  } catch (err) {
    console.error('Complete session error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Close room — host only
const closeRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const [rooms] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Room not found' });
    if (rooms[0].host_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the host can end this room' });
    }

    // Mark room as closed and set ended_at
    await db.query('UPDATE rooms SET status = "closed", ended_at = NOW() WHERE id = ?', [id]);

    // Mark all active participants as left
    await db.query('UPDATE room_participants SET left_at = NOW() WHERE room_id = ? AND left_at IS NULL', [id]);

    res.json({ success: true, message: 'Room closed.' });
  } catch (err) {
    console.error('Close room error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getRooms, createRoom, joinRoom, completeSession, closeRoom };

