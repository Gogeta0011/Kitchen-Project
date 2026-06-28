# The Kitchen Platform — Deployment Options

This document summarizes hosting options for the manager to choose from.

---

## Current Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite (TanStack Start) | Static site / SSR capable |
| Backend | Node.js (plain HTTP server) | Runs on any Node host |
| Database | SQLite | File-based, zero config |

---

## Option A: Railway (Recommended for MVP) ⭐

**Cost:** Free tier available, ~$5/month if heavier usage  
**Difficulty:** Easy  
**Setup time:** ~30 minutes

- Deploy backend + frontend as separate services
- SQLite file persists on the server
- Automatic HTTPS, custom domain support
- One-click deploys from GitHub

**Steps:**
1. Push code to GitHub
2. Connect Railway to the repo
3. Set `PORT` env variable for backend
4. Set `VITE_API_BASE_URL` for frontend to point to backend URL
5. Done

**Best for:** Demo stage, early users, low traffic

---

## Option B: Render

**Cost:** Free tier available, $7/month paid  
**Difficulty:** Easy  
**Setup time:** ~45 minutes

Similar to Railway. Backend as a "Web Service", frontend as a "Static Site".

**Best for:** Same as Railway, slightly more generous free tier

---

## Option C: VPS (DigitalOcean Droplet / Linode / Vultr)

**Cost:** ~$6–12/month  
**Difficulty:** Medium  
**Setup time:** 2–4 hours

Full control. Run both frontend and backend on a single Linux server with Nginx as reverse proxy.

**Best for:** Production use, team manages their own server

---

## Option D: Vercel (Frontend) + Railway (Backend)

**Cost:** Vercel free + Railway ~$5/month  
**Difficulty:** Medium  
**Setup time:** 1 hour

Vercel gives excellent frontend performance (CDN, instant deploys). Backend stays on Railway.

**Best for:** Best performance, professional setup

---

## Database Upgrade Path (When Ready)

SQLite works great up to ~100 concurrent users. When you're ready to scale:

1. Switch to **PostgreSQL** (free on Railway/Render)
2. Update `backend/prisma/schema.prisma`:
   ```
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run `npm run db:migrate` — all data models stay the same
4. Done

---

## Recommended Path for Launch

1. **Tonight:** Test locally, show manager the working site
2. **This week:** Push to GitHub, deploy to Railway (backend + frontend)
3. **When growing:** Migrate to PostgreSQL, add user authentication
4. **Later:** Custom domain, email notifications, image uploads to S3
