# Fix Render → Supabase Connection

## The Problem
Render can't connect to your Supabase database. This is usually due to:
1. Supabase blocking external connections
2. Need to use connection pooling
3. IPv6 restrictions

## Fix Steps:

### 1. Go to Supabase Dashboard
https://supabase.com/dashboard/project/yoggiqlslhutwjhuhqda/settings/database

### 2. Check "Connection Pooling"
- Look for **"Connection Pooling"** section
- You should see a connection string like:
  ```
  postgresql://postgres.yoggiqlslhutwjhuhqda:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
  ```
- **Copy this URL** (it uses port `6543` not `5432`)

### 3. Update DATABASE_URL in Render
1. Go to your Render service dashboard
2. Click **"Environment"** tab
3. Find `DATABASE_URL` variable
4. **Replace** with the **Connection Pooling URL** from step 2
5. Add `?pgbouncer=true` at the end:
   ```
   postgresql://postgres.yoggiqlslhutwjhuhqda:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 4. Save & Redeploy
- Click **"Save Changes"**
- Render will auto-redeploy

## Alternative: Disable IPv6-Only Mode
If connection pooling doesn't work:
1. In Supabase → Settings → Database
2. Look for **"IPv6 Add-on"** or **"Restrict to IPv6"**
3. **Disable** it if enabled

