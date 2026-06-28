# Deployment Guide — The Kitchen Platform

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env

# 3. Edit .env — set JWT_SECRET at minimum
# JWT_SECRET=your-random-secret-here

# 4. Start backend (Terminal 1)
npm run backend

# 5. Start frontend (Terminal 2)
npm run dev

# Or both at once:
npm run dev:all
```

Visit http://localhost:3000 — sign up, upload recipes, explore.

---

## Deploy to Railway (Recommended)

Railway gives you a free tier and handles both services easily.

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/the-kitchen-platform.git
git push -u origin main
```

### Step 2 — Create Railway Project

1. Go to https://railway.app → New Project
2. Deploy from GitHub repo → select your repo

### Step 3 — Backend Service

In Railway dashboard:
- Click **New Service** → select repo
- Set **Start Command**: `node backend/server.cjs`
- Set **Root Directory**: `/` (leave blank)
- Add **Environment Variables**:
  ```
  PORT=4000
  JWT_SECRET=your-long-random-secret-here
  CLOUDINARY_CLOUD_NAME=your-cloud-name
  CLOUDINARY_API_KEY=your-api-key
  CLOUDINARY_API_SECRET=your-api-secret
  ```
- Add a **Volume** (for persistent database):
  - Mount path: `/app/backend/prisma`
  - This keeps your database alive across deploys

### Step 4 — Frontend Service

- Click **New Service** → same repo
- Set **Build Command**: `npm run build`
- Set **Start Command**: `npx serve dist/client -p $PORT`
- Add **Environment Variable**:
  ```
  VITE_API_BASE_URL=https://YOUR-BACKEND-SERVICE.railway.app
  ```
  (Get this URL from your backend service settings)

### Step 5 — Deploy

Railway auto-deploys on every push to `main`. First deploy takes ~3 minutes.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Backend port (Railway sets this automatically) |
| `JWT_SECRET` | **CRITICAL** | Secret for signing tokens — make it long and random |
| `CLOUDINARY_CLOUD_NAME` | No | For image uploads |
| `CLOUDINARY_API_KEY` | No | For image uploads |
| `CLOUDINARY_API_SECRET` | No | For image uploads |
| `VITE_API_BASE_URL` | Yes | Backend URL for frontend |

---

## Generate a Secure JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output into your Railway environment variables.

---

## After Deployment

1. Visit your frontend URL
2. Click **Sign Up** to create your account
3. Upload a recipe
4. Share the URL with people!

---

## Database Persistence

The SQLite database (`backend/prisma/dev.db`) is a file on disk.
Without a Railway volume, it resets on every deploy.

**Always add the Railway volume** before inviting real users.

---

## Troubleshooting

**Backend not connecting to frontend:**
- Make sure `VITE_API_BASE_URL` points to the correct backend URL
- Make sure the backend URL starts with `https://`

**Images not uploading:**
- Check all three Cloudinary env vars are set
- Go to https://console.cloudinary.com to get your credentials

**Database wiped after redeploy:**
- Add a Railway volume mounted at `/app/backend/prisma`

**Login not working:**
- Make sure `JWT_SECRET` is the same between restarts (set it explicitly)
