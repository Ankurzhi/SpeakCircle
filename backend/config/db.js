// const mysql2 = require('mysql2');
// require('dotenv').config();

// const pool = mysql2.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || 'user',
//   database: process.env.DB_NAME || 'speakcircle',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// const db = pool.promise();

// // Test connection
// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error('❌ Database connection failed:', err.message);
//   } else {
//     console.log('✅ MySQL connected successfully');
//     connection.release();
//   }
// });

// module.exports = db;
const mysql2 = require('mysql2');
require('dotenv').config();

const pool = mysql2.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // ✅ ADD THIS
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  ssl: {
    rejectUnauthorized: false, // ✅ VERY IMPORTANT
  },

  connectTimeout: 10000, // ✅ optional but helpful
});

const db = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ MySQL connected successfully');
    connection.release();
  }
});

module.exports = db;
