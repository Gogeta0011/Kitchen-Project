# Web.Config Guide — Connection Strings & Configuration

This guide explains how to use `web.config` to manage your application configuration, connection strings, and environment variables.

---

## 📋 What is web.config?

**web.config** is a standard configuration file for applications running on **IIS (Internet Information Services)** or **Azure**.

It contains:
- ✅ Database connection strings
- ✅ Application settings
- ✅ Security headers
- ✅ URL rewrite rules
- ✅ Server configuration

---

## 🔗 Connection Strings

### Default: SQLite (What You're Using Now)

```xml
<add name="KitchenDatabase" 
     connectionString="./backend/prisma/dev.db" 
     providerName="SQLite" />
```

**Your data file location:** `backend/prisma/dev.db`

**To use it in code:**
```javascript
const config = require("./config.cjs");
const dbPath = config.database.path;  // "./backend/prisma/dev.db"
```

### When to Migrate: PostgreSQL

When you have 10,000+ users, switch to PostgreSQL:

```xml
<add name="KitchenDatabase" 
     connectionString="Server=your-postgres-server.postgres.database.azure.com;Port=5432;Database=kitchen_db;User Id=your-username;Password=your-password;SslMode=Require;" 
     providerName="PostgreSQL" />
```

**Steps to migrate:**
1. Uncomment PostgreSQL connection string
2. Back up SQLite data: `node backend/admin-cli.cjs backup`
3. Update `backend/server.cjs` to use PostgreSQL driver
4. Deploy and test

### Alternative: MySQL

```xml
<add name="KitchenDatabase" 
     connectionString="Server=your-mysql-server.mysql.database.azure.com;Database=kitchen_db;Uid=your-username;Pwd=your-password;SslMode=Required;" 
     providerName="MySQL" />
```

---

## ⚙️ Application Settings

### Server Configuration

```xml
<add key="NODE_ENV" value="production" />
<add key="PORT" value="4000" />
<add key="HOST" value="0.0.0.0" />
```

**In production, change to:**
```xml
<add key="NODE_ENV" value="production" />
<add key="PORT" value="80" />
```

### Security: JWT Secret

```xml
<add key="JWT_SECRET" value="CHANGE-THIS-IN-PRODUCTION-GENERATE-RANDOM-STRING" />
```

**⚠️ CRITICAL: Generate a secure secret**

```bash
# Generate a random secure key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# a3f9c2e8d1b4c5a7f2e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8

# Copy this into web.config:
# <add key="JWT_SECRET" value="<generate-new-secret>" />
```

### Cloudinary (Image Uploads)

```xml
<add key="CLOUDINARY_CLOUD_NAME" value="" />
<add key="CLOUDINARY_API_KEY" value="" />
<add key="CLOUDINARY_API_SECRET" value="" />
```

**To enable:**
1. Sign up at cloudinary.com
2. Get your credentials from dashboard
3. Add them to web.config
4. Images will upload automatically

**Or leave empty:** Images will use placeholders

### API URLs

```xml
<add key="VITE_API_BASE_URL" value="http://localhost:4000" />
<add key="FRONTEND_URL" value="http://localhost:3000" />
```

**In production, change to:**
```xml
<add key="VITE_API_BASE_URL" value="https://yourdomain.com/api" />
<add key="FRONTEND_URL" value="https://yourdomain.com" />
```

### Backup Settings

```xml
<add key="BACKUP_ENABLED" value="true" />
<add key="BACKUP_DIR" value="./backend/backups" />
<add key="BACKUP_MAX_FILES" value="10" />
```

**Keeps last 10 backups automatically**

---

## 🔐 Security Settings

### Headers (Protect Against Attacks)

```xml
<add name="X-Frame-Options" value="SAMEORIGIN" />
<add name="X-Content-Type-Options" value="nosniff" />
<add name="X-XSS-Protection" value="1; mode=block" />
```

**These prevent:**
- Clickjacking (framing your site in malicious iframes)
- MIME type sniffing attacks
- Cross-site scripting (XSS) attacks

### Rate Limiting

```xml
<add key="RATE_LIMIT_WINDOW" value="60000" />
<add key="RATE_LIMIT_MAX" value="200" />
<add key="AUTH_RATE_LIMIT" value="10" />
```

**Translation:**
- 60,000 ms = 1 minute window
- 200 requests per minute (per IP)
- 10 auth requests per minute (stricter for login/signup)

---

## 🔄 How Settings Flow

```
web.config (this file)
    ↓
Loaded by application on startup
    ↓
Available in backend/config.cjs
    ↓
Used by server, routes, and utilities
    ↓
Sent to frontend if needed
```

**In code:**
```javascript
const config = require("./config.cjs");
console.log(config.auth.jwtSecret);      // From web.config
console.log(config.cloudinary.cloudName); // From web.config
console.log(config.database.path);        // From web.config
```

---

## 🚀 Deployment Checklist

### Before Deploying to Production

- [ ] Change `JWT_SECRET` to secure random string
- [ ] Update `VITE_API_BASE_URL` to your domain
- [ ] Update `FRONTEND_URL` to your domain
- [ ] Add Cloudinary credentials (or leave empty for placeholders)
- [ ] Set `NODE_ENV` to "production"
- [ ] Change `PORT` if needed (80 for web, 443 for HTTPS)
- [ ] Update database connection string if using PostgreSQL
- [ ] Add your domain to CORS allowed origins

