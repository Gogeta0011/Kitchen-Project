# CLAUDE.md — Kitchen Platform

Project memory + history for this repo. This repo (`Gogeta0011/Kitchen-Project`)
is a **clean single-commit restart** of the app formerly developed as
`Gogeta0011/Goku-kitchen` (branch `feat/web-config-sqlite-connection`). The git
history was intentionally not carried over — the prior commit history and session
work are recorded below instead.

## What this app is

"The Kitchen" — a recipe-sharing web app (browse / upload recipes, chefs,
reviews, favorites). Lovable-generated frontend, hand-extended backend.

- **Frontend:** React 19 + TanStack Start (SSR) + Tailwind/shadcn, built with
  **Vite**. Runs on **port 8080**.
- **Backend:** plain Node HTTP server, `backend/server.cjs`. Runs on **port 4000**.
  Async **Prisma Client** throughout (singleton in `backend/prisma-client.cjs`).
- **Database:** **Postgres via Prisma** (Docker container `kitchen-pg`). The full
  schema (17 tables) is `backend/prisma/schema.prisma`; connection via
  `DATABASE_URL` (`.env` locally, Railway injects it in prod).
  *(History: the app used to run on SQLite/`sql.js` with raw SQL and a
  `dev.db` file — that's been fully migrated to Postgres. `dev.db` and the
  `sql.js` dep are now unused legacy.)*

### Run it
```bash
# one-time: start Postgres (see "Running on another machine" for the full command)
docker start kitchen-pg                  # or the `docker run …` if first time
npm install
npm run db:seed     # seeds Postgres (4 chef users + 7 recipes)
npm run dev:all     # frontend :8080 + backend :4000
```
There is **no admin UI** — to make a user admin, open a SQL shell
(`docker exec -it kitchen-pg psql -U kitchen -d kitchen`) and run
`UPDATE "User" SET "isAdmin"=true WHERE username='you';` (no restart needed —
Prisma reads it live).

### Key facts / credentials
- Ports: frontend **8080**, backend **4000**.
- **Seed users** (4 chefs) all log in with password **`seedpass123`** (dev only,
  set in `seed.cjs`). Or sign up fresh in the browser.
- Backend `.cjs` changes do **NOT** hot-reload — restart `npm run dev:all`.
- Backend `.cjs` changes do **NOT** hot-reload — restart `npm run dev:all`.
  (A browser refresh only reloads the frontend. This caused repeated
  "still broken" confusion in prior sessions.)

## Running on another machine (Windows / Linux / Mac)

Everything below is cross-platform. The only OS difference is how you install the
prerequisites; the project commands are identical.

### 1. Install prerequisites
You need **Git**, **Node 20+** (npm comes with it), and **Docker Desktop**
(for the Postgres database).

