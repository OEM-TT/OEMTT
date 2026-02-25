# Environment Setup Instructions

## ⚠️ IMPORTANT: Manual .env File Updates Required

Your `.env` files are protected by gitignore. Please manually update them with the values below:

---

## Backend Environment File

**File:** `/backend/.env.development`

**UPDATE THIS LINE:**
```bash
# Change FROM:
DATABASE_URL=postgresql://postgres.yoggiqlslhutwjhuhqda:F6fwRMq5lvZM4xmG@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Change TO (use direct connection):
DATABASE_URL=postgresql://postgres:F6fwRMq5lvZM4xmG@db.yoggiqlslhutwjhuhqda.supabase.co:5432/postgres
```

**✅ All other values in backend/.env.development are correct!**

---

## Mobile App Environment File

**File:** `/.env.development`

**PASTE THIS CONTENT:**
```bash
# Mobile App Environment Variables

# API Configuration
API_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://yoggiqlslhutwjhuhqda.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ2dpcWxzbGh1dHdqaHVocWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTUwNzQsImV4cCI6MjA4NDI3MTA3NH0.yq8PZbRjcqKYU1-U5mocw5Kfr4JtyA7iN-OBv0AVVVw
```

---

## Why the Connection String Change?

- **Direct Connection (port 5432)**: More reliable for Prisma migrations and development
- **Pooler Connection (port 6543)**: Better for production high-traffic scenarios
- For development, direct connection is preferred

---

## Next Steps After Updating .env Files:

1. **Restart the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   
   Should return:
   ```json
   {
     "success": true,
     "data": {
       "status": "healthy",
       "timestamp": "...",
       "database": "connected"
     }
   }
   ```

3. **Start the mobile app:**
   ```bash
   npm start
   ```

---

## Troubleshooting

If you still see "Tenant or user not found" error:
1. Double-check the DATABASE_URL was updated correctly
2. Make sure there are no extra spaces or line breaks
3. Verify the password is exactly: `F6fwRMq5lvZM4xmG`

If the health check fails:
1. Check backend terminal for errors
2. Verify port 3000 is not in use: `lsof -i :3000`
3. Check that Prisma generated correctly: `cd backend && npx prisma generate`
