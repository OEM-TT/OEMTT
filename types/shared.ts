/**
 * Shared TypeScript types used by both mobile app and backend
 * These types ensure consistency across the entire application
 */

// ============================================
// User & Authentication
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  companyId?: string;
  createdAt: string;
  lastActiveAt?: string;
  onboardingCompleted: boolean;
}

export type UserRole = 'technician' | 'admin' | 'company_admin';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

// ============================================
// OEMs & Products
// ============================================

export interface OEM {
  id: string;
  name: string;
  vertical: string; // HVAC, Appliance, Plumbing, etc.
  website?: string;
  logoUrl?: string;
  documentationPortals?: string[];
  regionsSupported?: string[];
  status: 'active' | 'deprecated';
  createdAt: string;
}

export interface ProductLine {
  id: string;
  oemId: string;
  oemName: string;
  name: string;
  category: string; // Heat Pump, Furnace, Air Handler, etc.
  description?: string;
}

export interface Model {
  id: string;
  productLineId: string;
  modelNumber: string;
  oemName: string;
  category: string;
  variants?: string[];
  yearsActive?: number[];
  specifications?: Record<string, any>;
  discontinued: boolean;
}

// ============================================
// Manuals
// ============================================

export interface Manual {
  id: string;
  modelId: string;
  manualType: ManualType;
  title: string;
  revision?: string;
  publishDate?: string;
  sourceUrl?: string;
  sourceType: ManualSourceType;
  fileUrl?: string;
  pageCount?: number;
  language: string;
  confidenceScore: number; // 0.00 to 1.00
  status: ManualStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ManualType =
  | 'service'
  | 'installation'
  | 'wiring'
  | 'parts'
  | 'troubleshooting'
  | 'specification'
  | 'owner';

export type ManualSourceType = 'oem' | 'distributor' | 'user_upload' | 'field_confirmed';

export type ManualStatus = 'pending' | 'active' | 'deprecated' | 'quarantined';

export interface ManualSection {
  id: string;
  manualId: string;
  sectionTitle?: string;
  sectionType: SectionType;
  content: string;
  pageReference?: string;
  metadata?: Record<string, any>;
}

export type SectionType =
  | 'procedure'
  | 'warning'
  | 'table'
  | 'diagram'
  | 'spec'
  | 'troubleshooting'
  | 'general';

// ============================================
// Questions & Answers
// ============================================

export interface Question {
  id: string;
  userId: string;
  modelId: string;
  manualId?: string;
  questionText: string;
  context?: QuestionContext;
  answerText?: string;
  answerSources?: Citation[];
  confidence?: ConfidenceLevel;
  processingTimeMs?: number;
  createdAt: string;
}

export interface QuestionContext {
  intent?: 'troubleshooting' | 'installation' | 'wiring' | 'specs' | 'general';
  symptoms?: string[];
  errorCodes?: string[];
  [key: string]: any;
}

export interface Answer {
  safetyWarnings: SafetyWarning[];
  mainAnswer: string;
  procedure?: Procedure;
  citations: Citation[];
  fieldConfirmed?: FieldConfirmedInfo;
  confidence: ConfidenceLevel;
  relatedQuestions?: string[];
}

export interface SafetyWarning {
  severity: 'danger' | 'warning' | 'caution';
  message: string;
}

export interface Procedure {
  steps: string[];
  estimatedTime?: string;
  requiredTools?: string[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
}

export interface Citation {
  manualTitle: string;
  manualType: ManualType;
  revision?: string;
  pages: string;
  confidence: number;
  sectionId?: string;
}

export interface FieldConfirmedInfo {
  content: string;
  source: string;
  evidenceLevel: 'high' | 'medium' | 'low';
  contributorType: 'certified_tech' | 'company' | 'community';
  upvotes: number;
  downvotes: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ============================================
// Saved Units
// ============================================

export interface SavedUnit {
  id: string;
  userId: string;
  modelId: string;
  model?: Model;
  nickname: string;
  serialNumber?: string;
  installDate?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Feedback
// ============================================

export interface Feedback {
  id: string;
  userId: string;
  questionId?: string;
  manualId?: string;
  feedbackType: FeedbackType;
  rating?: number; // 1-5
  rejectionReason?: RejectionReason;
  comment?: string;
  createdAt: string;
}

export type FeedbackType =
  | 'answer_helpful'
  | 'answer_unhelpful'
  | 'manual_correct'
  | 'manual_incorrect';

export type RejectionReason = 'wrong_model' | 'outdated' | 'incomplete' | 'incorrect_info';

// ============================================
// Subscriptions & Usage
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceMonthly?: number; // in cents
  priceYearly?: number; // in cents
  features: string[];
  limits: SubscriptionLimits;
  stripePriceId?: string;
  active: boolean;
}

export interface SubscriptionLimits {
  questionsPerMonth: number; // -1 = unlimited
  questionsPerDay: number; // -1 = unlimited
  savedUnits: number; // -1 = unlimited
  [key: string]: number;
}

export interface Usage {
  userId: string;
  periodStart: string;
  periodEnd: string;
  questionsAsked: number;
  questionsLimit: number;
  resetAt: string;
}

// ============================================
// API Responses
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  message: string;
  code: ErrorCode;
  details?: Record<string, any>;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  timestamp?: string;
}

export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Authorization
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Server
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  PERPLEXITY_ERROR = 'PERPLEXITY_ERROR',
}

// ============================================
// Discovery & Ingestion
// ============================================

export interface DiscoveryJob {
  id: string;
  jobType: 'user_triggered' | 'weekly_incremental' | 'quarterly_sweep';
  searchQuery?: string;
  searchProvider: 'perplexity' | 'other';
  results?: DiscoveryResult[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  triggeredBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DiscoveryResult {
  url: string;
  title?: string;
  publishDate?: string;
  source?: string;
  confidence?: number;
}

export interface IngestionJob {
  id: string;
  manualUrl: string;
  modelId?: string;
  priority: number; // 1-10
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

// ============================================
// Utility Types
// ============================================

export type Pagination = {
  page: number;
  pageSize: number;
  total?: number;
};

export type SortOrder = 'asc' | 'desc';

export type DateRange = {
  start: string;
  end: string;
};
