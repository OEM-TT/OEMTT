# OEM TechTalk - Supabase Setup Guide

**All-in-One Solution:**
- ✅ Database: PostgreSQL with pgvector
- ✅ Storage: File storage for PDFs
- ✅ Auth: Built-in authentication with magic links
- ✅ Email: Built-in email service

**Project:** gigsbcb@gmail.com's Project  
**Password:** F6fwRMq5lvZM4xmG

---

## 🎯 What Supabase Replaces

### Before (Complex):
- Custom JWT auth ❌
- nodemailer for emails ❌
- jsonwebtoken library ❌
- bcrypt for passwords ❌
- Custom token management ❌
- Separate file storage ❌

### After (Simple):
- Supabase Auth ✅ (handles everything)
- Supabase Storage ✅ (PDFs)
- Supabase Database ✅ (PostgreSQL)
- One SDK, one service ✅

---

## 🚀 Step 1: Get Your Credentials

1. **Go to your Supabase project:**
   - https://supabase.com/dashboard/projects

2. **Settings → API**
   - Copy these values:

```
Project URL: https://[your-project-ref].supabase.co
Anon Key: eyJhbGc... (long key)
Service Role Key: eyJhbGc... (different key)
```

3. **Settings → Database**
   - Connection string is auto-generated
   - Format: `postgresql://postgres.xxxxx:F6fwRMq5lvZM4xmG@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

---

## 📊 Step 2: Set Up Database

### Enable pgvector Extension

1. **SQL Editor → New Query**
2. **Run this:**

```sql
-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Create Initial Tables (we'll use Prisma for this later)

Just verify the extension works for now. We'll create tables with Prisma.

---

## 🗄️ Step 3: Set Up Storage

### Create Storage Bucket

1. **Storage → Create Bucket**
   - Name: `manuals`
   - Public: `No` (private files)
   - File size limit: `50MB`
   - Allowed MIME types: `application/pdf`

2. **Create Bucket Policies**

Click on `manuals` bucket → Policies → New Policy

**Policy 1: Allow authenticated users to read:**
```sql
CREATE POLICY "Authenticated users can read manuals"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'manuals');
```

**Policy 2: Service role can insert:**
```sql
CREATE POLICY "Service role can upload manuals"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'manuals');
```

**Policy 3: Service role can delete:**
```sql
CREATE POLICY "Service role can delete manuals"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'manuals');
```

---

## 🔐 Step 4: Configure Authentication

### Enable Email Auth

1. **Authentication → Providers**
2. **Enable Email Provider:**
   - Email Auth: `ON`
   - Confirm Email: `OFF` (for faster dev, turn ON in production)
   - Enable Magic Link: `ON` ✅

### Configure Email Templates

1. **Authentication → Email Templates → Magic Link**

**Subject:**
```
Sign in to OEM TechTalk
```

**Email Body (HTML):**
```html
<h2>Sign in to OEM TechTalk</h2>
<p>Click the button below to sign in to your account.</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Sign In</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p style="color: #6B7280; font-size: 12px;">This link expires in 1 hour.</p>
```

### Configure Site URL & Redirect URLs

1. **Authentication → URL Configuration**

**Site URL:**
```
exp://localhost:8081
```

**Redirect URLs:**
```
exp://localhost:8081
oemtechtalk://
http://localhost:19006
```

(We'll update these when you deploy)

---

## 🔧 Step 5: Update Environment Variables

### Mobile App `.env.development`

Create/update: `/Users/brentpurks/Desktop/OEMTT/OEMTechTalk/.env.development`

```bash
# API Configuration
API_URL=http://localhost:3000/api

# Supabase Configuration
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here

# Stripe (Test Keys)
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Environment
NODE_ENV=development
```

### Backend `.env.development`

Create/update: `/Users/brentpurks/Desktop/OEMTT/OEMTechTalk/backend/.env.development`

```bash
NODE_ENV=development
PORT=3000

# Supabase Database (for Prisma)
DATABASE_URL=postgresql://postgres.[project-ref]:F6fwRMq5lvZM4xmG@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Supabase API (for Storage, Auth, etc.)
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key-here

# OpenAI API
OPENAI_API_KEY=sk-your_key_here

# Perplexity API
PERPLEXITY_API_KEY=your_key_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📦 Step 6: Install Supabase Packages

### Mobile App

```bash
npm install @supabase/supabase-js
```

### Backend

```bash
cd backend
npm install @supabase/supabase-js
```

---

## 💻 Step 7: Configure Supabase Clients

### Mobile App Client

Create: `/Users/brentpurks/Desktop/OEMTT/OEMTechTalk/services/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Backend Client

Create: `/Users/brentpurks/Desktop/OEMTT/OEMTechTalk/backend/src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Backend uses service role key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client for user-level operations
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 🔑 Step 8: Implement Auth

### Mobile App - Login Screen

```typescript
// app/(auth)/login.tsx
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { supabase } from '@/services/supabase';
import { theme } from '@/utils/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'oemtechtalk://',
      },
    });
    
    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for the magic link!');
    }
    setLoading(false);
  };

  return (
    <View style={{ padding: theme.spacing.md }}>
      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity onPress={handleMagicLink} disabled={loading}>
        <Text>{loading ? 'Sending...' : 'Send Magic Link'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Mobile App - Auth Context

```typescript
// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 📁 Step 9: File Storage Usage

### Backend - Upload Manual

```typescript
// backend/src/services/storage/manualStorage.ts
import { supabase } from '@/config/supabase';

export async function uploadManual(
  manualId: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<string> {
  const path = `${manualId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('manuals')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw error;

  // Get signed URL (valid for 1 hour)
  const { data: urlData } = await supabase.storage
    .from('manuals')
    .createSignedUrl(path, 3600);

  return urlData!.signedUrl;
}

export async function getManualUrl(manualId: string, filename: string): Promise<string> {
  const path = `${manualId}/${filename}`;
  
  const { data } = await supabase.storage
    .from('manuals')
    .createSignedUrl(path, 3600);

  return data!.signedUrl;
}

export async function deleteManual(manualId: string, filename: string): Promise<void> {
  const path = `${manualId}/${filename}`;
  
  const { error } = await supabase.storage
    .from('manuals')
    .remove([path]);

  if (error) throw error;
}
```

---

## 🗃️ Step 10: Database Schema with Prisma

### Create Prisma Schema

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

// Supabase Auth tables (reference only, managed by Supabase)
// We'll extend the auth.users table with our own users table

model User {
  id                   String   @id @default(uuid())
  email                String   @unique
  supabaseUserId       String   @unique @map("supabase_user_id")
  name                 String?
  phone                String?
  role                 String   @default("technician")
  subscriptionTier     String   @default("free") @map("subscription_tier")
  subscriptionStatus   String   @default("active") @map("subscription_status")
  companyId            String?  @map("company_id")
  stripeCustomerId     String?  @map("stripe_customer_id")
  createdAt            DateTime @default(now()) @map("created_at")
  lastActiveAt         DateTime? @map("last_active_at")
  onboardingCompleted  Boolean  @default(false) @map("onboarding_completed")

  savedUnits           SavedUnit[]
  questions            Question[]
  feedback             Feedback[]

  @@index([email])
  @@index([supabaseUserId])
  @@map("users")
}

model OEM {
  id                  String   @id @default(uuid())
  name                String   @unique
  vertical            String
  website             String?
  logoUrl             String?  @map("logo_url")
  documentationPortals String[] @map("documentation_portals")
  regionsSupported    String[] @map("regions_supported")
  status              String   @default("active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  productLines        ProductLine[]

  @@index([vertical])
  @@map("oems")
}

model ProductLine {
  id          String   @id @default(uuid())
  oemId       String   @map("oem_id")
  name        String
  category    String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  oem         OEM      @relation(fields: [oemId], references: [id], onDelete: Cascade)
  models      Model[]

  @@index([oemId])
  @@map("product_lines")
}

model Model {
  id                    String   @id @default(uuid())
  productLineId         String   @map("product_line_id")
  modelNumber           String   @map("model_number")
  variants              String[]
  serialNumberPatterns  String[] @map("serial_number_patterns")
  yearsActive           Int[]    @map("years_active")
  specifications        Json?
  discontinued          Boolean  @default(false)
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  productLine           ProductLine @relation(fields: [productLineId], references: [id], onDelete: Cascade)
  manuals               Manual[]
  savedUnits            SavedUnit[]
  questions             Question[]

  @@index([productLineId])
  @@index([modelNumber])
  @@map("models")
}

model Manual {
  id              String    @id @default(uuid())
  modelId         String    @map("model_id")
  manualType      String    @map("manual_type")
  title           String
  revision        String?
  publishDate     DateTime? @map("publish_date")
  sourceUrl       String?   @map("source_url")
  sourceType      String    @default("oem") @map("source_type")
  storagePath     String?   @map("storage_path") // Supabase Storage path
  fileHash        String?   @map("file_hash")
  pageCount       Int?      @map("page_count")
  language        String    @default("en")
  confidenceScore Float     @default(1.0) @map("confidence_score")
  status          String    @default("pending")
  verifiedAt      DateTime? @map("verified_at")
  verifiedBy      String?   @map("verified_by")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  model           Model           @relation(fields: [modelId], references: [id], onDelete: Cascade)
  sections        ManualSection[]
  questions       Question[]
  feedback        Feedback[]

  @@index([modelId])
  @@index([status])
  @@index([confidenceScore])
  @@map("manuals")
}

model ManualSection {
  id            String   @id @default(uuid())
  manualId      String   @map("manual_id")
  sectionTitle  String?  @map("section_title")
  sectionType   String   @map("section_type")
  content       String   @db.Text
  pageReference String?  @map("page_reference")
  embedding     Unsupported("vector(3072)")?
  metadata      Json?
  createdAt     DateTime @default(now()) @map("created_at")

  manual        Manual   @relation(fields: [manualId], references: [id], onDelete: Cascade)

  @@index([manualId])
  @@index([sectionType])
  @@map("manual_sections")
}

model SavedUnit {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  modelId      String    @map("model_id")
  nickname     String
  serialNumber String?   @map("serial_number")
  installDate  DateTime? @map("install_date")
  location     String?
  notes        String?   @db.Text
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  model        Model     @relation(fields: [modelId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([modelId])
  @@map("saved_units")
}

model Question {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  modelId          String    @map("model_id")
  manualId         String?   @map("manual_id")
  questionText     String    @map("question_text") @db.Text
  context          Json?
  answerText       String?   @map("answer_text") @db.Text
  answerSources    Json?     @map("answer_sources")
  confidenceScore  Float?    @map("confidence_score")
  processingTimeMs Int?      @map("processing_time_ms")
  createdAt        DateTime  @default(now()) @map("created_at")

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  model            Model     @relation(fields: [modelId], references: [id], onDelete: Cascade)
  manual           Manual?   @relation(fields: [manualId], references: [id], onDelete: SetNull)
  feedback         Feedback[]

  @@index([userId])
  @@index([modelId])
  @@index([createdAt])
  @@map("questions")
}

model Feedback {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  questionId      String?  @map("question_id")
  manualId        String?  @map("manual_id")
  feedbackType    String   @map("feedback_type")
  rating          Int?
  rejectionReason String?  @map("rejection_reason")
  comment         String?  @db.Text
  userWeight      Float    @default(1.0) @map("user_weight")
  createdAt       DateTime @default(now()) @map("created_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question        Question? @relation(fields: [questionId], references: [id], onDelete: SetNull)
  manual          Manual?  @relation(fields: [manualId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([questionId])
  @@index([manualId])
  @@index([feedbackType])
  @@map("feedback")
}
```

### Run Prisma Commands

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

---

## ✅ What We Removed

With Supabase handling auth, we can remove:
- ❌ `jsonwebtoken` package
- ❌ `bcrypt` package
- ❌ `nodemailer` package
- ❌ Custom JWT logic
- ❌ Token refresh logic
- ❌ Email sending service
- ❌ Password hashing
- ❌ AWS S3 SDK

**Result:** Simpler, cleaner, easier to maintain!

---

## 🎯 Next Steps

1. **Get your Supabase credentials:**
   - Project URL
   - Anon Key
   - Service Role Key
   - Database URL

2. **Update .env files** with real values

3. **Install packages:**
   ```bash
   npm install @supabase/supabase-js
   cd backend && npm install @supabase/supabase-js
   ```

4. **Set up storage bucket**

5. **Enable auth providers**

6. **Create Prisma schema**

7. **Start building!**

---

## 📚 Resources

- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/docs/guides/storage
- Prisma + Supabase: https://supabase.com/docs/guides/integrations/prisma

---

**Everything in one place with Supabase!** 🚀
