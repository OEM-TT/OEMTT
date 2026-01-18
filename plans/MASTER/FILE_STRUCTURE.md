# OEM TechTalk - File Structure & Packages

**Last Updated:** January 18, 2026

---

## Overview

This document outlines the complete file structure and package dependencies for both the **mobile frontend** (Expo React Native) and **backend API** (Node.js/Express).

---

## Table of Contents

1. [Mobile App File Structure](#mobile-app-file-structure)
2. [Mobile App Packages](#mobile-app-packages)
3. [Backend File Structure](#backend-file-structure)
4. [Backend Packages](#backend-packages)
5. [Shared Types](#shared-types)
6. [Configuration Files](#configuration-files)

---

## Mobile App File Structure

```
/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens group
│   │   ├── _layout.tsx           # Auth layout (no tabs)
│   │   ├── login.tsx             # Email input screen
│   │   ├── verify-magic-link.tsx # Magic link verification
│   │   └── welcome.tsx           # First-time welcome
│   │
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Home / Ask Question
│   │   ├── library.tsx           # Saved Units
│   │   ├── discover.tsx          # Browse OEMs/Models
│   │   └── profile.tsx           # User Profile
│   │
│   ├── (modals)/                 # Modal screens
│   │   ├── context-builder.tsx  # Multi-step unit identification
│   │   ├── answer.tsx            # Answer display with sources
│   │   ├── manual-picker.tsx    # Select from multiple manuals
│   │   ├── feedback.tsx          # Submit feedback
│   │   ├── add-unit.tsx          # Add saved unit
│   │   ├── unit-details.tsx      # Edit saved unit
│   │   ├── subscription.tsx      # Plan selection & payment
│   │   └── oem-details.tsx       # OEM info & models
│   │
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 screen
│
├── components/                   # Reusable components
│   ├── ui/                       # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   ├── Modal.tsx
│   │   ├── Tabs.tsx
│   │   ├── Chip.tsx
│   │   ├── Divider.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── questions/                # Question-related components
│   │   ├── QuestionInput.tsx     # Text input with context chips
│   │   ├── QuestionCard.tsx      # Question history item
│   │   ├── ContextChips.tsx      # Troubleshooting, wiring, etc.
│   │   └── QuestionHistory.tsx   # List of past questions
│   │
│   ├── answers/                  # Answer-related components
│   │   ├── AnswerDisplay.tsx     # Main answer component
│   │   ├── SafetyWarning.tsx     # Warning/danger/caution display
│   │   ├── ProcedureSteps.tsx    # Step-by-step instructions
│   │   ├── SourceCitation.tsx    # Manual + page reference
│   │   ├── ConfidenceIndicator.tsx # Visual confidence score
│   │   └── FieldConfirmedBadge.tsx # Non-OEM knowledge indicator
│   │
│   ├── manuals/                  # Manual-related components
│   │   ├── ManualCard.tsx        # Manual info card
│   │   ├── ManualList.tsx        # List of manuals
│   │   ├── ManualPicker.tsx      # Select manual UI
│   │   └── ManualStatus.tsx      # Active/pending/deprecated badge
│   │
│   ├── units/                    # Saved unit components
│   │   ├── UnitCard.tsx          # Saved unit item
│   │   ├── UnitList.tsx          # List of saved units
│   │   ├── UnitForm.tsx          # Add/edit unit form
│   │   └── RecentUnits.tsx       # Quick access to recent
│   │
│   ├── discovery/                # Discovery/browse components
│   │   ├── OEMCard.tsx           # OEM card with logo
│   │   ├── OEMList.tsx           # Grid/list of OEMs
│   │   ├── ModelCard.tsx         # Model card
│   │   ├── ModelList.tsx         # List of models
│   │   └── SearchBar.tsx         # Search input with filters
│   │
│   ├── ocr/                      # Camera/OCR components
│   │   ├── CameraView.tsx        # Camera with overlay
│   │   ├── SerialPlateOverlay.tsx # Guide for serial plate
│   │   ├── OCRResults.tsx        # Extracted text display
│   │   └── ModelExtractor.tsx    # Parse model from text
│   │
│   ├── subscription/             # Payment components
│   │   ├── PlanCard.tsx          # Subscription tier card
│   │   ├── UsageMeter.tsx        # Questions used this month
│   │   ├── UpgradePrompt.tsx     # CTA to upgrade
│   │   └── PaymentSuccess.tsx    # Post-payment confirmation
│   │
│   └── feedback/                 # Feedback components
│       ├── HelpfulButtons.tsx    # 👍 👎
│       ├── ManualFeedback.tsx    # Correct/incorrect manual
│       ├── RejectionReasons.tsx  # Reason selection
│       └── CommentInput.tsx      # Optional comment
│
├── services/                     # API & external services
│   ├── api/                      # API client
│   │   ├── client.ts             # Axios instance with interceptors
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── users.ts              # User endpoints
│   │   ├── questions.ts          # Question endpoints
│   │   ├── manuals.ts            # Manual endpoints
│   │   ├── units.ts              # Saved units endpoints
│   │   ├── oems.ts               # OEM/model endpoints
│   │   ├── feedback.ts           # Feedback endpoints
│   │   └── payments.ts           # Stripe endpoints
│   │
│   ├── auth/                     # Auth helpers
│   │   ├── authService.ts        # Auth logic
│   │   ├── tokenManager.ts       # JWT storage/refresh
│   │   └── magicLink.ts          # Magic link handler
│   │
│   ├── storage/                  # Local storage
│   │   ├── asyncStorage.ts       # AsyncStorage wrapper
│   │   ├── secureStore.ts        # Secure storage for tokens
│   │   └── cache.ts              # Local cache management
│   │
│   └── ocr/                      # OCR services
│       ├── tesseract.ts          # Tesseract integration
│       └── modelParser.ts        # Model number extraction
│
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Authentication state
│   ├── useUser.ts                # Current user data
│   ├── useQuestion.ts            # Ask question + get answer
│   ├── useManuals.ts             # Fetch manuals
│   ├── useSavedUnits.ts          # CRUD saved units
│   ├── useSubscription.ts        # Subscription status
│   ├── useUsage.ts               # Usage tracking
│   ├── useCamera.ts              # Camera permissions
│   ├── useOCR.ts                 # OCR processing
│   └── useDebounce.ts            # Debounce hook
│
├── context/                      # React Context providers
│   ├── AuthContext.tsx           # Auth state provider
│   ├── UserContext.tsx           # User data provider
│   ├── ThemeContext.tsx          # Theme provider (dark mode future)
│   └── SubscriptionContext.tsx   # Subscription state
│
├── utils/                        # Utility functions
│   ├── theme.ts                  # Design tokens
│   ├── validation.ts             # Form validation
│   ├── formatters.ts             # Date/text formatters
│   ├── errorHandling.ts          # Error helpers
│   ├── constants.ts              # App constants
│   └── analytics.ts              # PostHog helpers
│
├── types/                        # TypeScript types
│   ├── index.ts                  # Main types export
│   ├── api.ts                    # API response types
│   ├── models.ts                 # Data model types
│   ├── navigation.ts             # Navigation types
│   └── shared.ts                 # Shared types with backend
│
├── assets/                       # Static assets
│   ├── images/
│   │   ├── icon.png
│   │   ├── splash-icon.png
│   │   ├── adaptive-icon.png
│   │   └── placeholder.png
│   ├── fonts/                    # Custom fonts (optional)
│   └── animations/               # Lottie files (optional)
│
├── __tests__/                    # Tests
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
│
├── .env.development              # Dev environment vars
├── .env.staging                  # Staging environment vars
├── .env.production               # Production environment vars
├── .gitignore
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js               # Metro bundler config
└── README.md
```

---

## Mobile App Packages

### Core Dependencies

```json
{
  "dependencies": {
    // Expo Core
    "expo": "~52.0.0",
    "expo-status-bar": "~3.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    
    // Navigation (Expo Router)
    "expo-router": "~4.0.0",
    "react-native-safe-area-context": "4.14.0",
    "react-native-screens": "~4.5.0",
    
    // UI Components
    "@expo/vector-icons": "^14.0.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-reanimated": "~3.17.0",
    
    // Camera & OCR
    "expo-camera": "~16.0.0",
    "expo-image-picker": "~16.0.0",
    "tesseract.js": "^5.0.0",
    
    // Storage
    "expo-secure-store": "~14.0.0",
    "@react-native-async-storage/async-storage": "^2.1.0",
    
    // HTTP Client
    "axios": "^1.7.0",
    
    // Forms & Validation
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    
    // Date/Time
    "date-fns": "^4.1.0",
    
    // Analytics
    "posthog-react-native": "^3.4.0",
    
    // Error Tracking
    "@sentry/react-native": "^6.5.0",
    
    // Payments
    "@stripe/stripe-react-native": "^0.42.0",
    
    // Utils
    "react-native-uuid": "^2.0.2",
    "expo-linking": "~7.0.0",
    "expo-clipboard": "~8.0.0"
  },
  
  "devDependencies": {
    "@types/react": "~19.1.0",
    "@types/react-native": "~0.81.0",
    "typescript": "~5.9.2",
    
    // Testing
    "@testing-library/react-native": "^12.9.0",
    "@testing-library/react-hooks": "^8.0.1",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    
    // Linting
    "eslint": "^8.57.0",
    "eslint-config-expo": "^7.1.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    
    // Formatting
    "prettier": "^3.3.0"
  }
}
```

### Package Purposes

| Package | Purpose | Critical? |
|---------|---------|-----------|
| `expo-router` | File-based navigation | ✅ |
| `axios` | HTTP requests to backend | ✅ |
| `expo-camera` | Serial plate scanning | ✅ |
| `tesseract.js` | OCR text extraction | ✅ |
| `expo-secure-store` | Token storage | ✅ |
| `react-hook-form` + `zod` | Form handling & validation | ✅ |
| `@stripe/stripe-react-native` | Payment processing | ✅ |
| `posthog-react-native` | Analytics | 🟡 |
| `@sentry/react-native` | Error tracking | 🟡 |
| `date-fns` | Date formatting | 🟡 |

---

## Backend File Structure

```
backend/
├── src/
│   ├── config/                   # Configuration
│   │   ├── database.ts           # Prisma client
│   │   ├── redis.ts              # Redis connection
│   │   ├── s3.ts                 # AWS S3 client
│   │   ├── openai.ts             # OpenAI client
│   │   ├── perplexity.ts         # Perplexity client
│   │   ├── stripe.ts             # Stripe client
│   │   └── env.ts                # Environment validation
│   │
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # JWT verification
│   │   ├── rateLimit.ts          # Rate limiting
│   │   ├── errorHandler.ts       # Global error handler
│   │   ├── validation.ts         # Request validation
│   │   ├── logging.ts            # Request logging
│   │   └── cors.ts               # CORS configuration
│   │
│   ├── routes/                   # API routes
│   │   ├── index.ts              # Route aggregator
│   │   ├── auth.routes.ts        # Auth endpoints
│   │   ├── users.routes.ts       # User endpoints
│   │   ├── questions.routes.ts   # Question endpoints
│   │   ├── manuals.routes.ts     # Manual endpoints
│   │   ├── units.routes.ts       # Saved units endpoints
│   │   ├── oems.routes.ts        # OEM/model endpoints
│   │   ├── feedback.routes.ts    # Feedback endpoints
│   │   ├── discovery.routes.ts   # Discovery endpoints
│   │   ├── payments.routes.ts    # Stripe endpoints
│   │   └── admin.routes.ts       # Admin endpoints (future)
│   │
│   ├── controllers/              # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── questions.controller.ts
│   │   ├── manuals.controller.ts
│   │   ├── units.controller.ts
│   │   ├── oems.controller.ts
│   │   ├── feedback.controller.ts
│   │   ├── discovery.controller.ts
│   │   └── payments.controller.ts
│   │
│   ├── services/                 # Business logic
│   │   ├── auth/
│   │   │   ├── authService.ts    # Login/register logic
│   │   │   ├── magicLinkService.ts # Magic link generation
│   │   │   ├── tokenService.ts   # JWT creation/validation
│   │   │   └── emailService.ts   # Email sending
│   │   │
│   │   ├── discovery/
│   │   │   ├── perplexityService.ts # Perplexity API calls
│   │   │   ├── discoveryService.ts  # Discovery orchestration
│   │   │   └── discoveryJobs.ts     # Scheduled discovery jobs
│   │   │
│   │   ├── ingestion/
│   │   │   ├── pdfService.ts     # PDF download
│   │   │   ├── extractionService.ts # Text extraction
│   │   │   ├── chunkingService.ts   # Section chunking
│   │   │   ├── embeddingService.ts  # Generate embeddings
│   │   │   └── ingestionWorker.ts   # Queue worker
│   │   │
│   │   ├── answering/
│   │   │   ├── questionService.ts   # Question processing
│   │   │   ├── retrievalService.ts  # RAG retrieval
│   │   │   ├── llmService.ts        # OpenAI GPT calls
│   │   │   ├── safetyService.ts     # Safety warning extraction
│   │   │   └── confidenceService.ts # Confidence scoring
│   │   │
│   │   ├── manuals/
│   │   │   ├── manualService.ts     # Manual CRUD
│   │   │   ├── sectionService.ts    # Section CRUD
│   │   │   └── versionService.ts    # Version management
│   │   │
│   │   ├── feedback/
│   │   │   ├── feedbackService.ts   # Feedback processing
│   │   │   └── confidenceUpdater.ts # Update manual scores
│   │   │
│   │   ├── payments/
│   │   │   ├── stripeService.ts     # Stripe integration
│   │   │   ├── subscriptionService.ts # Subscription logic
│   │   │   └── usageService.ts      # Usage tracking
│   │   │
│   │   └── storage/
│   │       ├── s3Service.ts         # S3 operations
│   │       └── cacheService.ts      # Redis caching
│   │
│   ├── jobs/                     # Background jobs
│   │   ├── queues/
│   │   │   ├── ingestionQueue.ts    # Manual ingestion queue
│   │   │   ├── embeddingQueue.ts    # Embedding generation queue
│   │   │   └── discoveryQueue.ts    # Discovery queue
│   │   │
│   │   ├── workers/
│   │   │   ├── ingestionWorker.ts
│   │   │   ├── embeddingWorker.ts
│   │   │   └── discoveryWorker.ts
│   │   │
│   │   └── schedulers/
│   │       ├── weeklyDiscovery.ts   # Weekly discovery job
│   │       ├── quarterlySweep.ts    # Quarterly sweep job
│   │       └── usageReset.ts        # Monthly usage reset
│   │
│   ├── utils/                    # Utility functions
│   │   ├── validation.ts         # Zod schemas
│   │   ├── formatters.ts         # Data formatters
│   │   ├── logger.ts             # Winston logger
│   │   ├── errors.ts             # Custom error classes
│   │   ├── crypto.ts             # Hashing utilities
│   │   └── constants.ts          # App constants
│   │
│   ├── types/                    # TypeScript types
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── models.ts
│   │   ├── services.ts
│   │   └── shared.ts             # Shared with frontend
│   │
│   ├── db/                       # Database
│   │   ├── migrations/           # SQL migrations
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_add_indexes.sql
│   │   │   └── ...
│   │   │
│   │   ├── seeds/                # Seed data
│   │   │   ├── oems.ts           # Sample OEMs
│   │   │   ├── models.ts         # Sample models
│   │   │   └── users.ts          # Test users
│   │   │
│   │   └── schema.prisma         # Prisma schema
│   │
│   ├── __tests__/                # Tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server entry point
│
├── scripts/                      # Utility scripts
│   ├── migrate.ts                # Run migrations
│   ├── seed.ts                   # Seed database
│   ├── recalculate-ratings.ts   # Recalculate confidence scores
│   └── test-discovery.ts         # Test Perplexity
│
├── .env.development
├── .env.staging
├── .env.production
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── nodemon.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Backend Packages

### Core Dependencies

```json
{
  "dependencies": {
    // Framework
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0",
    "compression": "^1.7.4",
    
    // Database & ORM
    "@prisma/client": "^6.5.0",
    "pg": "^8.13.0",
    "pgvector": "^0.2.0",
    
    // Cache & Queue
    "redis": "^4.7.0",
    "bull": "^4.17.0",
    "bull-board": "^2.2.0",
    
    // File Storage (optional - can use PostgreSQL initially)
    // "@supabase/supabase-js": "^2.45.0",  // Uncomment when ready to use Supabase Storage
    
    // AI Services
    "openai": "^4.77.0",
    "axios": "^1.7.0",
    
    // PDF Processing
    "pdf-parse": "^1.1.1",
    "pdfjs-dist": "^4.10.38",
    
    // Authentication
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    
    // Email
    "nodemailer": "^6.9.16",
    
    // Payments
    "stripe": "^17.5.0",
    
    // Validation
    "zod": "^3.23.0",
    
    // Utils
    "dotenv": "^16.4.7",
    "date-fns": "^4.1.0",
    "uuid": "^11.0.4",
    "crypto": "^1.0.1",
    
    // Logging & Monitoring
    "winston": "^3.17.0",
    "@sentry/node": "^8.46.0",
    
    // Rate Limiting
    "express-rate-limit": "^7.5.0",
    "rate-limit-redis": "^4.2.1",
    
    // Scheduling
    "node-cron": "^3.0.3"
  },
  
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.5",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcrypt": "^5.0.2",
    "@types/nodemailer": "^6.4.17",
    "@types/uuid": "^10.0.0",
    "typescript": "~5.9.2",
    
    // Prisma
    "prisma": "^6.5.0",
    
    // Testing
    "jest": "^29.7.0",
    "@types/jest": "^29.5.14",
    "ts-jest": "^29.2.5",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    
    // Dev Tools
    "nodemon": "^3.1.9",
    "ts-node": "^10.9.2",
    "tsx": "^4.19.2",
    
    // Linting
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    
    // Formatting
    "prettier": "^3.3.0"
  }
}
```

### Package Purposes

| Package | Purpose | Critical? |
|---------|---------|-----------|
| `express` | Web framework | ✅ |
| `@prisma/client` | Database ORM | ✅ |
| `bull` | Background job queue | ✅ |
| `openai` | GPT-4 + embeddings | ✅ |
| `@aws-sdk/client-s3` | File storage | ✅ |
| `pdfjs-dist` | PDF parsing | ✅ |
| `stripe` | Payments | ✅ |
| `jsonwebtoken` | Auth tokens | ✅ |
| `redis` | Cache + sessions | ✅ |
| `nodemailer` | Magic links | ✅ |
| `winston` | Logging | 🟡 |
| `@sentry/node` | Error tracking | 🟡 |

---

## Shared Types

Create a shared types package that both frontend and backend import:

```typescript
// types/shared.ts (used by both)

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'technician' | 'admin' | 'company_admin';
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
}

export interface OEM {
  id: string;
  name: string;
  vertical: string;
  logoUrl?: string;
}

export interface Model {
  id: string;
  modelNumber: string;
  oemName: string;
  category: string;
}

export interface Manual {
  id: string;
  modelId: string;
  manualType: string;
  title: string;
  revision: string;
  publishDate: string;
  confidenceScore: number;
  status: 'active' | 'pending' | 'deprecated' | 'quarantined';
}

export interface Question {
  id: string;
  userId: string;
  modelId: string;
  questionText: string;
  answerText?: string;
  confidence: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface Answer {
  safetyWarnings: string[];
  mainAnswer: string;
  procedure?: {
    steps: string[];
    estimatedTime?: string;
    requiredTools?: string[];
  };
  citations: Citation[];
  fieldConfirmed?: FieldConfirmedInfo;
  confidence: 'high' | 'medium' | 'low';
}

export interface Citation {
  manualTitle: string;
  revision: string;
  pages: string;
  confidence: number;
}

export interface SavedUnit {
  id: string;
  userId: string;
  modelId: string;
  nickname: string;
  serialNumber?: string;
  installDate?: string;
  location?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// API Error codes
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}
```

---

## Configuration Files

### Frontend Config Files

#### `app.json` (Expo)
```json
{
  "expo": {
    "name": "OEM TechTalk",
    "slug": "oemtechtalk",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "oemtechtalk",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563EB"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.oemtechtalk.app",
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access to scan serial plates."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#2563EB"
      },
      "package": "com.oemtechtalk.app",
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow OEM TechTalk to access your camera to scan serial plates."
        }
      ]
    ]
  }
}
```

#### `tsconfig.json`
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./components/*"],
      "@services/*": ["./services/*"],
      "@hooks/*": ["./hooks/*"],
      "@utils/*": ["./utils/*"],
      "@types/*": ["./types/*"]
    }
  }
}
```

#### `.env.development`
```bash
API_URL=http://localhost:3000
STRIPE_PUBLISHABLE_KEY=pk_test_...
POSTHOG_API_KEY=...
SENTRY_DSN=...
```

### Backend Config Files

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@config/*": ["./src/config/*"],
      "@services/*": ["./src/services/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### `.env.development`
```bash
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oemtechtalk_dev

# Redis
REDIS_URL=redis://localhost:6379

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=oemtechtalk-dev

# OpenAI
OPENAI_API_KEY=sk-...

# Perplexity
PERPLEXITY_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=30d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=noreply@oemtechtalk.com

# Sentry
SENTRY_DSN=...

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: oemtechtalk_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Next Steps

1. **Review this structure** - Does it align with your vision?
2. **Adjust priorities** - Anything missing or unnecessary?
3. **Choose approach**:
   - Start with mobile app structure
   - Start with backend API structure
   - Do both in parallel

Let me know if you want me to:
- Generate all package.json files
- Create the folder structure
- Start implementing core files
