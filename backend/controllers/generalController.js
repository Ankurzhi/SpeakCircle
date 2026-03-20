const db = require('../config/db');

// Get today's topic
const getDailyTopic = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [topics] = await db.query(
      'SELECT * FROM daily_topics WHERE active_date = ? LIMIT 1',
      [today]
    );

    if (topics.length === 0) {
      // Fallback: random topic
      const [random] = await db.query('SELECT * FROM daily_topics ORDER BY RAND() LIMIT 1');
      return res.json({ success: true, topic: random[0] || { topic: 'Describe your dream career.', category: 'General' } });
    }

    res.json({ success: true, topic: topics[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get FAQs
const getFAQs = async (req, res) => {
  try {
    const [faqs] = await db.query('SELECT * FROM faqs ORDER BY sort_order ASC');
    res.json({ success: true, faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Submit contact form
const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    await db.query(
      'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );

    res.json({ success: true, message: 'Message sent! We will reply soon.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get stats (for home page)
const getStats = async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users');
    const [[{ total_sessions }]] = await db.query('SELECT COUNT(*) as total_sessions FROM sessions');
    const [[{ active_rooms }]] = await db.query("SELECT COUNT(*) as active_rooms FROM rooms WHERE status = 'active'");

    res.json({
      success: true,
      stats: {
        total_users,
        total_sessions,
        active_rooms
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDailyTopic, getFAQs, submitContact, getStats };
