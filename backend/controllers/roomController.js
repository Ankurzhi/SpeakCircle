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
    await db.query("UPDATE rooms SET current_participants = current_participants + 1, status = 'active' WHERE id = ?", [id]);

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

    // sessions table may not exist in fresh Aiven DB — gracefully skip if missing
    try {
      await db.query(
        'INSERT INTO sessions (room_id, user_id, duration_minutes, points_earned) VALUES (?, ?, ?, ?)',
        [room_id, req.user.id, duration_minutes, points]
      );
    } catch (tblErr) {
      console.warn('sessions table missing — skipping session insert. Run database.sql to create it.');
    }

    // Update user stats — safe even without sessions table
    try {
      await db.query(
        'UPDATE users SET total_sessions = total_sessions + 1, total_points = total_points + ? WHERE id = ?',
        [points, req.user.id]
      );
      const [users] = await db.query('SELECT total_sessions FROM users WHERE id = ?', [req.user.id]);
      const sessionCount = users[0]?.total_sessions || 0;
      let level = 'Beginner';
      if (sessionCount >= 50) level = 'Advanced';
      else if (sessionCount >= 15) level = 'Intermediate';
      await db.query('UPDATE users SET level = ? WHERE id = ?', [level, req.user.id]);
    } catch (statErr) {
      console.warn('Could not update user stats — columns may be missing:', statErr.message);
    }

    res.json({ success: true, message: 'Session completed!', points_earned: points });
  } catch (err) {
    console.error('Complete session error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Shared helper: safely close a room ──────────────────────────────────────
const safeCloseRoom = async (roomId) => {
  // Step 1: Try to close with ended_at, fall back without it
  try {
    await db.query(
      "UPDATE rooms SET status = 'closed', ended_at = NOW() WHERE id = ?",
      [roomId]
    );
    console.log(`Room ${roomId} closed with ended_at`);
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      await db.query("UPDATE rooms SET status = 'closed' WHERE id = ?", [roomId]);
      console.log(`Room ${roomId} closed without ended_at (column missing)`);
    } else {
      throw e;
    }
  }

  // Step 2: Try to mark participants left, fall back if left_at missing
  try {
    await db.query(
      'UPDATE room_participants SET left_at = NOW() WHERE room_id = ? AND left_at IS NULL',
      [roomId]
    );
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      // left_at column missing — just log, room is still marked closed
      console.warn(`room_participants.left_at column missing for room ${roomId} — skipping`);
    } else {
      throw e;
    }
  }
};

// Close room — host only
const closeRoom = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[closeRoom] id=${id} req.user=`, req.user);

    const [rooms] = await db.query('SELECT id, host_id, status FROM rooms WHERE id = ?', [id]);
    console.log(`[closeRoom] DB returned:`, rooms);

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const room = rooms[0];

    // Loose equality: handles number vs string mismatch from JWT / MySQL
    if (room.host_id != req.user.id) {
      console.log(`[closeRoom] DENIED host_id=${room.host_id}(${typeof room.host_id}) req.user.id=${req.user.id}(${typeof req.user.id})`);
      return res.status(403).json({ success: false, message: 'Only the host can end this room' });
    }

    if (room.status === 'closed') {
      return res.json({ success: true, message: 'Room already closed.' });
    }

    await safeCloseRoom(id);

    console.log(`[closeRoom] Room ${id} closed successfully`);
    res.json({ success: true, message: 'Room closed.' });
  } catch (err) {
    console.error('[closeRoom] ERROR:', err.message, '| code:', err.code, '| sql:', err.sql);
    res.status(500).json({
      success: false,
      message: 'Server error',
      detail: err.message,  // shown in browser console so you can see exact cause
      code: err.code
    });
  }
};


// Get single room by ID
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT r.*, u.name as host_name
       FROM rooms r
       JOIN users u ON r.host_id = u.id
       WHERE r.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, room: rows[0] });
  } catch (err) {
    console.error('Get room by ID error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getRooms, createRoom, joinRoom, completeSession, closeRoom, safeCloseRoom, getRoomById };