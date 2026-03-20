const express = require('express');
const router = express.Router();
const { getDailyTopic, getFAQs, submitContact, getStats } = require('../controllers/generalController');

router.get('/daily-topic', getDailyTopic);
router.get('/faqs', getFAQs);
router.post('/contact', submitContact);
router.get('/stats', getStats);

module.exports = router;
