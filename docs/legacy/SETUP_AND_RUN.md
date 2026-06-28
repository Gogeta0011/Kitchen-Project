# The Kitchen Platform — Local Setup Guide

## What You Need Installed
- **Node.js** v18 or higher → https://nodejs.org
- **npm** (comes with Node.js)

---

## First-Time Setup (do this once)

Open a terminal in the project folder and run:

```bash
npm install
```

Then set up the database:

```bash
npm run db:migrate
npm run db:seed
```

This creates `backend/prisma/dev.db` — your SQLite database file.

---

## Running the App Every Day

You need **two terminal windows** open at the same time.

### Terminal 1 — Backend (database server)
```bash
npm run backend
```
Runs at: http://localhost:4000

### Terminal 2 — Frontend (the website)
```bash
npm run dev
```
Runs at: http://localhost:5173

Open http://localhost:5173 in your browser and you'll see the full site.

---

## Viewing Your Database (GUI)

Install **DB Browser for SQLite** (free): https://sqlitebrowser.org/

1. Open DB Browser
2. Click **"Open Database"**
3. Navigate to: `backend/prisma/dev.db`
4. You'll see all tables: Recipe, Chef, SavedRecipe, FavoriteChef, PickerHistory

The database updates live as you add recipes through the website!

---

## Showing to Your Manager

When your manager wants to see it:
1. Make sure both terminals are running (backend + frontend)
2. Open http://localhost:5173 in a browser
3. Everything works on your local machine — no internet needed

---

## Adding Your First Real Recipe

1. Go to http://localhost:5173/upload
2. Fill in the form
3. Click **Publish recipe**
4. It's instantly saved to the database
5. Open DB Browser to see it in the Recipe table

---

## Resetting the Database (if needed)

To wipe everything and start fresh with sample data:
```bash
npm run db:migrate
npm run db:seed
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot connect to backend" | Make sure `npm run backend` is running in Terminal 1 |
| Home page shows no recipes | Backend isn't running or database isn't seeded |
| White screen | Check the frontend terminal for errors |
| Recipe not saving | Check Terminal 1 (backend) for error messages |
