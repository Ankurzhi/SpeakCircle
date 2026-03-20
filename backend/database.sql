-- SpeakCircle Database Schema
-- Run this file to create the database and all tables

CREATE DATABASE IF NOT EXISTS speakcircle;
USE speakcircle;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
  total_sessions INT DEFAULT 0,
  total_points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  bio TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  topic VARCHAR(300) NOT NULL,
  level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
  max_participants INT DEFAULT 4,
  current_participants INT DEFAULT 0,
  host_id INT NOT NULL,
  status ENUM('waiting', 'active', 'closed') DEFAULT 'waiting',
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Room participants table
CREATE TABLE IF NOT EXISTS room_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_participant (room_id, user_id)
);

-- Sessions (completed speaking sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  duration_minutes INT DEFAULT 0,
  points_earned INT DEFAULT 10,
  feedback TEXT DEFAULT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily topics
CREATE TABLE IF NOT EXISTS daily_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  active_date DATE UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new', 'read', 'replied') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAQs
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: Daily Topics
INSERT INTO daily_topics (topic, category, active_date) VALUES
('Describe your dream job and why you want it.', 'Career', CURDATE()),
('What is your favorite childhood memory?', 'Personal', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('How can technology improve education?', 'Technology', DATE_ADD(CURDATE(), INTERVAL 2 DAY)),
('Talk about a book or movie that changed your life.', 'Culture', DATE_ADD(CURDATE(), INTERVAL 3 DAY)),
('What are the benefits of learning a new language?', 'Learning', DATE_ADD(CURDATE(), INTERVAL 4 DAY)),
('Describe a challenge you overcame and what you learned.', 'Personal', DATE_ADD(CURDATE(), INTERVAL 5 DAY)),
('What do you think is the most important skill for the future?', 'Career', DATE_ADD(CURDATE(), INTERVAL 6 DAY));

-- Seed: FAQs
INSERT INTO faqs (question, answer, category, sort_order) VALUES
('How do I join a speaking room?', 'After registering and logging in, go to the Dashboard and click "Join Room" or browse available rooms to find one that matches your level.', 'Getting Started', 1),
('Is SpeakCircle free to use?', 'Yes! SpeakCircle is completely free to use. Create an account and start practicing with real learners today.', 'Pricing', 2),
('What level is suitable for me?', 'We have rooms for Beginner, Intermediate, and Advanced speakers. Choose based on your comfort level. You can always change rooms.', 'Getting Started', 3),
('How long is each speaking session?', 'Sessions are typically 10-15 minutes, designed to be short and focused so you can practice daily without a big time commitment.', 'Sessions', 4),
('Can I host my own room?', 'Absolutely! Once logged in, go to Dashboard and click "Create Room". You can set the topic, level, and max participants.', 'Rooms', 5),
('How do I earn points?', 'You earn points by completing speaking sessions. More sessions = more points = higher level badges!', 'Progress', 6),
('Is there a mobile app?', 'Currently SpeakCircle is web-based and works great on mobile browsers. A dedicated app is coming soon!', 'Technical', 7);
