/**
 * Model Number Extraction Utility
 * Extracts base model numbers from full serial/configuration strings
 * 
 * Examples:
 * - "50P3C070540GMYCSDJ" → "50P3"
 * - "19XR-1234-ABC" → "19XR"
 * - "AAON-RN-030" → "RN-030"
 */

/**
 * Extract base model number from a full model/serial string
 * 
 * HVAC model numbers typically follow patterns:
 * - Base model (letters + numbers): "50P3", "19XR", "48HC"
 * - Followed by configuration codes (capacity, voltage, options)
 * 
 * Strategy:
 * 1. Remove common prefixes (OEM name if present)
 * 2. Extract the core model identifier (usually first 3-6 characters)
 * 3. Stop at first configuration delimiter (long numeric string, specific letters)
 */
export function extractBaseModel(fullModelNumber: string): string {
  if (!fullModelNumber) return '';

  // Clean input
  let cleaned = fullModelNumber.trim().toUpperCase();

  // Remove common OEM prefixes that might be in the string
  const oemPrefixes = ['CARRIER-', 'TRANE-', 'YORK-', 'LENNOX-', 'DAIKIN-'];
  for (const prefix of oemPrefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length);
    }
  }

  // Pattern 1: Letters followed by digits, then configuration codes
  // Example: "50P3C070540GMYCSDJ" → extract "50P3"
  // Look for: digit+letter+digit pattern (common base models like 50P3, 19XR, 48HC)
  const basePattern = /^(\d+[A-Z]+\d*)/;
  const baseMatch = cleaned.match(basePattern);
  
  if (baseMatch) {
    const base = baseMatch[1];
    
    // If followed by a long numeric sequence (capacity codes), stop there
    // Example: "50P3C070540" - "50P3" is base, "C070540" is config
    const configPattern = /^(\d+[A-Z]+\d*)([A-Z]?\d{5,})/;
    const configMatch = cleaned.match(configPattern);
    
    if (configMatch) {
      return configMatch[1]; // Return just the base part
    }
    
    // If followed by specific config letters (C, G, H, etc.) and more digits
    // Example: "50P3C070540GMYCSDJ" - stop at first config letter after base
    const detailedConfigPattern = /^(\d+[A-Z]+\d*)([A-Z]\d+[A-Z]*.*)/;
    const detailedMatch = cleaned.match(detailedConfigPattern);
    
    if (detailedMatch) {
      return detailedMatch[1];
    }
    
    return base;
  }

  // Pattern 2: Dash-separated (less common)
  // Example: "19XR-1234-ABC" → "19XR"
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    // Return first part if it looks like a model (has both letters and numbers)
    if (parts[0] && /[A-Z]/.test(parts[0]) && /\d/.test(parts[0])) {
      return parts[0];
    }
  }

  // Pattern 3: Pure letter-number combos (no config codes detected)
  // Example: "RN030" might be the full base model
  // If string is short (< 8 chars) and has letters+numbers, assume it's base model
  if (cleaned.length <= 7 && /[A-Z]/.test(cleaned) && /\d/.test(cleaned)) {
    return cleaned;
  }

  // Fallback: If we can't parse, try to extract first meaningful segment
  // Take first 4-6 characters that contain both letters and numbers
  const fallbackPattern = /^([A-Z0-9]{3,6})/;
  const fallbackMatch = cleaned.match(fallbackPattern);
  
  if (fallbackMatch) {
    return fallbackMatch[1];
  }

  // Last resort: return cleaned input (better than nothing)
  return cleaned;
}

/**
 * Generate search variants for a model number
 * Returns array of variants to try when searching database
 * 
 * Example: "50P3C070540GMYCSDJ" → ["50P3C070540GMYCSDJ", "50P3"]
 */
export function getModelSearchVariants(fullModelNumber: string): string[] {
  const variants = new Set<string>();
  
  // Always include original
  variants.add(fullModelNumber.trim().toUpperCase());
  
  // Add base model
  const base = extractBaseModel(fullModelNumber);
  if (base && base !== fullModelNumber.trim().toUpperCase()) {
    variants.add(base);
  }
  
  // Add common variations (remove spaces, dashes)
  const normalized = fullModelNumber.replace(/[\s-]/g, '').toUpperCase();
  if (normalized !== fullModelNumber.trim().toUpperCase()) {
    variants.add(normalized);
  }
  
  return Array.from(variants);
}

/**
 * Test cases (for verification)
 */
export const TEST_CASES = [
  { input: '50P3C070540GMYCSDJ', expected: '50P3' },
  { input: '19XR-1234-ABC', expected: '19XR' },
  { input: '48HC', expected: '48HC' },
  { input: 'CARRIER-50P3C070540', expected: '50P3' },
  { input: 'RN-030', expected: 'RN-030' },
  { input: '30GTN060', expected: '30GTN060' }, // Full base model
  { input: '23XRV', expected: '23XRV' },
];
