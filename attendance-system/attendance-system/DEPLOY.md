# 🚀 Attendance System - Complete Deployment Guide

## What's Built
- 📱 **iPad Check-in Screen** — Camera face scan → select shift type → check in
- 👔 **Manager Dashboard** — Add employees, view attendance, monthly pay reports
- 🔔 **Email Alerts** — Auto-notify when scheduled employee misses check-in
- 💰 **Pay Calculator** — Full/half day × instore/driving rates per employee

---

## STEP 1: Get Your Neon Database URL

1. Go to **https://neon.tech** → Sign up free
2. Create a new project → name it "attendance-system"
3. Copy the **Connection String** (looks like: `postgresql://user:pass@host/dbname?sslmode=require`)
4. Save it — you'll need it in Step 3

---

## STEP 2: Push Code to GitHub

Open VS Code terminal in the attendance-system folder:

```bash
git init
git add .
git commit -m "Initial commit - Attendance System"
```

Then:
1. Go to **https://github.com** → New Repository
2. Name it: `attendance-system`
3. Copy the commands GitHub shows (push existing repo)
4. Run those commands in VS Code terminal

---

## STEP 3: Deploy to Vercel

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **Add New Project** → Select your `attendance-system` repo
3. Click **Environment Variables** and add ALL of these:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Neon connection string from Step 1 |
| `JWT_SECRET` | Any long random text (e.g. `mystore-secret-key-2024-abc123xyz`) |
| `SETUP_KEY` | A password you choose to create manager account (e.g. `setup2024`) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail App Password (see note below) |
| `MANAGER_EMAIL` | Your email to receive alerts |

4. Click **Deploy** → Wait 2-3 minutes

---

## STEP 4: Set Up Database Tables

After deploy succeeds, open VS Code terminal and run:

```bash
cd attendance-system
npm install
npx prisma db push
```

This creates all the tables in your Neon database.

---

## STEP 5: Create Your Manager Account

Open your browser and go to:
```
https://your-app.vercel.app/api/auth/register
```

Send a POST request (use a tool like Postman, or run this in terminal):

```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@email.com","password":"yourpassword","setupKey":"setup2024"}'
```

Replace `setup2024` with whatever you set as `SETUP_KEY`.

---

## STEP 6: First Login

1. Go to `https://your-app.vercel.app/login`
2. Sign in with the email/password you just created
3. Go to **Employees** → Add your staff with photos
4. Set iPad URL to `https://your-app.vercel.app/checkin`

---

## Gmail App Password Setup

1. Go to Google Account → Security → 2-Step Verification (must be ON)
2. Search "App passwords" → Create one for "Mail"
3. Copy the 16-character password → use as `SMTP_PASS`

---

## Daily Usage

**iPad (at store entrance):**
- Open `https://your-app.vercel.app/checkin` in Safari
- Tap "Add to Home Screen" for app-like experience
- Lock Safari to this page

**Manager (from any device):**
- Login at `https://your-app.vercel.app/login`
- View today's attendance on Dashboard
- Generate pay reports at end of month

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid credentials" | Re-run `npx prisma db push` then re-create manager account |
| Face not recognized | Make sure employee photos are uploaded in Employees page |
| Email not sending | Check Gmail App Password is correct in Vercel env vars |
| Database error | Verify DATABASE_URL in Vercel matches Neon exactly |
