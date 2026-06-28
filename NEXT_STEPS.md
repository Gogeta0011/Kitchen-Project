# Kitchen Platform — Next Steps

Where things stand after the **Postgres/Prisma migration (Step 2, done)** and what
to do next, in priority order. See `CLAUDE.md` for the full architecture/history.

Current state: the backend runs entirely on Postgres via Prisma (all 50 routes
ported, API contracts unchanged). The DB is a local Docker container `kitchen-pg`.
Seeded with 4 chef users + 7 recipes (login password `seedpass123`).

---

## 1. Verify the frontend against the new backend  ← do this first

The backend API was smoke-tested directly (login, create recipe, like/rate/comment,
chefs, follows, collections, notifications — all pass). The remaining gap is
clicking through the **actual UI** to catch any response-shape mismatch.

```bash
docker start kitchen-pg          # make sure Postgres is up
npm install                      # if not already
npm run dev:all                  # frontend :8080 + backend :4000
```
Then at http://localhost:8080, check:
- [ ] Sign up a new account, then log in.
- [ ] Browse recipes; open a recipe detail (ingredients + steps render correctly).
- [ ] **Upload a recipe** with multiple ingredients/steps → reopen it and confirm
      they round-trip (this is the normalized-tables path).
- [ ] Like, rate (stars), and comment on a recipe.
- [ ] Create a collection, add a recipe to it.
- [ ] Visit a chef profile; follow/unfollow; check notifications.
- [ ] Promote yourself to admin and open the admin panel (stats/users/backup).

To make yourself admin:
```bash
docker exec -it kitchen-pg psql -U kitchen -d kitchen \
  -c "UPDATE \"User\" SET \"isAdmin\"=true WHERE username='YOUR_USERNAME';"
```
(No restart needed — Prisma reads it live.)

If anything looks wrong, the most likely cause is a field the frontend expects
that the packer doesn't emit — check `packRecipe` / `packChef` / `packComment`
in `backend/server.cjs` against what the failing page reads.

---

## 2. Deploy to Railway

Railway gives managed Postgres + a host. The same `schema.prisma` + `migrations/`
deploy unchanged; only `DATABASE_URL` differs (Railway injects it).

### Backend service
1. Create a Railway project → **New → Deploy from GitHub repo** → pick
   `Gogeta0011/Kitchen-Project`.
2. **Add a Postgres database** (New → Database → PostgreSQL). Railway sets
   `DATABASE_URL` automatically and exposes it to services in the project.
3. On the backend service settings:
   - **Build command:** `npm install && npx prisma generate`
   - **Start command:** `node backend/server.cjs`
   - **Release / deploy command** (runs the migration on every deploy):
     `npx prisma migrate deploy`
   - Set any other env it needs (`CLOUDINARY_*` if image upload is wanted;
     `PORT` is provided by Railway — the server already reads `process.env.PORT`).
4. (One-time) seed the prod DB: run `node backend/prisma/seed.cjs` as a Railway
   one-off command, **or skip it** and start empty. ⚠️ Don't ship the
   `seedpass123` seed users to a real production environment.

### Frontend
The frontend is a **TanStack Start (SSR) Vite app**, separate from the API.
Decide how to host it:
- Simplest: a second Railway service from the same repo with `npm run build`
  then the TanStack/Nitro server start command (confirm the exact start command
  from `vite build` output — TanStack Start builds a Node server via Nitro).
- Or host the built frontend on Cloudflare Pages / Vercel and point it at the
  Railway backend URL.

**Wire the API base URL:** find where the frontend calls the backend (search the
frontend `src/` for `localhost:4000` or an `API_BASE`/fetch base constant) and
point it at the deployed backend URL via an env var. The backend CORS already
allows all origins (`Access-Control-Allow-Origin: *`).

### Checklist
- [ ] Postgres added; `DATABASE_URL` present on the backend service.
- [ ] `prisma migrate deploy` runs green (tables created on Railway).
- [ ] Backend health: `https://<backend>.railway.app/api/health` returns `{ok:true}`.
- [ ] Frontend deployed and pointed at the backend URL.
- [ ] End-to-end signup/login/upload works on the deployed site.

---

## 3. Legacy cleanup (sql.js removal)

Nothing reads these anymore — remove once #1/#2 confirm the Postgres path is solid:
- [ ] `backend/prisma/dev.db` (old SQLite file)
- [ ] `backend/prisma/seed-direct.cjs` (old raw-INSERT seeder)
- [ ] `sql.js` from `package.json` dependencies
- [ ] The `web.config` DB-connection-string parsing in `backend/config.cjs`
      (Prisma uses `DATABASE_URL`; the rest of `config.cjs` stays). `web.config`
      itself can stay for the SPA routing/headers it also defines, or go.

Keep them until after a successful Railway deploy, as a known-good fallback.

---

## 4. (Optional) Build the shop side

`Product` and `CartItem` tables exist in the schema (the whiteboard's "Product
Table") but have **no routes yet**. If the commerce side is wanted, add routes
mirroring the existing patterns in `server.cjs`:
- `GET /api/products`, `GET /api/products/:id`, admin `POST/PUT/DELETE /api/products`
- `GET /api/cart`, `POST /api/cart` (add/update qty), `DELETE /api/cart/:id`
- Later: checkout/orders (would need new `Order`/`OrderItem` tables).
