# The Kitchen Platform

A full-stack recipe community app — browse & upload recipes, chefs, comments,
ratings, likes, collections, and follows.

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Start (SSR), Vite, TailwindCSS v4 / shadcn |
| Backend | Node.js HTTP server (`backend/server.cjs`), **Prisma Client** |
| Database | **PostgreSQL** (via Prisma) |
| Auth | JWT tokens + PBKDF2 password hashing + CSRF |

> **Heads-up:** this project was migrated from SQLite (sql.js) to **PostgreSQL**.
> The files under [`docs/legacy/`](docs/legacy/) describe the *old* setup and are
> kept only for history — **ignore them**. This README is the current source of truth.

---

## Run it locally

### Prerequisites
- **Docker** (Docker Desktop on Mac/Windows, or Docker Engine on Linux) — runs Postgres
- **Node.js 20+** (includes npm)

### Steps
```bash
# 1. Get the code
git clone https://github.com/Gogeta0011/Kitchen-Project.git
cd Kitchen-Project

# 2. Create your .env  (Windows PowerShell: copy .env.example .env)
cp .env.example .env

# 3. Start the Postgres database (Docker)
docker compose up -d

# 4. Install deps, create the tables, and seed sample data
npm run setup

# 5. Run the app (frontend :8080 + backend :4000)
npm run dev:all
```
Open **http://localhost:8080**.

`npm run setup` = `npm install` → `prisma migrate deploy` (creates all tables) →
`npm run db:seed` (loads 4 chef users + 7 recipes).

### Log in
Seed accounts (username / password) — any of the chefs work:

| Username | Password |
|---|---|
| `sarah`, `elena`, `marie`, … | `seedpass123` |

…or just **sign up** a new account in the app.

### Make yourself an admin
There's no admin UI toggle — flip the flag directly in Postgres:
```bash
docker exec -it kitchen-pg psql -U kitchen -d kitchen \
  -c "UPDATE \"User\" SET \"isAdmin\"=true WHERE username='YOUR_USERNAME';"
```
(No restart needed.)

### Handy commands
| Command | Does |
|---|---|
| `npm run dev:all` | frontend (:8080) + backend (:4000) |
| `npm run db:up` / `npm run db:down` | start / stop the Postgres container |
| `npm run db:seed` | reload sample data |
| `npm run db:reset` | wipe + re-migrate + re-seed |
| `npm run db:migrate` | create a new migration after editing the schema |
| `npx prisma studio` | visual DB browser in the browser |

> **Note:** backend `.cjs` changes don't hot-reload — restart `npm run dev:all`.

---

## Deploy to Railway

Railway hosts the app **and** gives you a managed Postgres — the same schema and
migrations deploy unchanged; only `DATABASE_URL` differs (Railway injects it).

1. **New Project → Deploy from GitHub repo** → pick this repo.
2. **Add a database:** New → Database → **PostgreSQL**. Railway sets `DATABASE_URL`
   automatically.
3. On the **backend service** settings:
   - Build command: `npm install && npx prisma generate`
   - Start command: `node backend/server.cjs`
   - Release/deploy command: `npx prisma migrate deploy`  *(creates the tables)*
   - (`PORT` is provided by Railway — the server already reads it.)
4. **Frontend:** deploy as a second service (`npm run build`) or to a static host,
   and point its API base URL at the backend's Railway URL.

Health check once live: `https://<backend>.railway.app/api/health` → `{"ok":true}`.

**Full step-by-step (with checklists & gotchas):** [`NEXT_STEPS.md`](NEXT_STEPS.md).

---

## Project structure
```
backend/
  server.cjs          # HTTP server + all 50 API routes (Prisma)
  prisma-client.cjs   # Prisma Client singleton
  auth.cjs            # JWT, password hashing, CSRF
  middleware.cjs      # validation, rate limiting, security headers
  db-utils.cjs        # admin backup / export / restore / clear
  admin-cli.cjs       # CLI for the above (node backend/admin-cli.cjs stats)
  prisma/
    schema.prisma     # the 17-table database schema (source of truth)
    migrations/        # generated SQL migrations
    seed.cjs           # sample-data seeder
src/                  # React + TanStack Start frontend
docker-compose.yml    # local Postgres
```

## Documentation
| File | What |
|---|---|
| **README.md** | you are here — setup + deploy |
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | the database schema & entity relationships |
| [`NEXT_STEPS.md`](NEXT_STEPS.md) | roadmap: frontend verify, Railway deploy, cleanup |
| [`CLAUDE.md`](CLAUDE.md) | deep architecture + project history (for contributors/AI) |
| [`docs/legacy/`](docs/legacy/) | old pre-migration docs — historical only, ignore |
