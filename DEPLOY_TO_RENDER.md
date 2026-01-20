# Deploy Backend to Render (Free)

## 🚀 Quick Deploy (5 minutes)

### 1. **Push to GitHub**
```bash
cd /Users/brentpurks/Desktop/OEMTT/OEMTechTalk
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. **Create Render Account**
1. Go to https://render.com
2. Sign up (free) with GitHub

### 3. **Create New Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repo: `OEMTechTalk`
3. **Root Directory**: `backend`
4. **Environment**: `Node`
5. **Build Command**: `npm install && npx prisma generate && npm run build`
6. **Start Command**: `npm start`
7. **Plan**: **Free** (select this!)

### 4. **Add Environment Variables**
Click "Advanced" → Add these environment variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:F6fwRMq5lvZM4xmG@db.yoggiqlslhutwjhuhqda.supabase.co:5432/postgres?sslmode=require
SUPABASE_URL=https://yoggiqlslhutwjhuhqda.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ2dpcWxzbGh1dHdqaHVocWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTUwNzQsImV4cCI6MjA4NDI3MTA3NH0.yq8PZbRjcqKYU1-U5mocw5Kfr4JtyA7iN-OBv0AVVVw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ2dpcWxzbGh1dHdqaHVocWRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY5NTA3NCwiZXhwIjoyMDg0MjcxMDc0fQ.hMHbxxqvoJogRaDOyRFS_re9bBD83W-GzSvXLc1aXA4
```

### 5. **Deploy**
Click "Create Web Service"

Render will:
- Install dependencies
- Build your TypeScript code
- Start the server
- Give you a URL like: `https://oemtechtalk-api.onrender.com`

**Note**: First deploy takes 3-5 minutes. Free tier spins down after 15 min of inactivity (first request after sleep takes 30sec).

---

## 📱 Update Mobile App

Once deployed, update `app.json`:

```json
"extra": {
  "API_URL": "https://oemtechtalk-api.onrender.com/api"
}
```

Then restart your app:
```bash
npm start -- --clear
```

---

## ✅ Test Your Deployed API

```bash
curl https://oemtechtalk-api.onrender.com/api/health
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

---

## 🎉 Done!

Now **ANYONE** can use your app from **ANY DEVICE**:
- ✅ Your iPhone
- ✅ Partner's iPhone  
- ✅ Simulator
- ✅ Android
- ✅ Any computer

The backend is hosted and accessible from anywhere! 🌍
