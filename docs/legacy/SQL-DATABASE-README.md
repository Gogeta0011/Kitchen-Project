# SQL Database Backend

This project now uses a real SQLite SQL database through Prisma.

## Actual database file

```txt
backend/prisma/dev.db
```

This is the real database. When the website saves a recipe, removes a saved recipe, follows a chef, unfollows a chef, or picks a recipe, the backend writes to this SQL database.

## Important files

```txt
backend/server.cjs                  Backend API server
backend/prisma/schema.prisma        SQL database structure
backend/prisma/seed.cjs             Loads starter data into the SQL database
backend/prisma/seed-data.json       Starter data only, not the live database
backend/prisma/dev.db               Live SQLite database, created after setup
```

## First-time setup

Run this once after extracting the project:

```powershell
cd "C:\Users\mir omer ail\Desktop\culinary-canvas-main"
.\SETUP-SQL-DATABASE.ps1
```

Or run manually:

```powershell
cd "C:\Users\mir omer ail\Desktop\culinary-canvas-main"
npm install
npm run db:migrate
npm run db:seed
```

## Start backend

```powershell
cd "C:\Users\mir omer ail\Desktop\culinary-canvas-main"
.\START-BACKEND.ps1
```

Backend runs here:

```txt
http://localhost:4000
```

Test data endpoint:

```txt
http://localhost:4000/api/recipes
```

## Start frontend

```powershell
cd "C:\Users\mir omer ail\Desktop\culinary-canvas-main"
.\START-FRONTEND.ps1
```

Frontend runs here:

```txt
http://localhost:5173
```

## View/edit database visually

```powershell
cd "C:\Users\mir omer ail\Desktop\culinary-canvas-main"
.\OPEN-DATABASE-VIEWER.ps1
```

This opens Prisma Studio so you can see the actual SQL tables.

## Tables included

- Chef
- Recipe
- SavedRecipe
- FavoriteChef
- PickerHistory
