# Database Management Guide

This guide explains how your team can access, backup, restore, and manage the database.

---

## 🎯 Quick Overview

Your database is a **single file**: `backend/prisma/dev.db`

**Three ways to interact with it:**

1. **CLI Tool** (for developers) — Commands via terminal
2. **API Endpoints** (for apps) — HTTP requests
3. **GUI Tool** (easiest for everyone) — Visual interface

---

## 1️⃣ Using the CLI Tool (Fastest)

### View Database Stats
```bash
node backend/admin-cli.cjs stats
```

Output:
```
📊 Database Statistics:
  User                 5
  Chef                 5
  Recipe              12
  Comment             23
  Rating              18
  RecipeLike          45
  TOTAL              108
```

### Create a Backup
```bash
node backend/admin-cli.cjs backup
```

Creates: `backend/backups/backup-2026-06-18T14-30-45.json`  
(Keeps last 10 backups automatically)

### List All Backups
```bash
node backend/admin-cli.cjs list-backups
```

Output:
```
📋 Available Backups:
  1. backup-2026-06-18T14-30-45.json
     Size: 45.23 KB, Date: 2026-06-18T14:30:45.000Z
  2. backup-2026-06-17T09-15-22.json
     Size: 42.15 KB, Date: 2026-06-17T09:15:22.000Z
```

### Restore from Backup
```bash
node backend/admin-cli.cjs restore ./backend/backups/backup-2026-06-18T14-30-45.json
```

⚠️ **Warning:** This deletes all current data and restores from the backup.

### Export a Table as CSV
```bash
node backend/admin-cli.cjs export Recipe
```

Creates: `backend/backups/Recipe-1718702645000.csv`  
(Opens in Excel, Google Sheets, etc.)

### Clear All Data
```bash
node backend/admin-cli.cjs clear
```

⚠️ **DANGER:** Deletes everything. Requires typing confirmation.

---

## 2️⃣ Using the API (For Team/Automation)

All endpoints require `Authorization: Bearer <JWT_TOKEN>` header.  
**Admin role required** (set `isAdmin=1` on User row).

### Get Database Stats
```bash
curl http://localhost:4000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "User": 5,
  "Chef": 5,
  "Recipe": 12,
  "Comment": 23,
  ...
}
```

### Create Backup
```bash
curl -X POST http://localhost:4000/api/admin/backup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "ok": true,
  "file": "backend/backups/backup-2026-06-18T14-30-45.json",
  "message": "Backup created"
}
```

### List Backups
```bash
curl http://localhost:4000/api/admin/backups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Restore from Backup
```bash
curl -X POST http://localhost:4000/api/admin/restore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "backend/backups/backup-2026-06-18T14-30-45.json"}'
```

### Export Table as CSV
```bash
curl http://localhost:4000/api/admin/export/Recipe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  > recipes.csv
```

### Clear All Data
```bash
curl -X POST http://localhost:4000/api/admin/clear \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm": "DELETE ALL DATA"}'
```

---

## 3️⃣ Using a GUI Tool (Easiest for Non-Developers)

### Download DB Browser for SQLite
https://sqlitebrowser.org/ (Free)

### Open Your Database
1. Open DB Browser for SQLite
2. File → Open Database
3. Navigate to: `the-kitchen-platform/backend/prisma/dev.db`
4. Click "Browse Data" tab
5. Select table from dropdown (User, Recipe, Comment, etc.)

### What You Can Do
- ✅ View all data in a spreadsheet
- ✅ Search/filter rows
- ✅ Edit data directly
- ✅ Add new rows
- ✅ Delete rows
- ✅ Run SQL queries
- ✅ Export as CSV

### Example: View All Recipes
1. Select "Recipe" table
2. See columns: id, title, description, prepTime, cookTime, etc.
3. Click a row to edit

---

## Configuration

### Environment File: `.env`

```bash
# Database location
DB_PATH=./backend/prisma/dev.db

# Backups location and settings
BACKUP_ENABLED=true
BACKUP_DIR=./backend/backups
BACKUP_MAX_FILES=10

