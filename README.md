# 🎤 SpeakCircle — Full-Stack Web App

A professional English speaking practice platform built with **React + Vite** (frontend) and **Node.js + Express + MySQL** (backend).

---

## 📁 Folder Structure

```
speakCircle/
├── frontend/          ← React + Vite app
│   ├── src/
│   │   ├── components/    Navbar, Footer, Loader, Toast
│   │   ├── pages/         Home, Login, Register, Dashboard, Room, Profile, About, Contact, FAQ
│   │   ├── context/       AuthContext (JWT auth state)
│   │   ├── services/      api.js (all Axios API calls)
│   │   └── styles/        global.css (design tokens + AOS)
│   └── package.json
│
└── backend/           ← Node.js + Express + MySQL API
    ├── config/        db.js (MySQL connection pool)
    ├── controllers/   authController.js, roomController.js, generalController.js
    ├── middleware/    auth.js (JWT verification)
    ├── routes/        auth.js, rooms.js, general.js
    ├── database.sql   ← Run this first!
    ├── server.js
    └── package.json
```

---

## 🚀 Setup Instructions

### 1. MySQL Database

```bash
# Open MySQL and run:
mysql -u root -p < backend/database.sql
```

This creates the `speakcircle` database with all tables and seed data.

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and fill .env
cp .env.example .env
# Edit .env with your DB credentials and a JWT secret

npm run dev     # Development (nodemon)
# or
npm start       # Production
```

Backend runs on: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

The Vite dev proxy automatically forwards `/api/*` to `http://localhost:5000`.

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/profile` | ✅ | Get logged-in user |
| PUT | `/api/auth/profile` | ✅ | Update profile |
| GET | `/api/rooms` | ❌ | Get all rooms |
| POST | `/api/rooms` | ✅ | Create room |
| POST | `/api/rooms/:id/join` | ✅ | Join a room |
| POST | `/api/rooms/complete-session` | ✅ | Log completed session |
| GET | `/api/daily-topic` | ❌ | Today's topic |
| GET | `/api/faqs` | ❌ | All FAQs |
| POST | `/api/contact` | ❌ | Submit contact form |
| GET | `/api/stats` | ❌ | Platform stats |

---

## 🎨 Frontend Features

- **AOS animations** on all sections (scroll-triggered)
- **Custom design system** with CSS variables (no utility-class dependency)
- **Protected routes** — dashboard/room/profile require login
- **JWT auth** stored in localStorage, auto-attached to API requests
- **Toast notifications** for all actions
- **Responsive** — mobile-first design
- **Live stats** — active user count updates every 5 seconds

## 🗄️ Database Tables

- `users` — accounts, levels, points, streaks
- `rooms` — speaking rooms with host, topic, level
- `room_participants` — join/leave tracking
- `sessions` — completed sessions with points
- `daily_topics` — rotating topics by date
- `contacts` — form submissions
- `faqs` — seeded FAQ entries

---

## 🛠 Tech Stack

**Frontend:** React 18, Vite, React Router v6, AOS, Bootstrap 5, Axios

**Backend:** Node.js, Express, MySQL2, bcryptjs, jsonwebtoken, cors, dotenv

**Database:** MySQL 8+
