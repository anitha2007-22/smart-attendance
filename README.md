# 🎓 Smart Attendance Monitoring & Analytics System (SAMS)

A full-stack automated student attendance system built with **Node.js**, **PostgreSQL**, and **Vanilla JS** — featuring QR-based attendance, real-time analytics, and role-based dashboards.

## 🚀 Live Demo
👉 [https://smart-attendance-dusky.vercel.app/shared/login.html](https://smart-attendance-dusky.vercel.app/shared/login.html)

> **Note:** First login may take up to 60 seconds (Render free tier cold start).

### Demo Credentials
| Role    | Email                        | Password     |
|---------|------------------------------|--------------|
| Admin   | admin@college.edu            | Admin@123    |
| Faculty | anita.sharma@college.edu     | Faculty@123  |
| Student | aarav@gmail.com              | Student@123  |

---

## ✨ Features

### Admin
- Dashboard with real-time attendance analytics
- Manage students, faculty, departments, subjects, timetable
- View attendance records and generate reports
- Send notifications to students

### Faculty
- Start/end attendance sessions with rotating QR codes
- Manual attendance marking
- View flagged records and leave requests
- Export attendance reports (PDF/Excel)

### Student
- Scan QR code or enter 6-digit code to mark attendance
- View attendance history and subject-wise breakdown
- Apply for leave
- Receive low-attendance notifications

---

## 🛠️ Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | HTML, CSS, Vanilla JS, Bootstrap 5, Chart.js |
| Backend   | Node.js, Express.js |
| Database  | PostgreSQL |
| Auth      | JWT (Access + Refresh tokens) |
| QR Code   | Rotating JWT-signed QR with 20s TTL |
| Hosting   | Vercel (Frontend) + Render (Backend) |

---

## 🔐 Security Features
- Rotating QR codes (expire every 20 seconds)
- JWT access + refresh token rotation
- Trust scoring for attendance integrity
- Rate limiting on auth endpoints
- XSS protection and security headers (Helmet)
- CORS restricted to frontend origin

---

## 📁 Project Structure
```
smart-attendance-system/
├── frontend/
│   ├── public/          # HTML pages (admin, faculty, student)
│   └── src/
│       ├── css/         # theme.css, responsive.css
│       └── js/          # API client, components, utilities
├── backend/
│   └── src/
│       ├── config/      # DB, env, constants
│       ├── modules/     # Auth, attendance, analytics
│       ├── middleware/  # Auth, rate limiter, error handler
│       └── migrations/  # DB schema migrations
└── database/
    └── schema.sql       # PostgreSQL schema
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # fill in your env vars
npm run migrate
npm run seed
npm start
```

### Frontend
Open `frontend/public/shared/login.html` in a browser or serve with any static server.

---

## 📊 Database Schema
- `users` — base auth table (admin, faculty, student roles)
- `students`, `faculty` — role-specific profiles
- `departments`, `subjects`, `timetable` — academic structure
- `attendance_sessions` — one per class instance
- `attendance_records` — individual student attendance
- `leave_requests`, `notifications`, `audit_logs`

---

Made with ❤️ for modern colleges