# Logging
LOG_LEVEL=info
LOG_SQL=false          # Set to 'true' to see SQL queries
LOG_REQUESTS=false     # Set to 'true' to see HTTP requests
```

### Config File: `backend/config.cjs`

Centralized configuration with all settings:
```javascript
// Usage:
const config = require("./config.cjs");
console.log(config.database.path);  // "./backend/prisma/dev.db"
console.log(config.database.backup.dir);  // "./backend/backups"
```

---

## Database Schema (Quick Reference)

| Table | Purpose | Example Fields |
|-------|---------|-----------------|
| User | Accounts | username, email, password_hash |
| Chef | Public profiles | username, name, bio, followers |
| Recipe | Recipes | title, description, prepTime, cookTime |
| Comment | Comments on recipes | body, recipeId, userId |
| Rating | 1-5 star votes | stars (1-5), recipeId, userId |
| RecipeLike | Likes/hearts | recipeId, userId |
| SavedRecipe | Bookmarks | recipeId, userId, collectionName |
| Collection | Named folders | name, userId |
| CollectionRecipe | Recipes in collections | collectionId, recipeId |
| FavoriteChef | Following | chefUsername, userId |
| Notification | Activity feed | type, body, userId, read |

---

## Common Tasks

### Make Someone an Admin
Using DB Browser or CLI:
```sql
UPDATE "User" SET isAdmin = 1 WHERE username = 'manager_name';
```

### See Who Uploaded a Recipe
```sql
SELECT r.title, u.username, r.createdAt 
FROM Recipe r
JOIN "User" u ON r.userId = u.id
ORDER BY r.createdAt DESC;
```

### Find Most Popular Recipes
```sql
SELECT title, rating, reviews 
FROM Recipe 
WHERE deletedAt IS NULL
ORDER BY rating DESC 
LIMIT 10;
```

### Delete Spam Comments
```sql
DELETE FROM Comment 
WHERE id = 'comment_id_here';
```

### Back Up Before Major Changes
```bash
node backend/admin-cli.cjs backup
```

Then if something goes wrong:
```bash
node backend/admin-cli.cjs restore ./backend/backups/[filename]
```

---

## Troubleshooting

### "Database file not found"
```bash
# Make sure you're in the right directory
ls backend/prisma/dev.db

# If missing, the database will be created on first run
npm run backend
```

### "No backups available"
```bash
# Check backup directory
ls -la backend/backups/

# Create one manually
node backend/admin-cli.cjs backup
```

### "Cannot modify database"
- Close DB Browser if you had it open
- Kill any running backend: `killall node`
- Try again

### "Admin commands fail"
- Check you have a JWT token with admin role
- Verify `isAdmin=1` in User table

---

## Backup Strategy

### Recommended for Teams

**Daily Backups:**
```bash
# Add to cron or task scheduler
0 2 * * * cd /path/to/kitchen && node backend/admin-cli.cjs backup
```

**Keep Last 10 Backups:**
```bash
# Automatic with BACKUP_MAX_FILES=10 in .env
```

**Archive Important Backups:**
```bash
# Copy to cloud storage
cp backend/backups/backup-2026-06-18T*.json ~/backups/
```

---

## Security Notes

⚠️ **Never share:**
- Database file directly
- `.env` file with secrets
- Admin API tokens

✅ **Do:**
- Use `Authorization: Bearer <token>` for API access
- Require admin role for sensitive operations
- Keep backups encrypted
- Limit CLI access to developers only

---

## For Different Team Roles

### Developers
Use: **CLI Tool** + **DB Browser GUI**
```bash
node backend/admin-cli.cjs stats
node backend/admin-cli.cjs backup
```

### Managers
Use: **API Endpoints** via dashboard (if built)  
Or: **DB Browser GUI** for viewing

### Support Team
Use: **DB Browser GUI** to:
- View user accounts
- See their uploaded recipes
- Check comments/ratings
- Answer customer questions

### DevOps/Server Team
Use: **CLI Tool** + **API Endpoints** for:
- Automated backups
- Monitoring database size
- Restoring from backups
- Exporting reports

---

## Next Steps

1. **Download DB Browser for SQLite** — easiest way to explore data
2. **Create your first backup** — `node backend/admin-cli.cjs backup`
3. **Share DB Browser** with your team — let non-developers explore
4. **Set up a manager as admin** — so they can access APIs
5. **Automate daily backups** — add to cron job

---

Questions? See README or PROJECT_OVERVIEW for more details.