- **Windows:** install [Git](https://git-scm.com/download/win),
  [Node](https://nodejs.org/) (LTS), and
  [Docker Desktop](https://www.docker.com/products/docker-desktop/).
  Run the commands below in **PowerShell** or **Git Bash**.
- **Linux (Debian/Ubuntu):**
  `sudo apt install git nodejs npm` (or use nvm for a newer Node), and install
  [Docker Engine](https://docs.docker.com/engine/install/).
- **Mac:** `brew install git node` and Docker Desktop (or `brew install --cask docker`).

### 2. Clone the repo
```bash
git clone https://github.com/Gogeta0011/Kitchen-Project.git
cd Kitchen-Project
```

### 3. Start the Postgres database (Docker)
The app's target database is Postgres, run as a Docker container. This one
command creates it (data persists in a named volume across restarts):
```bash
docker run -d --name kitchen-pg \
  -e POSTGRES_USER=kitchen \
  -e POSTGRES_PASSWORD=kitchen_dev_pw \
  -e POSTGRES_DB=kitchen \
  -p 5432:5432 \
  -v kitchen_pg_data:/var/lib/postgresql/data \
  postgres:16
```
> On **Windows PowerShell**, replace the trailing `\` line-continuations with a
> single line, or use a backtick `` ` `` at each line end.

Manage it later with: `docker start kitchen-pg` / `docker stop kitchen-pg`.
Open a SQL shell with: `docker exec -it kitchen-pg psql -U kitchen -d kitchen`.

### 4. Configure the connection string
Copy the example env file to `.env` (which is gitignored — never committed):
```bash
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```
The default `DATABASE_URL` in it already matches the Docker container above, so
no edits are needed for local dev.

### 5. Install dependencies + create the tables
```bash
npm install
npx prisma migrate dev --schema=backend/prisma/schema.prisma
```
`prisma migrate` reads `backend/prisma/schema.prisma`, runs the migration in
`backend/prisma/migrations/`, creates all 9 tables in Postgres, and generates the
Prisma Client. (Re-running it when already in sync is a no-op.)

### 6. Run the app
```bash
npm run dev:all      # frontend :8080 + backend :4000
```
Open http://localhost:8080.

> ✅ **The backend runs entirely on Postgres** (migrated from sql.js/SQLite).
> Step 6 talks to the `kitchen-pg` Postgres container via Prisma. The old
> `dev.db` SQLite file is unused legacy.

### Deploying to Railway (later)
Railway provides a managed Postgres and auto-injects `DATABASE_URL` — so you do
NOT create a `.env` there. Add a Postgres service, point the app at
`DATABASE_URL`, and run `prisma migrate deploy` on release. The same
`schema.prisma` + `migrations/` work unchanged. (Railway's filesystem is
ephemeral, which is exactly why the DB must be Postgres, not a SQLite file.)

## Prior history (from the old Goku-kitchen repo)

This app was previously two-projects-in-one effort. The **Flask app** ("The
Kitchen Platform", repo `pokemonxy27699-prog/The-kitchen-platform`) was the v1;
**this** is the v2 ("Goku-kitchen"). Last commits before the clean restart:

- `f47ee85` Fix recipe upload: allow `X-CSRF-Token` in CORS + accept `{qty,item}` ingredients
- `9a52139` Remove committed `the-kitchen-platform 2.zip` build artifact
- `0f96bc2` Read SQLite connection string from web.config
- (earlier) initial Lovable upload + router scaffolding

### Recipe-upload fix (the main v2 bug fixed last session)
The browser recipe upload was broken by **two** bugs:
1. **Validator mismatch** — `backend/middleware.cjs` required ingredients shaped
   `{name, amount, unit}`, but the form + display use `{qty, item}`. Fixed the
   validator to accept `{qty, item}`.
2. **CORS** — `Access-Control-Allow-Headers` was missing `X-CSRF-Token`, so the
   browser preflight blocked every authenticated write (`net::ERR_FAILED`).
   Added `X-CSRF-Token` to the allow-list. (Node-side tests passed because Node
   doesn't enforce CORS — only the browser did.)

Verified end-to-end last session: created account, promoted to admin, uploaded a
recipe successfully in the browser.

### Companion Flask app (v1, separate repo — not here)
`pokemonxy27699-prog/The-kitchen-platform` — Python/Flask/Jinja, local DB was
**SQL Server Express (Windows-only)**. Its `/users` + `/cart` pages need SQL
Server; public pages run on Mac via Flask. Vercel deploy was blocked at the
owner/team level. Not part of this repo — recorded here for context only.

## Migration status: SQLite → Postgres (DONE)

The app was a synchronous `sql.js`/SQLite backend (raw SQL, ~100 query sites,
`dev.db` file). It's now a **faithful Postgres/Prisma port** — every feature
preserved (auth, recipes, comments, ratings, likes, collections, follows,
notifications, picker, admin backup/export), with two structural improvements:

1. **Normalized ingredients/steps** — `Recipe.ingredientsJson` / `stepsJson`
   blobs became real tables (`RecipeStep`, `Ingredient`, `RecipeIngredient`).
   The API still returns `ingredients: [{qty,item}]` and `steps: [string]` (the
   packer reassembles them), so the frontend is unchanged.
2. **Chef merged into User** — was two tables (`Chef` + `User`) with `Recipe`
   linking to both. Now one `User` carries the chef profile fields; `Recipe.creatorId`
   → `User`. `FavoriteChef` became a user↔user `Follow`. Responses still expose
   `creatorUsername` / `chef` / `chefUsername` for frontend compatibility.

Comments and Ratings were kept **separate** (the app allows many comments but one
rating per recipe — merging them into one "Review" would have broken that).

The 17-table schema is `backend/prisma/schema.prisma`. Comments/Ratings/Likes/
Collections/Follows/Notifications/PickerHistory/AuditLog are all real tables;
`Product`/`CartItem` exist for the future shop (no routes yet).

### Still to do
- **Deploy to Railway** (see the section above) — the schema + code are ready;
  just needs a Railway Postgres + `prisma migrate deploy` on release.
- **Legacy cleanup** — remove the unused `sql.js` dependency, the old `dev.db`
  file, `seed-direct.cjs`, and the now-vestigial `web.config` DB parsing in
  `config.cjs` (Prisma uses `DATABASE_URL`). Left in place for now; nothing reads them.
- Build the `Product`/`CartItem` shop routes if/when the commerce side is wanted.

## Backend file map
- `backend/server.cjs` — the HTTP server + all 50 routes (async Prisma Client).
- `backend/prisma-client.cjs` — Prisma Client singleton (+ loads root `.env`).
- `backend/config.cjs` — app config (auth/cloudinary/email/rate-limit). Its
  `web.config` DB-path parsing is now vestigial (Prisma uses `DATABASE_URL`).
- `backend/auth.cjs` — JWT, password hashing (PBKDF2), CSRF tokens.
- `backend/middleware.cjs` — input validation, rate limiting, security headers.
- `backend/db-utils.cjs` — admin backup/export/restore/clear/stats (Prisma).
- `backend/admin-cli.cjs` — CLI for those admin tasks (`node backend/admin-cli.cjs stats`).
- `backend/prisma/schema.prisma` — the live 17-table Postgres schema.
- `backend/prisma/seed.cjs` — Prisma seeder (`npm run db:seed`); chefs→Users + recipes.
- `backend/prisma/migrations/` — generated SQL migrations (run on Railway too).
- `backend/prisma/dev.db`, `seed-direct.cjs` — LEGACY sql.js artifacts (unused).

## Outstanding / next steps

**Full detail + checklists live in [`NEXT_STEPS.md`](NEXT_STEPS.md).** Summary:
1. **Verify the frontend** against the new Postgres backend (`npm run dev:all`,
   click through upload/like/rate/comment/collections/follows) — the API was
   smoke-tested directly; the UI pass is the remaining gap.
2. **Deploy to Railway** — add a Railway Postgres, build `npm install && npx
   prisma generate`, start `node backend/server.cjs`, release `prisma migrate
   deploy`; deploy the frontend and point its API base at the backend URL.
3. **Legacy cleanup** — remove `sql.js`, `dev.db`, `seed-direct.cjs`, and the
   vestigial `web.config` DB parsing (keep until after a green Railway deploy).
4. **(Optional) Shop routes** — `Product`/`CartItem` tables exist but have no
   routes yet.
