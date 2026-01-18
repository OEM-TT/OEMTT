/**
 * Application Constants
 * 
 * Centralized constants used throughout the app
 */

// ============================================
// API Configuration
// ============================================

export const API_CONFIG = {
  BASE_URL: process.env.API_URL || 'http://localhost:3000/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// ============================================
// App Information
// ============================================

export const APP_INFO = {
  NAME: 'OEM TechTalk',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@oemtechtalk.com',
  PRIVACY_URL: 'https://oemtechtalk.com/privacy',
  TERMS_URL: 'https://oemtechtalk.com/terms',
} as const;

// ============================================
// Equipment Verticals
// ============================================

export const VERTICALS = [
  { id: 'hvac', name: 'HVAC', icon: 'snow' },
  { id: 'appliance', name: 'Appliance', icon: 'home' },
  { id: 'plumbing', name: 'Plumbing', icon: 'water' },
  { id: 'electrical', name: 'Electrical', icon: 'flash' },
] as const;

// ============================================
// HVAC Categories
// ============================================

export const HVAC_CATEGORIES = [
  'Heat Pump',
  'Air Conditioner',
  'Furnace',
  'Air Handler',
  'Boiler',
  'Water Heater',
  'Thermostat',
  'Ductless Mini-Split',
] as const;

// ============================================
// Manual Types
// ============================================

export const MANUAL_TYPES = [
  { id: 'service', name: 'Service Manual', icon: 'build' },
  { id: 'installation', name: 'Installation Manual', icon: 'construct' },
  { id: 'wiring', name: 'Wiring Diagram', icon: 'git-network' },
  { id: 'parts', name: 'Parts List', icon: 'list' },
  { id: 'troubleshooting', name: 'Troubleshooting Guide', icon: 'help-circle' },
  { id: 'specification', name: 'Specifications', icon: 'document-text' },
  { id: 'owner', name: 'Owner\'s Manual', icon: 'person' },
] as const;

// ============================================
// Question Context Types
// ============================================

export const QUESTION_CONTEXTS = [
  { id: 'troubleshooting', name: 'Troubleshooting', icon: 'help-circle' },
  { id: 'installation', name: 'Installation', icon: 'construct' },
  { id: 'wiring', name: 'Wiring', icon: 'git-network' },
  { id: 'specs', name: 'Specifications', icon: 'document-text' },
  { id: 'maintenance', name: 'Maintenance', icon: 'build' },
] as const;

// ============================================
// Subscription Tiers
// ============================================

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    questionsPerMonth: 50,
    questionsPerDay: 5,
    savedUnits: 5,
    features: [
      'Basic troubleshooting',
      '50 questions per month',
      '5 saved units',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    priceMonthly: 1999, // $19.99 in cents
    priceYearly: 19900, // $199/year in cents
    questionsPerMonth: 1000,
    questionsPerDay: 100,
    savedUnits: 50,
    features: [
      'Advanced diagnostics',
      '1000 questions per month',
      '50 saved units',
      'Priority support',
      'Offline access',
      'Custom tags & notes',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Contact Sales',
    questionsPerMonth: -1, // Unlimited
    questionsPerDay: -1,
    savedUnits: -1,
    features: [
      'Unlimited questions',
      'Unlimited saved units',
      'Multi-user accounts',
      'API access',
      'Dedicated support',
      'Custom integrations',
    ],
  },
} as const;

// ============================================
// Feedback Options
// ============================================

export const REJECTION_REASONS = [
  { id: 'wrong_model', name: 'Wrong Model', description: 'Manual is for a different model' },
  { id: 'outdated', name: 'Outdated', description: 'Manual is outdated or superseded' },
  { id: 'incomplete', name: 'Incomplete', description: 'Missing important information' },
  { id: 'incorrect_info', name: 'Incorrect Info', description: 'Contains incorrect information' },
] as const;

// ============================================
// Safety Warning Types
// ============================================

export const SAFETY_LEVELS = {
  danger: {
    name: 'DANGER',
    description: 'Immediate risk of death or serious injury',
    icon: 'warning',
  },
  warning: {
    name: 'WARNING',
    description: 'Could result in injury',
    icon: 'alert',
  },
  caution: {
    name: 'CAUTION',
    description: 'Could result in property damage',
    icon: 'information-circle',
  },
} as const;

// ============================================
// Validation Rules
// ============================================

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
  MODEL_NUMBER_REGEX: /^[A-Z0-9\-]+$/i,
  SERIAL_NUMBER_REGEX: /^[A-Z0-9]+$/i,
  
  MIN_PASSWORD_LENGTH: 8,
  MAX_QUESTION_LENGTH: 500,
  MAX_COMMENT_LENGTH: 1000,
  MAX_NICKNAME_LENGTH: 50,
} as const;

// ============================================
// Storage Keys
// ============================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@oemtechtalk:authToken',
  REFRESH_TOKEN: '@oemtechtalk:refreshToken',
  USER_DATA: '@oemtechtalk:userData',
  RECENT_UNITS: '@oemtechtalk:recentUnits',
  ONBOARDING_COMPLETE: '@oemtechtalk:onboardingComplete',
  THEME_PREFERENCE: '@oemtechtalk:themePreference',
} as const;

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  RATE_LIMIT: 'You\'ve reached your monthly question limit. Upgrade to ask more.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;

// ============================================
// Date/Time Formats
// ============================================

export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  WITH_TIME: 'MM/DD/YYYY hh:mm A',
  TIME_ONLY: 'hh:mm A',
  ISO: 'YYYY-MM-DDTHH:mm:ss',
} as const;

// ============================================
// OCR Configuration
// ============================================

export const OCR_CONFIG = {
  SUPPORTED_LANGUAGES: ['eng'],
  CONFIDENCE_THRESHOLD: 0.6,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// ============================================
// Animation Durations
// ============================================

export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// ============================================
// Platform-Specific
// ============================================

export const IS_IOS = require('react-native').Platform.OS === 'ios';
export const IS_ANDROID = require('react-native').Platform.OS === 'android';
export const IS_WEB = require('react-native').Platform.OS === 'web';
