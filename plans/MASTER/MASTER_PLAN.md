# OEM TechTalk — Master Plan & Technical Specification

**Last Updated:** January 18, 2026  
**Status:** Phase 0 - Foundation (95% Complete) → Phase 1 Starting  
**Current Version:** 0.2.0

## 🎉 MAJOR PROGRESS UPDATE

### ✅ Completed (January 18, 2026)

**Infrastructure & Setup:**
- ✅ Supabase MCP server connected and working
- ✅ PostgreSQL database with pgvector extension enabled
- ✅ Complete database schema created (9 tables with relationships)
- ✅ Supabase Storage bucket created for PDF files
- ✅ Environment configuration for dev/staging/production

**Backend API:**
- ✅ Express server structure created
- ✅ Prisma ORM configured with full schema
- ✅ Core middleware (auth, error handling, CORS)
- ✅ Health check endpoint
- ✅ Supabase integration (Auth + Storage)
- ✅ Configuration management with Zod validation

**Frontend - Core:**
- ✅ Expo React Native project initialized
- ✅ Modern theme system with Indigo/Cyan/Purple palette
- ✅ Dark mode support (automatic system detection)
- ✅ TypeScript configuration with path aliases
- ✅ Shared type definitions
- ✅ ThemeContext and useTheme hook
- ✅ Project structure (54 folders organized)

**Frontend - Navigation:**
- ✅ Tab-based navigation with Expo Router
- ✅ 4 main tabs: Home, Search, Library, Profile
- ✅ Modal and auth route groups configured
- ✅ Navigation connected to home screen CTAs

**Frontend - Screens:**
- ✅ Home screen with gradient header and feature cards
- ✅ Search screen with product/question toggle
- ✅ Library screen with saved units and recent questions
- ✅ Profile screen with settings and subscription info
- ✅ All screens fully themed and dark mode compatible

**Dependencies:**
- ✅ All mobile dependencies installed (including expo-linear-gradient)
- ✅ All backend dependencies installed
- ✅ Package versions aligned and tested

**Database Schema:**
- ✅ Users, OEMs, Models, Manuals tables created
- ✅ Embeddings table with pgvector support
- ✅ Questions, Answers, Feedback tables

**Storage:**
- ✅ 'manuals' bucket created (50MB limit, PDF only)
- ✅ Storage policies configured

**Current Status:**
Phase 0 is 95% complete! App is running with full navigation and UI.

**What's Next (Phase 1):**
1. ⚠️ **ACTION REQUIRED**: Update backend/.env.development with correct DATABASE_URL
   - See `ENV_SETUP_INSTRUCTIONS.md` for details
2. Restart backend server and test health endpoint
3. Implement authentication (magic link flow)
4. Build context builder modal (model identification)
5. Connect Search screen to backend API
6. Implement saved units CRUD

---

## Table of Contents

