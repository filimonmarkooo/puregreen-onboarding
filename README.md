# 🟢 Pure Green Franchise Onboarding Portal

A complete self-hosted franchisee onboarding platform with individual dashboards, task tracking, file uploads, and email notifications.

---

## Features

- **Franchisee Registration** — store name, address, owner, planned open date, email
- **Individual Dashboards** — each franchisee sees only their onboarding progress
- **29 Onboarding Tasks** across Square, Uber Eats, DoorDash, Grubhub, and Stream
- **File Upload Proof** — screenshots, PDFs, docs per task (up to 20MB)
- **Credential Storage** — secure storage of platform logins per task
- **Email Notifications** — fires to up to 3 admin emails on every task completion + new registration
- **Password Reset** — email-based reset flow
- **Corporate Admin Dashboard** — master view of all locations + progress
- **Tutorial Video Links** — admin can attach a video URL to any task

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your SMTP credentials and admin email

# 3. Start the server
node server.js

# 4. Create the admin account (one time only)
curl -X POST http://localhost:3000/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"secret":"puregreenadmin2024"}'

# 5. Open in browser
# Franchisee login: http://localhost:3000
# Admin login: http://localhost:3000 (use admin@puregreen.com)
```

---

## Deploy to Railway (Recommended — always on, free tier)

1. Go to [railway.app](https://railway.app) and create a free account
2. Click **New Project → Deploy from GitHub** (push this folder to a GitHub repo first)
   - Or: **New Project → Empty Project → Add Service → GitHub Repo**
3. In Railway dashboard, go to your service → **Variables** and add all values from `.env.example`
4. Railway auto-assigns a URL like `https://puregreen-onboarding.up.railway.app`
5. Update `BASE_URL` in Variables to that URL
6. After first deploy, seed the admin account:
   ```
   curl -X POST https://your-app.up.railway.app/api/admin/seed \
     -H "Content-Type: application/json" \
     -d '{"secret":"puregreenadmin2024"}'
   ```

---

## Email Setup (Gmail)

1. Go to your Google Account → Security → 2-Step Verification → **App Passwords**
2. Create an app password for "Mail"
3. Use that 16-character password as `SMTP_PASS` (NOT your real Gmail password)
4. Set `SMTP_USER` to your Gmail address

---

## Admin Login

- URL: `https://your-domain.com`  
- Email: whatever you set as `ADMIN_EMAIL` in `.env`
- Password: whatever you set as `ADMIN_PASSWORD`

After logging in, you land on the Corporate Admin Dashboard showing all locations.

---

## Sending to Franchisees

Just send them your URL: `https://your-domain.com`  
They click "New Location", fill out the form, and their dashboard is ready immediately.

---

## File Structure

```
puregreen-onboarding/
├── server.js              # Express entry point
├── db/
│   ├── database.js        # JSON file database
│   ├── tasks.js           # All 29 task definitions
│   └── data.json          # Auto-created, stores all data
├── routes/
│   ├── auth.js            # Login, register, reset password
│   ├── tasks.js           # Task completion, uploads, video URLs
│   └── admin.js           # Admin endpoints
├── middleware/
│   └── auth.js            # JWT middleware
├── utils/
│   └── mailer.js          # Email notifications
└── public/
    ├── index.html         # Login/Register page
    ├── dashboard.html     # Franchisee dashboard
    ├── admin.html         # Corporate admin view
    ├── forgot-password.html
    ├── reset-password.html
    ├── css/brand.css      # Pure Green brand styles
    └── uploads/           # Uploaded proof files
```
