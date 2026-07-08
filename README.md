# 🎵 Mosique Backend API

Spotify-inspired music streaming app — Node.js + Express + MySQL backend.

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MySQL 8.0+

### 2. Clone & Install
```bash
cd mosique-backend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and a strong JWT_SECRET
```

### 4. Initialize Database
```bash
# Option A — using npm script
npm run db:init

# Option B — manually in MySQL
mysql -u root -p < database/schema.sql
```

### 5. Run the Server
```bash
npm run dev       # Development (with nodemon hot-reload)
npm start         # Production
```

---

## API Reference — Phase 1 (Auth)

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### POST `/auth/register`
Register a new user account.

**Request Body**
```json
{
  "username":     "hasnain99",
  "email":        "hasnain@example.com",
  "password":     "StrongPass1",
  "display_name": "Hasnain"
}
```

**Response `201`**
```json
{
  "success":    true,
  "message":    "Account created successfully! Welcome to Mosique 🎵",
  "token":      "<JWT>",
  "expires_in": "24h",
  "user": { "id": 1, "username": "hasnain99", ... }
}
```

---

#### POST `/auth/login`
Login with email and password.

**Request Body**
```json
{
  "email":    "hasnain@example.com",
  "password": "StrongPass1"
}
```

**Response `200`**
```json
{
  "success":    true,
  "token":      "<JWT>",
  "expires_in": "24h",
  "user": { ... }
}
```

---

#### POST `/auth/logout`
Invalidate the current token (requires Authorization header).

**Headers**
```
Authorization: Bearer <JWT>
```

**Response `200`**
```json
{
  "success": true,
  "message": "Logged out successfully. See you next time! 👋"
}
```

---

#### GET `/auth/me`
Get the authenticated user's profile.

**Headers**
```
Authorization: Bearer <JWT>
```

**Response `200`**
```json
{
  "success": true,
  "user": { "id": 1, "username": "hasnain99", "email": "...", "role": "user", ... }
}
```

---

## Project Structure

```
mosique-backend/
├── database/
│   └── schema.sql              # DB init script
├── src/
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── controllers/
│   │   └── authController.js   # register, login, logout, me
│   ├── middleware/
│   │   └── authMiddleware.js   # verifyToken, requireRole
│   ├── routes/
│   │   └── authRoutes.js       # /api/auth/*
│   ├── validators/
│   │   └── authValidators.js   # Input validation rules
│   └── app.js                  # Express setup
├── server.js                   # Entry point
├── .env.example
└── package.json
```

---

## Roadmap
- [x] Phase 1 — Auth System
- [ ] Phase 2 — Music & Library
- [ ] Phase 3 — Playlists & Social
- [ ] Phase 4 — Streaming & Search
- [ ] Phase 5 — Admin & Analytics