---

## 📝 Complete Settings Reference

| Setting | Default | Production |
|---------|---------|------------|
| NODE_ENV | development | production |
| PORT | 4000 | 80 or 443 |
| HOST | 0.0.0.0 | 0.0.0.0 |
| JWT_SECRET | dev-secret | GENERATE NEW |
| JWT_EXPIRY | 7d | 7d |
| BACKUP_ENABLED | true | true |
| LOG_LEVEL | info | warn or error |
| LOG_SQL | false | false |
| LOG_REQUESTS | false | false |

---

## 🔗 Loading Settings (In Code)

### From web.config

```javascript
const config = require("./backend/config.cjs");

// Database
const dbPath = config.get("database.path");

// Auth
const jwtSecret = config.get("auth.jwtSecret");

// Cloudinary
const cloudinaryEnabled = config.get("cloudinary.enabled");

// Logging
const logLevel = config.get("logging.level");
```

### Precedence (Priority Order)

1. **.env file** (highest priority)
2. **Environment variables** (NODE_ENV, PORT, etc.)
3. **web.config settings** (this file)
4. **Code defaults** (hardcoded in config.cjs)

**So:** If `.env` has `PORT=3000`, it overrides `web.config` PORT setting.

---

## 🛠️ Common Changes

### Change Database to PostgreSQL

```xml
<!-- Replace SQLite with PostgreSQL -->
<add name="KitchenDatabase" 
     connectionString="Server=db.example.com;Port=5432;Database=kitchen;User Id=admin;Password=secure;SslMode=Require;" 
     providerName="PostgreSQL" />

<!-- Update backend/server.cjs to use PostgreSQL driver -->
```

### Add Production Domain

```xml
<!-- Update URLs -->
<add key="VITE_API_BASE_URL" value="https://api.yourdomain.com" />
<add key="FRONTEND_URL" value="https://yourdomain.com" />

<!-- Add CORS origin in IIS section -->
<add origin="https://yourdomain.com" allowed="true" />
```

### Disable Backups

```xml
<add key="BACKUP_ENABLED" value="false" />
```

### Enable Debug Logging

```xml
<add key="LOG_LEVEL" value="debug" />
<add key="LOG_SQL" value="true" />
<add key="LOG_REQUESTS" value="true" />
```

---

## 🚨 Security Best Practices

### Never Hardcode Secrets
❌ **Bad:**
```xml
<add key="JWT_SECRET" value="my-secret-key-12345" />
```

✅ **Good:**
```xml
<!-- web.config (placeholder) -->
<add key="JWT_SECRET" value="CHANGE-THIS-IN-PRODUCTION" />

<!-- .env (actual secret, not in git) -->
JWT_SECRET=<generate-with-node-crypto-randomBytes>
```

### Keep .env Out of Git
```bash
# .gitignore
.env
web.config
*.local.config
```

### Use HTTPS in Production
```xml
<add key="VITE_API_BASE_URL" value="https://yourdomain.com" />
```

### Rotate Secrets Regularly
Every 6-12 months:
1. Generate new JWT_SECRET
2. Deploy to servers
3. Old tokens become invalid (users re-login)
4. Update password in secure vault

---

## 📞 Troubleshooting

### "Cannot read JWT_SECRET"
**Problem:** web.config not being read
**Fix:** Make sure backend/config.cjs loads settings:
```javascript
const config = require("./config.cjs");
config.validate();  // Check for errors
```

### "Database connection failed"
**Problem:** Wrong connection string
**Fix:** 
1. Check database is running
2. Verify credentials in connection string
3. Test connection before deploying

### "CORS error: origin not allowed"
**Problem:** Frontend URL not in CORS whitelist
**Fix:** Add your domain to web.config:
```xml
<add origin="https://yourdomain.com" allowed="true" />
```

### "Images not uploading"
**Problem:** Cloudinary not configured
**Fix:**
1. Add credentials to web.config, OR
2. Remove Cloudinary and use placeholders

---

## 🔄 IIS/Azure Deployment

### Step 1: Update web.config

Edit these before deploying:
- JWT_SECRET (generate random)
- Database connection string
- VITE_API_BASE_URL (your domain)
- FRONTEND_URL (your domain)
- Cloudinary credentials (if using)

### Step 2: Deploy

On IIS/Azure, place `web.config` in:
- **IIS:** `C:\inetpub\wwwroot\`
- **Azure App Service:** Root of your project

### Step 3: Restart Application

```powershell
# IIS PowerShell
Restart-WebAppPool -Name "Your App Pool"

# Or through IIS Manager
# Right-click app pool → Restart
```

### Step 4: Test

```bash
# Check settings are loaded
curl https://yourdomain.com/api/health

# Should return: { status: "ok", tables: ... }
```

---

## 📚 Related Documentation

- **Project Setup:** See `DEPLOY.md`
- **Configuration System:** See `backend/config.cjs`
- **Environment Variables:** See `.env.example`
- **Database Management:** See `DATABASE_MANAGEMENT.md`

---

Everything is ready to configure! 🎉

