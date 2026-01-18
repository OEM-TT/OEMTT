# OEM TechTalk - Render Setup Guide

**Database:** PostgreSQL on Render  
**Backend:** Node.js on Render  
**File Storage:** PostgreSQL (initial) → Supabase Storage (later)

---

## 🚀 Quick Setup

### 1. Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. No credit card needed for free tier

---

## 📊 Step 1: Set Up PostgreSQL Database

### Create Database

1. **Dashboard → New → PostgreSQL**
2. **Settings:**
   - Name: `oemtechtalk-db`
   - Database: `oemtechtalk`
   - User: `oemtechtalk_user`
   - Region: Choose closest to you
   - Plan: **Free** (or Starter $7/month for better performance)

3. **Click "Create Database"**

4. **Get Connection String:**
   - After creation, copy the **External Database URL**
   - Format: `postgresql://user:password@host/database`
   - Save this for your `.env` file

### Enable pgvector Extension

Once database is created:

1. Go to database dashboard
2. Click **"Connect"** → **"PSQL Command"**
3. Run this SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

That's it! Your PostgreSQL is ready with vector support for embeddings.

---

## 🖥️ Step 2: Set Up Backend API (Later)

### Create Web Service

1. **Dashboard → New → Web Service**
2. **Connect your GitHub repo**
3. **Settings:**
   - Name: `oemtechtalk-api`
   - Environment: `Node`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Plan: **Free** (or Starter for production)

4. **Environment Variables:**
   Add these in the "Environment" section:
   ```bash
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=[paste your database URL from step 1]
   ```

---

## 🗄️ File Storage Options

### Option 1: PostgreSQL Storage (Start Here - Simple!)

**Pros:**
- ✅ No additional service needed
- ✅ Already have PostgreSQL
- ✅ Free
- ✅ ACID compliance

**Cons:**
- ⚠️ Database size grows with files
- ⚠️ Slower for large files (>10MB)

**Implementation:**
```sql
-- Add file storage to manuals table
ALTER TABLE manuals 
ADD COLUMN file_data BYTEA,
ADD COLUMN file_size INT;
```

**Use when:**
- Getting started (Phase 0-2)
- Files are mostly small (<5MB)
- You want simplicity

---

### Option 2: Supabase Storage (Recommended for Scale)

**Pros:**
- ✅ Free tier: 1GB storage
- ✅ Simple API
- ✅ CDN included
- ✅ Built on PostgreSQL
- ✅ No AWS needed

**Cons:**
- Need separate account

**Setup:**

1. **Create Supabase project:**
   - Go to https://supabase.com
   - New Project
   - Choose same region as Render
   - Free tier is perfect

2. **Create storage bucket:**
   ```javascript
   // In Supabase dashboard → Storage → Create bucket
   Bucket name: manuals
   Public: false
   ```

3. **Get credentials:**
   - Project URL: `https://your-project.supabase.co`
   - API Key: Found in Settings → API

4. **Add to backend .env:**
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

5. **Install client:**
   ```bash
   cd backend
   npm install @supabase/supabase-js
   ```

**Use when:**
- Ready to scale (Phase 3+)
- Storing many/large PDFs
- Want CDN for fast downloads

---

### Option 3: Cloudflare R2 (Best Price for Growth)

**Pros:**
- ✅ Very cheap: $0.015/GB
- ✅ No egress fees
- ✅ S3-compatible (easy migration)

**Cons:**
- Requires payment method
- Minimum $5/month if using API

**Setup:**

1. **Create Cloudflare account**
2. **R2 → Create bucket**
3. **Get credentials** (same as S3)
4. **Use S3-compatible SDK**

**Use when:**
- Phase 4+ (production scale)
- Storing 100s of GBs
- Budget conscious

---

## 🔧 Local Development Setup

### 1. Install PostgreSQL Locally (Optional)

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Or use Render database directly** (easier):
- Just use the External Database URL
- Works from anywhere
- No local install needed

### 2. Backend .env Configuration

Create `backend/.env.development`:

```bash
NODE_ENV=development
PORT=3000

# Render PostgreSQL (use External URL)
DATABASE_URL=postgresql://user:password@host/database

# Redis (optional - can skip for now)
# REDIS_URL=redis://localhost:6379

# OpenAI API
OPENAI_API_KEY=sk-your_key_here

# Perplexity API
PERPLEXITY_API_KEY=your_key_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=dev-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=30d

# Email (use Gmail for dev)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@oemtechtalk.com

# File Storage Strategy
STORAGE_TYPE=postgresql
# Later: STORAGE_TYPE=supabase
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-key
```

---

## 📝 Prisma Setup

### 1. Create Prisma Schema

File: `backend/src/db/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [vector]
}

model User {
  id                   String   @id @default(uuid())
  email                String   @unique
  name                 String?
  phone                String?
  role                 String   @default("technician")
  subscriptionTier     String   @default("free")
  subscriptionStatus   String   @default("active")
  companyId            String?
  stripeCustomerId     String?
  createdAt            DateTime @default(now())
  lastActiveAt         DateTime?
  onboardingCompleted  Boolean  @default(false)

  @@index([email])
}

model Manual {
  id              String   @id @default(uuid())
  modelId         String
  manualType      String
  title           String
  revision        String?
  publishDate     DateTime?
  sourceUrl       String?
  sourceType      String   @default("oem")
  fileUrl         String?
  fileData        Bytes?   // Store PDF in database
  fileSize        Int?
  fileHash        String?
  pageCount       Int?
  language        String   @default("en")
  confidenceScore Float    @default(1.0)
  status          String   @default("pending")
  verifiedAt      DateTime?
  verifiedBy      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([modelId])
  @@index([status])
}

// Add more models as needed...
```

### 2. Run Prisma Commands

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or create migration (for production)
npm run db:migrate
```

---

## 🎯 Recommended Path

### Phase 0-1: Start Simple
```
✅ PostgreSQL on Render (database)
✅ Store PDFs in PostgreSQL (fileData column)
✅ Backend API on Render
✅ Mobile app points to Render API
```

### Phase 2-3: Scale Storage
```
✅ Move PDFs to Supabase Storage
✅ Keep metadata in PostgreSQL
✅ CDN for fast downloads
```

### Phase 4+: Optimize
```
✅ Consider Cloudflare R2 if cost matters
✅ Or stick with Supabase if working well
```

---

## 💰 Cost Estimate

### Free Tier (Getting Started)
- Render PostgreSQL: **Free** (512MB RAM, 1GB storage)
- Render Web Service: **Free** (512MB RAM)
- Supabase Storage: **Free** (1GB)
- **Total: $0/month**

### Production Starter
- Render PostgreSQL Starter: **$7/month** (1GB RAM, 10GB storage)
- Render Web Service Starter: **$7/month** (512MB RAM)
- Supabase Pro: **$25/month** (8GB storage, 50GB bandwidth)
- **Total: $39/month** (scales to 1000s of users)

---

## 🔑 Required API Keys

You'll need:
1. ✅ **OpenAI API Key** - https://platform.openai.com/api-keys
2. ✅ **Perplexity API Key** - https://www.perplexity.ai/settings/api
3. ✅ **Stripe Keys** - https://dashboard.stripe.com/test/apikeys
4. 🔜 **Supabase** (later) - https://supabase.com

---

## ✅ Next Steps

1. **Create Render PostgreSQL database** (5 minutes)
2. **Copy connection string to .env**
3. **Enable pgvector extension**
4. **Create Prisma schema**
5. **Run migrations**
6. **Start building!**

---

**No AWS needed! Everything on Render + optional Supabase.** 🚀