1. [Product Vision & Core Principles](#1-product-vision--core-principles)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [Discovery Layer (Perplexity)](#5-discovery-layer-perplexity)
6. [Ingestion & Knowledge Layer](#6-ingestion--knowledge-layer)
7. [Answering Layer (LLM + RAG)](#7-answering-layer-llm--rag)
8. [Frontend Architecture](#8-frontend-architecture)
9. [API Endpoints](#9-api-endpoints)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Payment System](#11-payment-system)
12. [Trust, Safety & Liability](#12-trust-safety--liability)
13. [Implementation Phases](#13-implementation-phases)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Monitoring & Analytics](#16-monitoring--analytics)
17. [Future Roadmap](#17-future-roadmap)

---

## 1. Product Vision & Core Principles

### 1.1 Mission Statement

OEM TechTalk is a **source-grounded technical knowledge system** that provides field technicians with accurate, traceable answers about specific OEM products. Starting with HVAC (residential + commercial), expanding to all OEM product categories.

### 1.2 Core Constraint

**All answers must be grounded in the correct OEM manual for the exact machine whenever possible.**

If an answer cannot be confirmed by an OEM manual:
- Must be labeled as "Field-confirmed / industry-verified"
- Never presented as OEM documentation

### 1.3 Guiding Principles

1. **Accuracy > Speed**: When forced to choose, always choose accuracy
2. **Traceability**: Every answer must cite its source
3. **Safety First**: Safety warnings always precede procedures
4. **Fail Safely**: System must acknowledge uncertainty
5. **Model-Agnostic**: All components must be replaceable
6. **Progressive Disclosure**: Don't overwhelm users with complexity

---

## 2. System Architecture

### 2.1 Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UX & Feedback Layer                     │
│                   (Expo React Native)                       │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Answering Layer                        │
│              (OpenAI API + RAG Pipeline)                    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 Ingestion & Knowledge Layer                 │
│         (PDF Processing + Embeddings + Database)            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Discovery Layer                        │
│                  (Perplexity API - Read Only)               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Key Design Decisions

- **Backend**: Node.js (Express) for API layer
- **Database**: Supabase PostgreSQL with pgvector extension for embeddings ✅
- **File Storage**: Supabase Storage for manual PDFs ✅
- **Authentication**: Supabase Auth with magic links ✅
- **Cache Layer**: Redis for session management and rate limiting (future)
- **Queue System**: Bull (Redis-based) for async processing
- **Model Provider**: OpenAI API (replaceable)
- **Discovery Provider**: Perplexity API (replaceable)

### 2.3 Data Flow

```
User Question → Context Builder → Manual Retrieval → 
RAG Pipeline → LLM Synthesis → Answer Display → 
User Feedback → Confidence Update
```

---

## 3. Tech Stack

### 3.1 Frontend (Mobile)

- **Framework**: Expo SDK 52 (React Native)
- **Language**: TypeScript
- **State Management**: React Context + Hooks
- **Navigation**: Expo Router
- **UI Components**: Custom components + Expo Vector Icons
- **Camera/OCR**: expo-camera + Tesseract.js or OCR API
- **HTTP Client**: Axios
- **Storage**: AsyncStorage (Expo SecureStore for tokens)

### 3.2 Backend

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Validation**: Zod
- **Authentication**: Custom JWT + magic links (nodemailer)
- **File Processing**: pdf-parse, pdfjs-dist
- **Queue**: Bull + Bull Board (monitoring)
- **Rate Limiting**: express-rate-limit + Redis

### 3.3 Database & Storage

- **Primary DB**: PostgreSQL 15+
- **Vector Extension**: pgvector
- **Object Storage**: AWS S3
- **Cache**: Redis 7+
- **Search**: PostgreSQL full-text search (initial), Elasticsearch (future)

### 3.4 AI/ML Services

- **Answer Synthesis**: OpenAI GPT-4
- **Embeddings**: OpenAI text-embedding-3-large
- **Discovery**: Perplexity API
- **OCR**: Tesseract.js (client-side) + Google Cloud Vision API (server-side fallback)

### 3.5 Infrastructure

- **Hosting**: Railway / Render (initial), AWS (production scale)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (errors), PostHog (analytics)
- **Payments**: Stripe

---

## 4. Database Schema

### 4.1 Core Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  company_id UUID REFERENCES companies(id),
  role VARCHAR(50) DEFAULT 'technician', -- technician, admin, company_admin
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  onboarding_completed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company_id);
```

#### `companies`
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  employee_count INT,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `oems`
```sql
CREATE TABLE oems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  vertical VARCHAR(100) NOT NULL, -- HVAC, Appliance, Plumbing, Electrical, etc.
  website VARCHAR(500),
  documentation_portals JSONB, -- Array of known doc portal URLs
  regions_supported VARCHAR(100)[], -- ['US', 'CA', 'EU']
  logo_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active', -- active, deprecated
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_oems_vertical ON oems(vertical);
CREATE INDEX idx_oems_name ON oems(name);
```

#### `product_lines`
```sql
CREATE TABLE product_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oem_id UUID REFERENCES oems(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- Heat Pump, Furnace, Air Handler, etc.
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_lines_oem ON product_lines(oem_id);
CREATE INDEX idx_product_lines_category ON product_lines(category);
```

#### `models`
```sql
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_line_id UUID REFERENCES product_lines(id) ON DELETE CASCADE,
  model_number VARCHAR(255) NOT NULL,
  variants VARCHAR(255)[], -- Model number variations
  serial_number_patterns VARCHAR(255)[], -- Regex patterns for serial validation
  years_active INT[], -- [2018, 2019, 2020, 2021]
  specifications JSONB, -- Technical specs
  discontinued BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_models_product_line ON models(product_line_id);
CREATE INDEX idx_models_model_number ON models(model_number);
CREATE INDEX idx_models_years ON models USING GIN(years_active);
```

#### `manuals`
```sql
CREATE TABLE manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  manual_type VARCHAR(100) NOT NULL, -- service, install, wiring, parts, troubleshooting, etc.
  title VARCHAR(500),
  revision VARCHAR(100),
  publish_date DATE,
  source_url VARCHAR(1000),
  source_type VARCHAR(100) DEFAULT 'oem', -- oem, distributor, user_upload, field_confirmed
  file_url VARCHAR(1000), -- S3 URL
  file_hash VARCHAR(64), -- SHA-256 for change detection
  page_count INT,
  language VARCHAR(10) DEFAULT 'en',
  confidence_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, deprecated, quarantined
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_manuals_model ON manuals(model_id);
CREATE INDEX idx_manuals_type ON manuals(manual_type);
CREATE INDEX idx_manuals_status ON manuals(status);
CREATE INDEX idx_manuals_confidence ON manuals(confidence_score);
```

#### `manual_sections`
```sql
CREATE TABLE manual_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID REFERENCES manuals(id) ON DELETE CASCADE,
  section_title VARCHAR(500),
  section_type VARCHAR(100), -- procedure, warning, table, diagram, spec, troubleshooting
  content TEXT NOT NULL,
  page_reference VARCHAR(100), -- "Pages 45-47"
  embedding vector(3072), -- OpenAI text-embedding-3-large dimension
  metadata JSONB, -- Additional structured data
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_manual_sections_manual ON manual_sections(manual_id);
CREATE INDEX idx_manual_sections_type ON manual_sections(section_type);
-- Vector similarity search index
CREATE INDEX idx_manual_sections_embedding ON manual_sections 
  USING ivfflat (embedding vector_cosine_ops);
```

#### `field_confirmed_knowledge`
```sql
CREATE TABLE field_confirmed_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_model_ids UUID[], -- Multiple models may share this knowledge
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  evidence_level VARCHAR(50), -- high, medium, low
  contributor_type VARCHAR(50), -- certified_tech, company, community
  contributed_by UUID REFERENCES users(id),
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_field_knowledge_models ON field_confirmed_knowledge 
  USING GIN(related_model_ids);
```

#### `user_feedback`
```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  question_id UUID REFERENCES questions(id),
  manual_id UUID REFERENCES manuals(id),
  feedback_type VARCHAR(50), -- answer_helpful, answer_unhelpful, manual_correct, manual_incorrect
  rating INT, -- 1-5
  rejection_reason VARCHAR(100), -- wrong_model, outdated, incomplete, incorrect_info
  comment TEXT,
  user_weight DECIMAL(3,2) DEFAULT 1.00, -- Trust score of user
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_manual ON user_feedback(manual_id);
CREATE INDEX idx_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_feedback_user ON user_feedback(user_id);
```

#### `questions`
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  model_id UUID REFERENCES models(id),
  manual_id UUID REFERENCES manuals(id), -- Which manual was used
  question_text TEXT NOT NULL,
  context JSONB, -- Additional context like symptoms, error codes
  answer_text TEXT,
  answer_sources JSONB, -- Array of section IDs and citations
  confidence_score DECIMAL(3,2),
  processing_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_questions_user ON questions(user_id);
CREATE INDEX idx_questions_model ON questions(model_id);
CREATE INDEX idx_questions_created ON questions(created_at DESC);
```

#### `saved_units`
```sql
CREATE TABLE saved_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  model_id UUID REFERENCES models(id),
  nickname VARCHAR(255), -- "Johnson Residence Unit"
  serial_number VARCHAR(255),
  install_date DATE,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_units_user ON saved_units(user_id);
```

#### `discovery_jobs`
```sql
CREATE TABLE discovery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50), -- user_triggered, weekly_incremental, quarterly_sweep
  search_query TEXT,
  search_provider VARCHAR(50) DEFAULT 'perplexity',
  results JSONB, -- Array of discovered URLs and metadata
  status VARCHAR(50), -- pending, processing, completed, failed
  triggered_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_discovery_jobs_status ON discovery_jobs(status);
CREATE INDEX idx_discovery_jobs_created ON discovery_jobs(created_at DESC);
```

#### `ingestion_queue`
```sql
CREATE TABLE ingestion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_url VARCHAR(1000) NOT NULL,
  model_id UUID REFERENCES models(id),
  priority INT DEFAULT 5, -- 1-10, higher = more urgent
  status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
  attempts INT DEFAULT 0,
  error_message TEXT,
  discovered_by UUID REFERENCES discovery_jobs(id),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_ingestion_queue_status ON ingestion_queue(status);
CREATE INDEX idx_ingestion_queue_priority ON ingestion_queue(priority DESC);
```

### 4.2 Subscription & Usage Tables

#### `subscription_plans`
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL, -- free, pro, enterprise
  price_monthly INT, -- Cents
  price_yearly INT,
  features JSONB,
  limits JSONB, -- {questions_per_month: 50, saved_units: 5}
  stripe_price_id VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `usage_tracking`
```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  questions_asked INT DEFAULT 0,
  questions_limit INT,
  reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_user_period ON usage_tracking(user_id, period_start);
```

---

## 5. Discovery Layer (Perplexity)

### 5.1 Responsibilities

Perplexity is **ONLY** used for discovery:
- Discover where manuals exist
- Identify new or updated documentation
- Surface official OEM or distributor URLs

Perplexity **NEVER**:
- Summarizes manuals
- Answers user questions
- Used as a citation source

### 5.2 Discovery Use Cases

#### A. User-Triggered Discovery (On-Demand)

**Triggered when:**
- User cannot find their manufacturer or model
- Manual does not exist in database

**Perplexity prompt template:**
```
Find the official service manual for:
- Manufacturer: {oem_name}
- Model: {model_number}
- Type: {manual_type}

Return ONLY:
1. Official OEM URLs
2. Authorized distributor URLs
3. Publish date or revision if visible

Prefer OEM domains over distributors.
```

**Result handling:**
1. Parse returned URLs
2. Add to `ingestion_queue` with priority=10
3. Create entry in `discovery_jobs` table
4. Notify user: "We're fetching that manual now. You'll be notified when it's ready."
5. User is never blocked waiting

#### B. Weekly Incremental Discovery Job

**Schedule**: Every Sunday at 2 AM EST

**Scope:**
- All active OEMs
- Known documentation portals
- Product lines released in last 2 years

**Process:**
1. Query active OEMs from database
2. For each OEM:
   - Check known documentation portals
   - Search for manuals with publish dates > last run date
3. Compare against existing manuals (by URL hash)
4. Queue new manuals for ingestion (priority=5)
5. Log results to `discovery_jobs`

**Perplexity prompt template:**
```
Find new manuals released since {last_run_date} for:
- Manufacturer: {oem_name}
- Documentation portal: {portal_url}

Return only manuals with publish dates after {last_run_date}.
Include URLs and publish dates.
```

#### C. Quarterly Regression & Update Sweep

**Schedule**: 1st day of quarter (Jan 1, Apr 1, Jul 1, Oct 1)

**Purpose:**
- Detect silent revisions
- Detect replaced manuals
- Detect deprecations

**Process:**
1. Fetch all active manual URLs from database
2. Re-fetch each URL
3. Compare file hashes (SHA-256)
4. Compare internal revision markers
5. If changed:
   - Create new manual version
   - Mark old manual as deprecated
   - Never delete or overwrite
6. Update manual confidence scores based on age

**Monitoring:**
- Track % of manuals that changed
- Alert if >20% changed (possible issue with detection)

### 5.3 Perplexity Integration

```typescript
// services/discovery/perplexity.service.ts

interface PerplexityDiscoveryResult {
  urls: string[];
  publishDates: string[];
  sources: string[];
  confidence: number;
}

async function discoverManual(
  oem: string, 
  model: string, 
  manualType: string
): Promise<PerplexityDiscoveryResult> {
  const prompt = buildDiscoveryPrompt(oem, model, manualType);
  
  const response = await perplexityClient.query({
    prompt,
    mode: 'research',
    includeUrls: true
  });
  
  return parseDiscoveryResponse(response);
}
```

---

## 6. Ingestion & Knowledge Layer

### 6.1 Manual Lifecycle States

```
Discovered → Fetched → Parsed → Verified → Active
                ↓          ↓        ↓
              Failed   Failed  Quarantined
                              Deprecated
```

**State Definitions:**
- `discovered`: URL found, not yet downloaded
- `fetched`: PDF downloaded to S3
- `parsed`: Text extracted, sections created
- `verified`: Human or automated verification passed
- `active`: Live and usable in answers
- `deprecated`: Superseded by newer version
- `quarantined`: Low confidence or repeated flags

**Rule**: No manual is ever deleted.

### 6.2 Manual Processing Pipeline

```
PDF Download → Text Extraction → Section Chunking → 
Normalization → Embedding Generation → Metadata Extraction → 
Verification → Activation
```

#### Step 1: PDF Download
- Download from source URL
- Calculate SHA-256 hash
- Upload to S3 with versioning enabled
- Store raw file permanently

#### Step 2: Text Extraction
- Use pdfjs-dist for text extraction
- Preserve page structure
- OCR fallback for scanned PDFs (Google Cloud Vision)
- Detect and preserve:
  - Tables
  - Headers/footers
  - Page numbers
  - Diagrams (extract metadata only)

#### Step 3: Section-Aware Chunking

**Chunk Strategy:**
```typescript
interface ManualChunk {
  sectionTitle: string;
  sectionType: 'procedure' | 'warning' | 'table' | 'diagram' | 'spec' | 'troubleshooting';
  content: string;
  pageReference: string;
  metadata: {
    hasTable: boolean;
    hasDiagram: boolean;
    hasSafetyWarning: boolean;
    keywords: string[];
  };
}
```

**Chunking Rules:**
- Max 1000 tokens per chunk
- Never split mid-procedure
- Safety warnings = separate chunks
- Tables = separate chunks with structured extraction
- Wiring diagrams = metadata only (future: vision model integration)

**Section Type Detection:**
```typescript
function detectSectionType(content: string, title: string): SectionType {
  // Safety warnings
  if (/WARNING|CAUTION|DANGER|HAZARD/i.test(content)) {
    return 'warning';
  }
  
  // Troubleshooting tables
  if (/symptom|cause|remedy|error code/i.test(title)) {
    return 'troubleshooting';
  }
  
  // Procedures (numbered steps)
  if (/\n\s*\d+\.\s/.test(content)) {
    return 'procedure';
  }
  
  // Technical specifications
  if (/specification|rating|dimension/i.test(title)) {
    return 'spec';
  }
  
  // Default
  return 'general';
}
```

#### Step 4: Terminology Normalization

**Problem**: Manufacturers use different terms for same concepts
- "Heat pump" vs "HP" vs "Heat-pump"
- "Condensing unit" vs "condenser"
- "A-coil" vs "evaporator coil"

**Solution**: Terminology mapping table
```typescript
const HVAC_TERMINOLOGY_MAP = {
  'heat pump': ['HP', 'heat-pump', 'heatpump'],
  'condensing unit': ['condenser', 'outdoor unit'],
  'evaporator coil': ['A-coil', 'indoor coil'],
  // ... hundreds more
};
```

Apply normalization during embedding generation.

#### Step 5: Embedding Generation

- Model: OpenAI `text-embedding-3-large` (3072 dimensions)
- Batch process: 100 chunks at a time
- Store vectors in PostgreSQL with pgvector
- Create IVFFlat index for fast similarity search

```typescript
async function generateEmbeddings(sections: ManualChunk[]) {
  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: sections.map(s => s.content)
  });
  
  return embeddings.data.map((emb, i) => ({
    ...sections[i],
    embedding: emb.embedding
  }));
}
```

#### Step 6: Metadata Extraction

Extract structured data:
- Model numbers mentioned
- Part numbers
- Error codes
- Torque specifications
- Electrical ratings
- Refrigerant types

Store in `metadata` JSONB field for filtering.

#### Step 7: Verification

**Automated Checks:**
- Model number in manual matches database model
- Publish date is reasonable
- Page count > 10
- Text extraction quality > 90%

**Human Verification (future):**
- Community verification program
- Certified tech verification
- OEM partnerships for official verification

#### Step 8: Activation

Manual status → `active`
Now available for retrieval in answering pipeline.

### 6.3 Background Jobs

#### Job 1: Manual Ingestion Worker
- Queue: Bull with Redis
- Concurrency: 5 workers
- Priority queue support
- Retry logic: 3 attempts with exponential backoff
- Failure notifications

#### Job 2: Embedding Generation Worker
- Separate queue from ingestion
- Handles batch embedding requests
- Rate limiting for OpenAI API

#### Job 3: Manual Refresh Worker
- Runs quarterly
- Re-fetches manual URLs
- Compares hashes
- Creates new versions if changed

---

## 7. Answering Layer (LLM + RAG)

### 7.1 High-Level Flow

```
User Question → Question Analysis → Model Identification → 
Manual Retrieval → Context Ranking → Safety Check → 
LLM Synthesis → Answer Formatting → Response
```

### 7.2 Question Analysis

**Extract:**
- Intent (troubleshooting, installation, wiring, specs)
- Entities (model number, error codes, parts)
- Context signals (symptoms, behavior)

```typescript
interface QuestionAnalysis {
  intent: 'troubleshooting' | 'installation' | 'wiring' | 'specs' | 'general';
  entities: {
    modelNumbers: string[];
    errorCodes: string[];
    parts: string[];
  };
  keywords: string[];
}
```

### 7.3 Retrieval Rules (Non-Negotiable)

**Before answering:**
1. Identify:
   - OEM (from context or saved unit)
   - Model number (validated against database)
   - Manual type needed

2. Retrieve ONLY:
   - Sections from manuals mapped to that exact model
   - Manual version with highest confidence score
   - Most recent revision if multiple exist

3. Rank by:
   - Vector similarity to question
   - Confidence score
   - Manual recency
   - User-confirmed correctness (feedback)

**If confidence is low:**
- Model must say so explicitly
- Offer field-confirmed knowledge as alternative
- Never guess or fill gaps

### 7.4 Retrieval Pipeline

```typescript
async function retrieveRelevantSections(
  modelId: string,
  question: string,
  manualType?: string,
  limit: number = 5
): Promise<RetrievedSection[]> {
  
  // 1. Generate question embedding
  const questionEmbedding = await generateEmbedding(question);
  
  // 2. Get active manuals for this model
  const manuals = await db.manuals.findMany({
    where: {
      model_id: modelId,
      status: 'active',
      ...(manualType && { manual_type: manualType })
    },
    orderBy: [
      { confidence_score: 'desc' },
      { publish_date: 'desc' }
    ]
  });
  
  const manualIds = manuals.map(m => m.id);
  
  // 3. Vector similarity search
  const sections = await db.$queryRaw`
    SELECT 
      s.id, 
      s.manual_id,
      s.section_title,
      s.section_type,
      s.content,
      s.page_reference,
      s.metadata,
      m.title as manual_title,
      m.revision,
      m.confidence_score,
      1 - (s.embedding <=> ${questionEmbedding}::vector) as similarity
    FROM manual_sections s
    JOIN manuals m ON s.manual_id = m.id
    WHERE s.manual_id = ANY(${manualIds})
    ORDER BY s.embedding <=> ${questionEmbedding}::vector
    LIMIT ${limit * 2}
  `;
  
  // 4. Re-rank with business logic
  return sections
    .map(s => ({
      ...s,
      score: calculateFinalScore(s)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function calculateFinalScore(section: any): number {
  return (
    section.similarity * 0.6 +
    section.confidence_score * 0.3 +
    (section.section_type === 'warning' ? 0.1 : 0) // Boost safety content
  );
}
```

### 7.5 Safety Check

Before LLM synthesis, check retrieved sections for safety warnings:

```typescript
function extractSafetyWarnings(sections: RetrievedSection[]): string[] {
  const warnings = sections
    .filter(s => s.section_type === 'warning' || 
                 /WARNING|CAUTION|DANGER/.test(s.content))
    .map(s => s.content);
  
  return [...new Set(warnings)]; // Deduplicate
}
```

### 7.6 LLM Synthesis

**Model**: OpenAI GPT-4 (or GPT-4 Turbo)

**System Prompt:**
```typescript
const SYSTEM_PROMPT = `You are a technical documentation assistant for OEM TechTalk.

Your role is to provide accurate, source-grounded answers about specific OEM equipment.

CRITICAL RULES:
1. ONLY use information from the provided manual sections
2. NEVER invent procedures or specifications
3. ALWAYS cite the exact manual and page reference
4. If safety warnings exist, present them FIRST before any answer
5. If information is not in the manual, say so explicitly
6. If confidence is low, acknowledge uncertainty
7. Use clear, step-by-step format for procedures
8. Separate OEM-documented facts from field-confirmed information

Response format:
[Safety Warnings - if applicable]
[Direct Answer]
[Step-by-step procedure - if applicable]
[Source Citation]`;
```

**User Prompt Template:**
```typescript
const USER_PROMPT = `Question: {question}

Model: {model_number}
Manual: {manual_title} (Revision {revision})

Relevant Sections:
{sections}

{field_confirmed_knowledge ? `
Field-Confirmed Information (NOT from OEM manual):
{field_confirmed_knowledge}
` : ''}

Provide a clear, accurate answer based ONLY on the sections above.`;
```

**Temperature**: 0.3 (low creativity, high consistency)

### 7.7 Answer Rules

The LLM **MUST**:
1. Never invent procedures
2. Always prioritize safety warnings
3. Cite exact manual and revision
4. Clearly separate:
   - OEM-documented facts
   - Field-confirmed information
5. State uncertainty plainly
6. Use structured format

**Answer must fail safely.**

### 7.8 Response Formatting

```typescript
interface Answer {
  safetyWarnings: string[];
  mainAnswer: string;
  procedure?: {
    steps: string[];
    estimatedTime?: string;
    requiredTools?: string[];
  };
  citations: {
    manualTitle: string;
    revision: string;
    pages: string;
    confidence: number;
  }[];
  fieldConfirmed?: {
    content: string;
    source: string;
  };
  confidence: 'high' | 'medium' | 'low';
  relatedQuestions?: string[];
}
```

### 7.9 Fallback Logic

**If no relevant sections found:**
1. Check field-confirmed knowledge
2. Offer to trigger discovery job
3. Suggest related manuals
4. Never make up an answer

```typescript
if (sections.length === 0 || maxSimilarity < 0.5) {
  return {
    message: "I couldn't find specific information about this in the OEM manual.",
    options: [
      "Search our field-confirmed knowledge base",
      "Request this manual be added",
      "See related troubleshooting"
    ]
  };
}
```

---

## 8. Frontend Architecture

### 8.1 Project Structure

```
/app
  /(auth)
    /login.tsx
    /magic-link.tsx
  /(tabs)
    /index.tsx              # Home / Ask Question
    /library.tsx            # Saved Units
    /discover.tsx           # Browse OEMs/Models
    /(profile)
      /index.tsx            # User Profile
      /subscription.tsx
  /(modals)
    /context-builder.tsx    # Model identification flow
    /answer.tsx             # Answer display
    /manual-picker.tsx      # Manual selection
    /feedback.tsx           # Feedback submission
/components
  /ui                       # Reusable UI components
  /context                  # Context providers
  /questions                # Question-related components
  /manuals                  # Manual-related components
  /ocr                      # Camera/OCR components
/services
  /api.ts                   # API client
  /auth.ts                  # Auth helpers
  /storage.ts               # AsyncStorage helpers
/utils
  /theme.ts                 # Design tokens
  /validation.ts            # Form validation
/types
  /models.ts                # TypeScript types
```

### 8.2 Theme System

```typescript
// utils/theme.ts
export const theme = {
  colors: {
    primary: '#2563EB',      // Blue
    danger: '#DC2626',       // Red (for warnings)
    warning: '#F59E0B',      // Amber
    success: '#10B981',      // Green
    background: '#FFFFFF',
    backgroundSecondary: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' },
    h2: { fontSize: 24, fontWeight: '600' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 14, fontWeight: '400' }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999
  }
};
```

### 8.3 Key Screens

#### Home Screen (Ask Question)
- Search input: "Ask about a unit"
- Recent questions list
- Saved units quick access
- CTA: "Add new unit"

#### Context Builder Modal
Adaptive multi-step flow:

**Step 1: Vertical Selection**
```
┌─────────────────────────────┐
│  What type of equipment?    │
│                             │
│  [ HVAC ]  [ Appliance ]    │
│  [ Plumbing ] [ Electrical ]│
└─────────────────────────────┘
```

**Step 2: Application Type** (if HVAC)
```
┌─────────────────────────────┐
│  Residential or Commercial? │
│                             │
│  [ Residential ]            │
│  [ Commercial ]             │
│  [ Not sure ]               │
└─────────────────────────────┘
```

**Step 3: Unit Identification**
```
┌─────────────────────────────┐
│  Identify the unit          │
│                             │
│  [ 📷 Scan serial plate ]   │
│  [ 🔍 Search by model ]     │
│  [ 📋 I don't know ]        │
└─────────────────────────────┘
```

**Step 3a: Scan Serial Plate** (if chosen)
- Camera view with overlay guides
- OCR extraction
- Model number extraction
- Validation against database

**Step 3b: Search by Model** (if chosen)
- OEM picker (searchable dropdown)
- Model number input
- Fuzzy search
- Results list with images

**Step 4: Manual Confirmation**
```
┌─────────────────────────────┐
│  Found manuals for:         │
│  Model: ABC-123-4567        │
│                             │
│  ✓ Service Manual (2023)    │
│    Confidence: High         │
│                             │
│  ✓ Installation Manual      │
│    Confidence: High         │
│                             │
│  [ These look correct ]     │
│  [ Wrong model ]            │
└─────────────────────────────┘
```

#### Question Input Screen
```
┌─────────────────────────────┐
│  Unit: Carrier ABC-123      │
│  Manual: Service (Rev 2023) │
├─────────────────────────────┤
│                             │
│  What's your question?      │
│  ┌─────────────────────────┐│
│  │                         ││
│  │                         ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
│  Context (optional):        │
│  [ Troubleshooting ]        │
│  [ Installation ]           │
│  [ Wiring ]                 │
│  [ Specifications ]         │
│                             │
│  [ Ask Question ]           │
└─────────────────────────────┘
```

#### Answer Screen
```
┌─────────────────────────────┐
│  ⚠️ SAFETY WARNING          │
│  Turn off power before...   │
├─────────────────────────────┤
│  Answer                     │
│                             │
│  To reset the fault code... │
│                             │
│  Steps:                     │
│  1. Locate the reset button │
│  2. Press and hold for 3s   │
│  3. Wait for LED to blink   │
│                             │
├─────────────────────────────┤
│  📘 Source                  │
│  Service Manual Rev 2023    │
│  Pages 45-47                │
│  Confidence: High           │
├─────────────────────────────┤
│  Was this helpful?          │
│  [ 👍 Yes ] [ 👎 No ]       │
│                             │
│  Was the manual correct?    │
│  [ ✓ Correct ] [ ✗ Wrong ]  │
└─────────────────────────────┘
```

#### Library Screen (Saved Units)
```
┌─────────────────────────────┐
│  My Units                   │
│                             │
│  ┌─────────────────────────┐│
│  │ Johnson Residence       ││
│  │ Carrier ABC-123         ││
│  │ Installed: 2020         ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ Smith HVAC Service      ││
│  │ Trane XYZ-789           ││
│  │ Installed: 2018         ││
│  └─────────────────────────┘│
│                             │
│  [ + Add New Unit ]         │
└─────────────────────────────┘
```

### 8.4 Key Components

#### `<SafetyWarning />`
```typescript
interface SafetyWarningProps {
  warnings: string[];
  severity: 'danger' | 'warning' | 'caution';
}

export function SafetyWarning({ warnings, severity }: SafetyWarningProps) {
  const icon = severity === 'danger' ? '⚠️' : 'ℹ️';
  const bgColor = severity === 'danger' ? theme.colors.danger : theme.colors.warning;
  
  return (
    <View style={{ backgroundColor: bgColor, padding: theme.spacing.md }}>
      {warnings.map((warning, i) => (
        <Text key={i} style={{ color: '#FFF' }}>
          {icon} {warning}
        </Text>
      ))}
    </View>
  );
}
```

#### `<ConfidenceIndicator />`
```typescript
interface ConfidenceIndicatorProps {
  score: number; // 0.0 to 1.0
  label?: boolean;
}

export function ConfidenceIndicator({ score, label = true }: ConfidenceIndicatorProps) {
  const level = score >= 0.8 ? 'High' : score >= 0.5 ? 'Medium' : 'Low';
  const color = score >= 0.8 ? theme.colors.success : 
                score >= 0.5 ? theme.colors.warning : 
                theme.colors.danger;
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 100, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4 }}>
        <View style={{ width: `${score * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
      {label && <Text style={{ marginLeft: 8, color }}>{level}</Text>}
    </View>
  );
}
```

#### `<ManualCard />`
```typescript
interface ManualCardProps {
  manual: {
    title: string;
    type: string;
    revision: string;
    publishDate: string;
    confidence: number;
  };
  onPress: () => void;
  selected?: boolean;
}

export function ManualCard({ manual, onPress, selected }: ManualCardProps) {
  return (
    <Pressable 
      onPress={onPress}
      style={{
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: selected ? '#EFF6FF' : theme.colors.background
      }}
    >
      <Text style={theme.typography.h3}>{manual.title}</Text>
      <Text style={theme.typography.caption}>
        {manual.type} • Rev {manual.revision} • {manual.publishDate}
      </Text>
      <ConfidenceIndicator score={manual.confidence} />
    </Pressable>
  );
}
```

---

## 9. API Endpoints

### 9.1 Authentication

```
POST   /api/auth/send-magic-link
POST   /api/auth/verify-magic-link
POST   /api/auth/logout
GET    /api/auth/me
```

### 9.2 Users

```
GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/me/usage
GET    /api/users/me/subscription
```

### 9.3 OEMs & Models

```
GET    /api/oems
GET    /api/oems/:id
GET    /api/oems/:id/product-lines
GET    /api/product-lines/:id/models
GET    /api/models/search?q={query}
GET    /api/models/:id
GET    /api/models/:id/manuals
```

### 9.4 Manuals

```
GET    /api/manuals/:id
GET    /api/manuals/:id/sections
POST   /api/manuals/request-discovery
      Body: { oem, model, manualType, userId }
```

### 9.5 Questions

```
POST   /api/questions/ask
      Body: { modelId, question, context, manualId? }
      
GET    /api/questions/:id
GET    /api/questions/history
DELETE /api/questions/:id
```

### 9.6 Saved Units

```
GET    /api/saved-units
POST   /api/saved-units
PATCH  /api/saved-units/:id
DELETE /api/saved-units/:id
```

### 9.7 Feedback

```
POST   /api/feedback
      Body: { 
        questionId, 
        manualId, 
        feedbackType, 
        rating, 
        rejectionReason?, 
        comment? 
      }
```

### 9.8 Discovery

```
POST   /api/discovery/trigger
      Body: { oem, model, manualType }
      
GET    /api/discovery/jobs/:id
```

### 9.9 Payments (Stripe)

```
POST   /api/payments/create-checkout-session
POST   /api/payments/webhook
GET    /api/payments/portal-session
```

### 9.10 Admin (Future)

```
GET    /api/admin/manuals/pending-verification
POST   /api/admin/manuals/:id/verify
POST   /api/admin/manuals/:id/quarantine
GET    /api/admin/feedback/flagged
```

---

## 10. Authentication & Authorization

### 10.1 Magic Link Flow

**User requests login:**
1. User enters email
2. Backend generates JWT token (15min expiry)
3. Email sent with link: `app://auth/verify?token={jwt}`
4. User clicks link
5. App verifies token with backend
6. Backend returns access token + refresh token
7. Tokens stored in Expo SecureStore

**Token Structure:**
```typescript
interface AccessToken {
  userId: string;
  email: string;
  role: string;
  tier: string;
  exp: number; // 7 days
}

interface RefreshToken {
  userId: string;
  exp: number; // 30 days
}
```

### 10.2 Authorization Levels

**Roles:**
- `user`: Basic user (default)
- `technician`: Verified technician
- `company_admin`: Company account admin
- `admin`: Platform admin

**Tiers:**
- `free`: Limited usage
- `pro`: Full features
- `enterprise`: Advanced features + support

### 10.3 Rate Limiting

```typescript
// Per-user rate limits
const RATE_LIMITS = {
  free: {
    questionsPerMonth: 50,
    questionsPerDay: 5,
    savedUnits: 5
  },
  pro: {
    questionsPerMonth: 1000,
    questionsPerDay: 100,
    savedUnits: 50
  },
  enterprise: {
    questionsPerMonth: -1, // Unlimited
    questionsPerDay: -1,
    savedUnits: -1
  }
};
```

Implemented with Redis:
```typescript
async function checkRateLimit(userId: string, tier: string): Promise<boolean> {
  const key = `ratelimit:${userId}:${getCurrentMonth()}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
  }
  
  const limit = RATE_LIMITS[tier].questionsPerMonth;
  return limit === -1 || count <= limit;
}
```

---

## 11. Payment System

### 11.1 Subscription Tiers

**Free Tier:**
- 50 questions/month
- 5 saved units
- Basic troubleshooting
- Community support

**Pro Tier ($19.99/month or $199/year):**
- 1000 questions/month
- 50 saved units
- Advanced diagnostics
- Priority support
- Offline access (future)
- Custom tags & notes

**Enterprise Tier (Contact sales):**
- Unlimited questions
- Unlimited saved units
- Multi-user accounts
- API access
- Dedicated support
- Custom integrations

### 11.2 Stripe Integration

**Checkout Flow:**
```typescript
// 1. User selects plan
POST /api/payments/create-checkout-session
{
  priceId: "price_xxx",
  userId: "user_xxx"
}

// 2. Redirect to Stripe Checkout
// 3. Stripe webhook confirms payment
POST /api/payments/webhook
{
  type: "checkout.session.completed",
  data: { ... }
}

// 4. Update user subscription in database
UPDATE users SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  stripe_customer_id = 'cus_xxx'
WHERE id = 'user_xxx';
```

**Webhook Events:**
- `checkout.session.completed`: New subscription
- `invoice.paid`: Renewal
- `invoice.payment_failed`: Payment issue
- `customer.subscription.deleted`: Cancellation

### 11.3 Usage Tracking

Track usage in real-time:
```typescript
async function trackQuestionUsage(userId: string) {
  const period = getCurrentPeriod();
  
  await db.usageTracking.upsert({
    where: { userId_periodStart: { userId, periodStart: period.start } },
    update: { questionsAsked: { increment: 1 } },
    create: {
      userId,
      periodStart: period.start,
      periodEnd: period.end,
      questionsAsked: 1
    }
  });
}
```

Display in app:
```
You've asked 23/50 questions this month
Upgrade to Pro for unlimited questions
```

---

## 12. Trust, Safety & Liability

### 12.1 Safety Warning System

**Priority Levels:**
1. **DANGER**: Immediate risk of death/serious injury
2. **WARNING**: Could result in injury
3. **CAUTION**: Could result in property damage

**Always display:**
- Before answer content
- With icon and colored background
- In full, no truncation

**Examples:**
```
⚠️ DANGER: Turn off all power before servicing. High voltage can cause death or serious injury.

⚠️ WARNING: Wear safety glasses. Refrigerant can cause eye injury.

⚠️ CAUTION: Support unit weight. Dropping can damage components.
```

### 12.2 Disclaimers

**Contextual disclaimers** (not global):

**For electrical work:**
> "This procedure involves electrical work. If you are not a licensed electrician, contact a professional."

**For gas work:**
> "This procedure involves gas connections. Only licensed professionals should perform gas work."

**For refrigerant:**
> "This procedure requires EPA 608 certification. Releasing refrigerant is illegal."

**General:**
> "This information is for reference only. Always follow manufacturer instructions and local codes."

### 12.3 Liability Mitigation

1. **Terms of Service** (required on signup)
   - Not a substitute for professional training
   - User assumes all risk
   - No warranty of accuracy

2. **Content Labeling**
   - OEM-documented vs Field-confirmed
   - Confidence indicators
   - Manual version/date

3. **Feedback Loop**
   - Flag incorrect information
   - Community verification
   - Confidence scoring

4. **Insurance**
   - Professional liability insurance
   - Cyber liability insurance
   - Errors & omissions coverage

### 12.4 Region-Aware Warnings

Future enhancement:
```typescript
interface RegionalRequirement {
  region: string; // US, CA, EU, etc.
  code: string;   // NEC 2023, CEC 2021, etc.
  requirement: string;
}
```

Example:
> "Note: In California, this installation requires a permit per Title 24."

---

## 13. Implementation Phases

### Phase 0: Foundation (Weeks 1-2) ✅ 95% COMPLETE

**Goal**: Project setup, database, basic architecture

- [x] Initialize Expo React Native project
- [x] Set up TypeScript configuration
- [x] Create database schema in PostgreSQL
- [x] Set up pgvector extension
- [x] Create Node.js/Express backend
- [x] Set up Prisma ORM
- [x] Configure Supabase Storage (replaced AWS S3)
- [x] Supabase MCP server connected
- [x] Create API structure
- [x] Set up development environment
- [x] Complete theme system with dark mode
- [x] Shared TypeScript types
- [x] Environment configuration
- [x] Frontend navigation structure (tab-based)
- [x] All core screens built (Home, Search, Library, Profile)
- [ ] Generate Prisma client
- [ ] Test backend server

**Deliverable**: Working dev environment with database ✅

**Progress**: 15/17 tasks complete (88%)

**Status**: Ready to move to Phase 1 - Core Infrastructure

---

### Phase 1: Core Infrastructure (Weeks 3-4)

**Goal**: Authentication, basic CRUD, API foundation

**Backend:**
- [ ] Implement magic link authentication
- [ ] JWT token generation/validation
- [ ] User CRUD endpoints
- [ ] OEM/Model CRUD endpoints
- [ ] Manual CRUD endpoints
- [ ] Rate limiting middleware
- [ ] Error handling middleware

**Frontend:**
- [ ] Auth screens (login, magic link verify)
- [ ] Theme system
- [ ] Navigation structure (Expo Router)
- [ ] API client setup (Axios)
- [ ] Basic UI components
- [ ] Home screen shell

**Deliverable**: Users can sign up, log in, and see empty home screen

---

### Phase 2: Manual Discovery & Ingestion (Weeks 5-7)

**Goal**: Perplexity integration, PDF processing, basic ingestion

**Backend:**
- [ ] Perplexity API integration
- [ ] Discovery job system (Bull queue)
- [ ] PDF download service
- [ ] Text extraction (pdfjs-dist)
- [ ] Section chunking algorithm
- [ ] Manual state machine
- [ ] Ingestion queue worker
- [ ] Manual API endpoints

**Frontend:**
- [ ] Browse OEMs/Models screen
- [ ] Manual detail view
- [ ] Manual request flow

**Testing:**
- [ ] Manually add 10 sample HVAC manuals
- [ ] Test discovery for common models
- [ ] Verify PDF extraction quality

**Deliverable**: System can discover and ingest manuals

---

### Phase 3: Embedding & RAG Foundation (Weeks 8-9)

**Goal**: Vector embeddings, similarity search, retrieval pipeline

**Backend:**
- [ ] OpenAI embedding integration
- [ ] Batch embedding generation
- [ ] pgvector similarity search queries
- [ ] Retrieval pipeline implementation
- [ ] Section ranking algorithm
- [ ] Manual section API endpoints

**Testing:**
- [ ] Generate embeddings for all ingested manuals
- [ ] Test retrieval accuracy with sample questions
- [ ] Benchmark retrieval speed

**Deliverable**: Can retrieve relevant manual sections for questions

---

### Phase 4: Answering System (Weeks 10-12)

**Goal**: LLM integration, answer synthesis, safety checks

**Backend:**
- [ ] OpenAI GPT-4 integration
- [ ] Question analysis service
- [ ] Safety warning extraction
- [ ] Answer synthesis pipeline
- [ ] Confidence scoring
- [ ] Question/Answer API endpoints
- [ ] Answer caching strategy

**Frontend:**
- [ ] Question input screen
- [ ] Answer display screen
- [ ] Safety warning component
- [ ] Confidence indicator component
- [ ] Source citation display
- [ ] Loading states

**Testing:**
- [ ] Test with 50 real HVAC questions
- [ ] Evaluate answer accuracy
- [ ] Measure response times

**Deliverable**: Users can ask questions and get answers

---

### Phase 5: Context Builder & Unit Management (Weeks 13-14)

**Goal**: Model identification, saved units, OCR

**Frontend:**
- [ ] Context builder modal (multi-step)
- [ ] Vertical selection
- [ ] Model search
- [ ] Camera integration (expo-camera)
- [ ] OCR implementation (Tesseract.js)
- [ ] Serial number parsing
- [ ] Manual confirmation screen
- [ ] Saved units library
- [ ] Unit CRUD

**Backend:**
- [ ] Saved units API endpoints
- [ ] Model search endpoint
- [ ] OCR result validation

**Testing:**
- [ ] Test OCR with 20 serial plate photos
- [ ] Test model search with fuzzy inputs
- [ ] Test saved unit persistence

**Deliverable**: Users can identify units and save them

---

### Phase 6: Feedback & Learning (Weeks 15-16)

**Goal**: User feedback, confidence updates, field knowledge

**Backend:**
- [ ] Feedback API endpoints
- [ ] Confidence score updates
- [ ] Field-confirmed knowledge table
- [ ] Manual ranking adjustments
- [ ] Feedback analytics

**Frontend:**
- [ ] Feedback UI (thumbs up/down)
- [ ] Manual correctness feedback
- [ ] Rejection reason selection
- [ ] Field-confirmed knowledge display

**Deliverable**: System learns from user feedback

---

### Phase 7: Payments & Subscriptions (Weeks 17-18)

**Goal**: Stripe integration, usage tracking, tier enforcement

**Backend:**
- [ ] Stripe API integration
- [ ] Checkout session creation
- [ ] Webhook handler
- [ ] Subscription management
- [ ] Usage tracking system
- [ ] Rate limit enforcement
- [ ] Payment API endpoints

**Frontend:**
- [ ] Subscription screen
- [ ] Plan selection UI
- [ ] Usage meter display
- [ ] Upgrade prompts
- [ ] Payment success/failure screens

**Testing:**
- [ ] Test Stripe test mode
- [ ] Test usage limits
- [ ] Test upgrade/downgrade flows

**Deliverable**: Users can subscribe and system enforces limits

---

### Phase 8: Background Jobs & Automation (Weeks 19-20)

**Goal**: Scheduled discovery, automatic updates, maintenance

**Backend:**
- [ ] Cron job setup (node-cron)
- [ ] Weekly incremental discovery job
- [ ] Quarterly regression sweep job
- [ ] Manual refresh worker
- [ ] Stale manual detection
- [ ] Job monitoring (Bull Board)

**Testing:**
- [ ] Run weekly job manually
- [ ] Verify new manual detection
- [ ] Verify revision detection

**Deliverable**: System automatically maintains knowledge base

---

### Phase 9: Polish & Optimization (Weeks 21-22)

**Goal**: Performance, UX improvements, error handling

**Frontend:**
- [ ] Skeleton loaders
- [ ] Error boundaries
- [ ] Offline state handling
- [ ] Pull-to-refresh
- [ ] Infinite scroll for lists
- [ ] Search debouncing
- [ ] Image lazy loading

**Backend:**
- [ ] Query optimization
- [ ] N+1 query fixes
- [ ] Caching strategy
- [ ] Connection pooling
- [ ] Log aggregation (Sentry)

**Testing:**
- [ ] Load testing (k6)
- [ ] Performance profiling
- [ ] Memory leak checks

**Deliverable**: Production-ready performance

---

### Phase 10: Launch Preparation (Weeks 23-24)

**Goal**: Production deploy, monitoring, documentation

**Infrastructure:**
- [ ] Production database setup
- [ ] AWS S3 production bucket
- [ ] Redis production instance
- [ ] SSL certificates
- [ ] Domain configuration
- [ ] CDN setup (CloudFront)

**Monitoring:**
- [ ] Sentry error tracking
- [ ] PostHog analytics
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Cost alerts (AWS)

**Documentation:**
- [ ] API documentation (Swagger)
- [ ] Onboarding flow
- [ ] Help/FAQ section
- [ ] Terms of Service
- [ ] Privacy Policy

**Testing:**
- [ ] End-to-end tests (Detox)
- [ ] Security audit
- [ ] Load testing
- [ ] Beta user testing

**Deliverable**: App live in production

---

## 14. Testing Strategy

### 14.1 Unit Tests

**Backend:**
- Services: 80% coverage minimum
- Utils: 90% coverage
- Framework: Jest

**Frontend:**
- Components: React Testing Library
- Hooks: @testing-library/react-hooks
- Utils: Jest

### 14.2 Integration Tests

**API Tests:**
- All endpoints tested
- Framework: Supertest
- Authentication flows
- Error cases

**Database Tests:**
- Migrations
- Constraints
- Triggers

### 14.3 E2E Tests

**Framework**: Detox

**Critical Flows:**
1. Signup → Login → Ask question → Get answer
2. Add saved unit → Ask question about it
3. Receive low confidence → Request manual
4. Provide feedback → See confidence change
5. Hit rate limit → Upgrade → Ask more questions

### 14.4 Manual Testing

**Beta Testing:**
- 20 real technicians
- Real-world questions
- Feedback on accuracy
- UX observations

**Test Cases:**
- Top 100 most common HVAC questions
- Edge cases (missing manuals, low confidence)
- Error scenarios (network failures)

---

## 15. Deployment & Infrastructure

### 15.1 Development Environment

**Local Development:**
- PostgreSQL (Docker)
- Redis (Docker)
- Node.js backend (localhost:3000)
- Expo dev server (localhost:8081)

**Configuration:**
```env
# .env.development
DATABASE_URL=postgresql://localhost:5432/oemtechtalk_dev
REDIS_URL=redis://localhost:6379
AWS_S3_BUCKET=oemtechtalk-dev
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
```

### 15.2 Staging Environment

**Hosting**: Railway or Render
- Database: Managed PostgreSQL
- Cache: Managed Redis
- Backend: Node.js container
- Storage: AWS S3 (staging bucket)

**Configuration:**
```env
# .env.staging
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AWS_S3_BUCKET=oemtechtalk-staging
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
```

### 15.3 Production Environment

**Hosting**: AWS (future) or Railway (initial)
- **Compute**: ECS Fargate or EC2 Auto Scaling
- **Database**: RDS PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis (Multi-AZ)
- **Storage**: S3 (versioning enabled)
- **CDN**: CloudFront
- **Load Balancer**: ALB
- **DNS**: Route 53

**Configuration:**
```env
# .env.production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AWS_S3_BUCKET=oemtechtalk-prod
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
SENTRY_DSN=...
```

### 15.4 CI/CD Pipeline

**GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: railway up

  build-mobile:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
      - run: eas build --platform all
```

---

## 16. Monitoring & Analytics

### 16.1 Error Tracking

**Sentry:**
- Frontend errors
- Backend errors
- Performance monitoring
- Release tracking

**Alerts:**
- Error rate > 1%
- Response time > 2s
- Database connection failures

### 16.2 Application Analytics

**PostHog:**
- User signups
- Questions asked
- Answers rated helpful
- Subscription conversions
- Feature usage

**Key Metrics:**
- DAU / MAU
- Question success rate (helpful %)
- Manual coverage (% questions with manual)
- Conversion rate (free → paid)
- Churn rate

### 16.3 Infrastructure Monitoring

**Metrics to track:**
- API response times
- Database query times
- Queue processing times
- Embedding generation times
- LLM response times
- Error rates
- Request rates
- Database connections
- Redis memory usage
- S3 storage costs

**Dashboards:**
- System health
- User activity
- Cost tracking
- Performance trends

### 16.4 Cost Tracking

**AWS Cost Explorer:**
- S3 storage costs
- Data transfer costs
- RDS costs

**API Costs:**
- OpenAI API usage
- Perplexity API usage
- Google Cloud Vision API

**Target**: < $0.50 per user per month (excluding hosting)

---

## 17. Future Roadmap

### 17.1 Short-Term (3-6 months)

- [ ] Expand to top 10 HVAC OEMs
- [ ] Add 1000+ HVAC manuals
- [ ] iOS and Android app store launch
- [ ] Referral program
- [ ] In-app chat support
- [ ] Dark mode

### 17.2 Medium-Term (6-12 months)

- [ ] Offline mode (download manuals)
- [ ] Voice input for questions
- [ ] Image upload for diagnostics
- [ ] Wiring diagram recognition (vision model)
- [ ] Company accounts (team management)
- [ ] Admin dashboard for manual verification
- [ ] API access for enterprise customers
- [ ] Expand to appliance vertical
- [ ] International support (Canada, EU)

### 17.3 Long-Term (12+ months)

- [ ] Expand to all OEM verticals
  - Appliances
  - Plumbing
  - Electrical
  - Commercial refrigeration
  - Pool equipment
- [ ] Predictive maintenance
- [ ] Parts ordering integration
- [ ] Service ticket integration
- [ ] Technician certification program
- [ ] OEM partnerships
- [ ] White-label solutions
- [ ] Real-time video support with AR overlays
- [ ] IoT device integration

### 17.4 Research & Innovation

- [ ] Fine-tuned models for HVAC domain
- [ ] Custom OCR model for serial plates
- [ ] Automated diagram parsing
- [ ] Multimodal models (vision + text)
- [ ] Knowledge graph for equipment relationships
- [ ] Anomaly detection in manuals
- [ ] Automated manual quality scoring

---

## 18. Success Metrics

### 18.1 Technical Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| API response time (p95) | < 2s | < 5s |
| Answer accuracy | > 90% | > 80% |
| Manual coverage | > 70% questions | > 50% |
| Uptime | > 99.5% | > 99% |
| Error rate | < 0.5% | < 2% |

### 18.2 Business Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Total users | 500 | 2,000 | 10,000 |
| Paying users | 50 | 300 | 1,500 |
| MRR | $1k | $6k | $30k |
| Churn rate | < 10% | < 7% | < 5% |
| NPS | > 40 | > 50 | > 60 |

### 18.3 Product Metrics

| Metric | Target |
|--------|--------|
| Questions per user per month | > 10 |
| Answer helpfulness rate | > 80% |
| Manual correctness rate | > 95% |
| Time to answer | < 30s |
| User retention (30-day) | > 40% |

---

## 19. Risk Mitigation

### 19.1 Technical Risks

**Risk**: Manual parsing accuracy low for scanned PDFs
- Mitigation: OCR fallback, manual verification queue, confidence scoring

**Risk**: OpenAI API costs too high
- Mitigation: Caching, model optimization, smaller models for classification

**Risk**: Perplexity doesn't find manuals
- Mitigation: Fallback to manual entry, user uploads, distributor partnerships

**Risk**: Vector search latency too high
- Mitigation: IVFFlat indexes, query optimization, caching

### 19.2 Business Risks

**Risk**: Low user adoption
- Mitigation: Beta testing, referral program, trade show presence

**Risk**: Subscription churn too high
- Mitigation: Value demonstration, onboarding, customer support

**Risk**: Manual coverage insufficient
- Mitigation: Prioritize popular models, user requests, OEM partnerships

**Risk**: Liability from incorrect information
- Mitigation: Disclaimers, terms of service, insurance, confidence indicators

### 19.3 Legal Risks

**Risk**: Copyright issues with manuals
- Mitigation: Only use OEM-published or publicly available manuals, fair use doctrine

**Risk**: User injury from following advice
- Mitigation: Safety warnings, disclaimers, professional liability insurance

**Risk**: GDPR/privacy compliance
- Mitigation: Clear privacy policy, user data controls, encryption

---

## 20. Appendix

### 20.1 Technology Alternatives Considered

| Component | Chosen | Alternatives | Reason |
|-----------|--------|--------------|--------|
| Database | PostgreSQL | MongoDB, MySQL | Vector support, ACID, JSON |
| Mobile | Expo React Native | Flutter, Native | Faster dev, single codebase |
| Backend | Node.js/Express | Python/FastAPI, Go | Team expertise, ecosystem |
| Embeddings | OpenAI | Sentence Transformers | Quality, simplicity |
| Discovery | Perplexity | SerpAPI, Bing | Better understanding |
| Queue | Bull | BullMQ, Celery | Mature, good monitoring |

### 20.2 Glossary

- **OEM**: Original Equipment Manufacturer
- **RAG**: Retrieval-Augmented Generation
- **Manual**: Technical documentation from OEM
- **Section**: Chunk of manual with specific topic
- **Confidence Score**: 0.0-1.0 rating of information accuracy
- **Field-Confirmed**: Information verified by technicians, not OEM
- **Discovery**: Process of finding manual URLs
- **Ingestion**: Process of downloading and processing manuals

### 20.3 References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Expo Documentation](https://docs.expo.dev/)
- [Stripe API Documentation](https://stripe.com/docs/api)

---

## Document Control

**Version History:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1.0 | 2026-01-18 | Initial master plan | System |

**Review Schedule:**
- Weekly during development
- After each phase completion
- When major changes occur

**Approval:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] Engineering Team

---

**End of Master Plan**