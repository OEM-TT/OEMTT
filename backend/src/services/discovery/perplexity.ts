/**
 * Perplexity API Service - Find manuals on the web
 * Only triggered when manual doesn't exist in database
 */

import axios from 'axios';
import { extractBaseModel } from '@/utils/modelNumber';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export type ManualType =
  | 'controls'
  | 'startup'
  | 'operation'
  | 'troubleshooting'
  | 'installation'
  | 'maintenance'
  | 'service'
  | 'parts'
  | 'specifications'
  | 'wiring'
  | 'other';

interface ManualResult {
  pdfUrl: string;
  title: string;
  source: string;
  type: ManualType;
  priority: number; // 1 = highest, 3 = lowest
}

interface PerplexitySearchResult {
  found: boolean;
  manuals: ManualResult[];
}

interface PDFVerification {
  valid: boolean;
  size?: number;
  pageCount?: number;
  error?: string;
}

/**
 * Search for ALL available manuals using Perplexity
 * Finds multiple manual types with prioritization
 * Restricted to official documentation sources only
 */
export async function findAllManuals(
  oem: string,
  modelNumber: string
): Promise<PerplexitySearchResult> {
  // Extract base model number for cleaner search
  const baseModel = extractBaseModel(modelNumber);
  const searchModel = baseModel || modelNumber;

  console.log(`🔍 Perplexity: Searching for ${oem} ${searchModel} manuals...`);
  if (baseModel !== modelNumber) {
    console.log(`   📝 Extracted base model: ${searchModel} from ${modelNumber}`);
  }

  const prompt = `Find ALL available direct PDF download links for the official ${oem} ${searchModel} manuals.

⚠️ CRITICAL REQUIREMENTS - ALL MUST BE MET:

🎯 MODEL MATCH GUIDANCE:
- Find manuals for "${searchModel}" model or closely related variants
- Cast a WIDE net - include manuals for the same model series/family
- Examples of GOOD matches for "30HXC": "30HX", "30HXC", "30H", "30-series"
- Look for BOTH new AND old manual versions/revisions
- Filenames may vary (e.g., "48_50P-9T.pdf" might be for "50P3")
- When in doubt, INCLUDE IT - we will validate the actual PDF content automatically
- Only skip obviously different model series (e.g., don't get "19XR" when searching for "30HXC")

1. Links MUST be DIRECT PDF files (downloadable via HTTP GET)
   - ✅ GOOD: https://www.shareddocs.com/hvac/docs/1009000/Public/04/04-5810-0141-02.pdf
   - ❌ BAD: https://manualslib.com/manual/... (requires clicks/captcha)

2. NO barriers allowed:
   - ❌ NO captchas, logins, or registration
   - ❌ NO "click to download" pages
   - ✅ MUST work with: curl [URL] > file.pdf

3. ONLY these trusted domains:
   - shareddocs.com (PREFERRED - direct PDFs)
   - carrier.com/commercial/literature
   - lennox.com/support
   - trane.com/commercial/literature
   - york.com/support
   
4. Find AT LEAST 3-5 DIFFERENT manual types for "${searchModel}":
   
   🎯 PRIORITY 1 - MUST FIND (controls/troubleshooting):
   - Controls manual (CCN, ComfortLink, etc.)
   - Startup/commissioning manual
   - Operation manual
   - Troubleshooting guide (flash codes, diagnostics)
   
   🎯 PRIORITY 2 - VERY IMPORTANT (installation/service):
   - Installation manual (rigging, piping, wiring)
   - Service manual (maintenance procedures)
   - Maintenance manual
   
   🎯 PRIORITY 3 - HELPFUL (specs/parts):
   - Parts catalog
   - Wiring diagrams
   - Specifications/submittal sheet

5. IMPORTANT: Search thoroughly and return MULTIPLE manuals (3-5 different types)
   - Look for BOTH newer AND older manual versions
   - Include family/series manuals (e.g., "30HX Series")
   - Each manual should serve a different purpose
   
6. Return UP TO 5 UNIQUE manuals (no duplicates)
7. Each URL MUST end in .pdf

Return in this EXACT format (include AT LEAST 2 manuals if available):
---
URL: [direct PDF link 1]
Title: [manual title 1]
Type: [controls|startup|operation|troubleshooting|installation|maintenance|service|parts|wiring|specifications]
---
URL: [direct PDF link 2]
Title: [manual title 2]
Type: [type]
---
URL: [direct PDF link 3]
Title: [manual title 3]
Type: [type]
---
(continue for up to 5 manuals)

CRITICAL: Find MULTIPLE different manuals! Don't just return one - search for controls, installation, service, etc.

If absolutely no direct-download PDFs found for "${searchModel}", respond with "NOT FOUND"`;

  try {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar', // Fast model for web search
        messages: [
          {
            role: 'system',
            content: 'You are a technical documentation finder. Your goal is to find MULTIPLE (3-5) official OEM PDF manuals from authorized sources. Search thoroughly for controls, installation, service, troubleshooting, and maintenance manuals. Return each one separately with its type.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Slight randomness to find more varied results
        max_tokens: 2000, // Increased for multiple manuals (was 1500)
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const answer = response.data.choices[0]?.message?.content || '';

    console.log(`\n📋 Raw Perplexity Response (first 500 chars):\n${answer.substring(0, 500)}...\n`);

    // Parse response
    if (answer.includes('NOT FOUND') || !answer.includes('.pdf')) {
      console.log('❌ Perplexity: No manuals found');
      return { found: false, manuals: [] };
    }

    // Extract multiple manuals from response
    console.log(`📊 Parsing Perplexity response for manuals...`);
    const manuals = await parseMultipleManuals(answer, oem, searchModel);

    if (manuals.length === 0) {
      console.log('⚠️  Perplexity: No valid manuals found after parsing');
      return { found: false, manuals: [] };
    }

    console.log(`✅ Perplexity: Found ${manuals.length} manual(s)`);
    manuals.forEach((m, i) => {
      console.log(`   ${i + 1}. [P${m.priority}] ${m.type.toUpperCase()}: ${m.title}`);
    });

    return {
      found: true,
      manuals,
    };
  } catch (error: any) {
    console.error('❌ Perplexity API error:', error.response?.data || error.message);
    return { found: false, manuals: [] };
  }
}

/**
 * Extract text from the first page of a PDF to verify model number
 * Uses pdf-parse (simpler than pdfjs-dist for text extraction)
 */
async function extractPDFTitlePage(url: string): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');

    // Download first 500KB (usually enough for first page)
    const response = await axios.get(url, {
      timeout: 15000,
      responseType: 'arraybuffer',
      headers: {
        Range: 'bytes=0-512000', // First 500KB
      },
      validateStatus: (status) => status === 200 || status === 206,
    });

    const pdfBuffer = Buffer.from(response.data);

    // Parse PDF text (pdf-parse is simpler and more reliable)
    const data = await pdfParse(pdfBuffer, {
      max: 1, // Only parse first page
    });

    // Get first 500 characters (title area)
    const titleText = data.text.substring(0, 500).toUpperCase();

    console.log(`   📄 PDF Title Page: ${titleText.substring(0, 100).replace(/\n/g, ' ')}...`);

    return titleText;
  } catch (error: any) {
    console.log(`   ⚠️  Could not extract PDF title page: ${error.message}`);
    return '';
  }
}

/**
 * Validate model match using PDF content (most accurate)
 * Falls back to title/URL validation if PDF extraction fails
 */
async function validateModelMatch(
  title: string,
  url: string,
  targetModel: string
): Promise<{ isValid: boolean; reason?: string }> {
  const target = targetModel.toUpperCase();

  // STEP 1: Try to validate using actual PDF content (most accurate!)
  console.log(`   🔍 Validating by reading PDF content...`);
  const pdfContent = await extractPDFTitlePage(url);

  if (pdfContent) {
    // Check if target model appears in PDF's title page
    if (pdfContent.includes(target)) {
      console.log(`   ✅ Model "${targetModel}" confirmed in PDF content`);
      return { isValid: true };
    }

    // Check for conflicting models in PDF content
    const baseModelPattern = /(\d+)([A-Z]+)/;
    const targetMatch = target.match(baseModelPattern);

    if (targetMatch) {
      const [, targetDigits, targetLetters] = targetMatch;
      const foundModels = pdfContent.match(/\b\d+[A-Z]+\d*\b/g) || [];

      for (const foundModel of foundModels) {
        if (foundModel === target) continue;

        const foundMatch = foundModel.match(baseModelPattern);
        if (foundMatch) {
          const [, foundDigits, foundLetters] = foundMatch;

          // Same digits, different letters = wrong model
          if (foundDigits === targetDigits && foundLetters !== targetLetters) {
            return {
              isValid: false,
              reason: `PDF content shows "${foundModel}", not "${targetModel}"`
            };
          }
        }
      }
    }

    // If we got here, PDF doesn't mention target model at all
    return {
      isValid: false,
      reason: `Model "${targetModel}" not found in PDF content`
    };
  }

  // STEP 2: Fallback - VERY LENIENT (we trust Perplexity + can't verify PDF)
  console.log(`   ⚠️  Falling back to lenient validation (can't read PDF)...`);
  const combined = `${title} ${url}`.toUpperCase();

  // If target model is clearly in title/URL, accept
  if (combined.includes(target)) {
    console.log(`   ✅ Model "${targetModel}" found in title/URL`);
    return { isValid: true };
  }

  // Check if this looks like a very different model (only reject OBVIOUS mismatches)
  // Example: Searching for "30HXC", found "19XR" → reject
  // Example: Searching for "30HXC", found "30HX" → ACCEPT (might be a variant/family doc)
  const baseModelPattern = /(\d+)([A-Z]+)/;
  const targetMatch = target.match(baseModelPattern);

  if (targetMatch) {
    const [, targetDigits] = targetMatch;
    const foundModels = combined.match(/\b\d+[A-Z]+\d*\b/g) || [];

    for (const foundModel of foundModels) {
      const foundMatch = foundModel.match(baseModelPattern);
      if (foundMatch) {
        const [, foundDigits] = foundMatch;

        // Only reject if COMPLETELY different model series (different digits)
        // Example: "30HXC" vs "19XR" → different (30 vs 19)
        // Example: "30HXC" vs "30HX" → same series (30 vs 30)
        if (foundDigits !== targetDigits) {
          // Different model series - probably wrong
          return {
            isValid: false,
            reason: `Title/URL shows different model series "${foundModel}" (expected something like "${targetModel}")`
          };
        }
      }
    }
  }

  // If we get here: couldn't verify PDF, no obvious conflicts → ACCEPT
  // Better to over-include and let users report issues than miss valid manuals
  console.log(`   ✅ No obvious conflicts - accepting (Perplexity found it, trusting the AI)`);
  return { isValid: true };
}

/**
 * Parse multiple manuals from Perplexity response
 * Validates, deduplicates, and prioritizes
 */
async function parseMultipleManuals(
  response: string,
  oem: string,
  modelNumber: string
): Promise<ManualResult[]> {
  const manuals: ManualResult[] = [];
  const seenUrls = new Set<string>();

  // Split by manual sections (---\nURL:)
  const sections = response.split(/---+/);

  for (const section of sections) {
    if (!section.trim() || !section.includes('URL:')) continue;

    // Extract URL
    const urlMatch = section.match(/URL:\s*(https?:\/\/[^\s]+\.pdf)/i);
    if (!urlMatch) continue;

    const pdfUrl = urlMatch[1].trim();

    // Skip duplicates
    if (seenUrls.has(pdfUrl)) continue;

    // Extract title early for validation
    const titleMatch = section.match(/Title:\s*(.+?)(?:\n|$)/i);
    const title = titleMatch
      ? titleMatch[1].trim()
      : `${oem} ${modelNumber} Manual`;

    console.log(`\n   🔎 Checking: ${title}`);

    // 🚨 CRITICAL: Validate model number match (async - reads PDF content!)
    const validation = await validateModelMatch(title, pdfUrl, modelNumber);
    if (!validation.isValid) {
      console.log(`   ❌ REJECTED: ${title}`);
      console.log(`      Reason: ${validation.reason}`);
      continue;
    }

    // Validate domain
    const allowedDomains = [
      'shareddocs.com',
      'carrier.com',
      'lennox.com',
      'trane.com',
      'york.com',
      'daikin.com',
      'rheem.com',
      'goodman.com',
    ];

    try {
      const url = new URL(pdfUrl);
      const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain));

      if (!isAllowed) {
        console.log(`   ⚠️  Skipping untrusted domain: ${url.hostname}`);
        continue;
      }

      // Verify PDF is downloadable
      console.log(`   🔍 Verifying PDF download...`);
      const verification = await verifyPDF(pdfUrl);

      if (!verification.valid) {
        console.log(`   ❌ PDF verification failed`);
        continue;
      }

      console.log(`   ✅ PDF verified: ${(verification.size! / 1024 / 1024).toFixed(1)} MB`);
      console.log(`   📄 Title: ${title}`);

      // Extract and detect type
      const typeMatch = section.match(/Type:\s*(\w+)/i);
      const detectedType = typeMatch
        ? typeMatch[1].toLowerCase()
        : detectManualType(title, pdfUrl);

      const type = normalizeManualType(detectedType);
      const priority = getManualPriority(type);

      manuals.push({
        pdfUrl,
        title,
        source: url.hostname,
        type,
        priority,
      });

      seenUrls.add(pdfUrl);

      // Stop at 5 unique manuals
      if (manuals.length >= 5) {
        console.log('   ℹ️  Reached maximum of 5 manuals');
        break;
      }

    } catch (error) {
      console.log(`   ⚠️  Invalid URL: ${pdfUrl}`);
      continue;
    }
  }

  // Sort by priority (1 = highest)
  manuals.sort((a, b) => a.priority - b.priority);

  return manuals;
}

/**
 * Detect manual type from title or URL
 */
function detectManualType(title: string, url: string): string {
  const combined = `${title} ${url}`.toLowerCase();

  // Priority 1
  if (/control|ccn|cvc|comm/i.test(combined)) return 'controls';
  if (/startup|commission|start.?up/i.test(combined)) return 'startup';
  if (/operation|operator|operating/i.test(combined)) return 'operation';
  if (/troubleshoot|diagnostic|fault|alarm/i.test(combined)) return 'troubleshooting';

  // Priority 2
  if (/install|installation|iom/i.test(combined)) return 'installation';
  if (/maintenance|service|maintain/i.test(combined)) return 'maintenance';

  // Priority 3
  if (/parts|catalog|part.?list/i.test(combined)) return 'parts';
  if (/wiring|electrical|wire/i.test(combined)) return 'wiring';
  if (/spec|specification|data|submittal/i.test(combined)) return 'specifications';

  return 'other';
}

/**
 * Normalize manual type to valid enum value
 */
function normalizeManualType(type: string): ManualType {
  const normalized = type.toLowerCase().trim();

  const validTypes: ManualType[] = [
    'controls', 'startup', 'operation', 'troubleshooting',
    'installation', 'maintenance', 'service', 'parts',
    'specifications', 'wiring', 'other'
  ];

  if (validTypes.includes(normalized as ManualType)) {
    return normalized as ManualType;
  }

  return 'other';
}

/**
 * Get priority level for manual type
 * 1 = highest priority, 3 = lowest
 */
function getManualPriority(type: ManualType): number {
  const priority1: ManualType[] = ['controls', 'startup', 'operation', 'troubleshooting'];
  const priority2: ManualType[] = ['installation', 'maintenance'];

  if (priority1.includes(type)) return 1;
  if (priority2.includes(type)) return 2;
  return 3;
}

/**
 * Backward-compatible single manual search
 * Returns the highest priority manual found
 */
export async function findManualPDF(
  oem: string,
  modelNumber: string
): Promise<{ found: boolean; pdfUrl?: string; title?: string; source?: string }> {
  const result = await findAllManuals(oem, modelNumber);

  if (!result.found || result.manuals.length === 0) {
    return { found: false };
  }

  const topManual = result.manuals[0]; // Already sorted by priority
  return {
    found: true,
    pdfUrl: topManual.pdfUrl,
    title: topManual.title,
    source: topManual.source,
  };
}

/**
 * Verify PDF is directly downloadable (no captcha, no login, no clicks)
 * Tests actual HTTP GET to ensure programmatic access
 */
export async function verifyPDF(url: string): Promise<PDFVerification> {
  try {
    console.log('   → Testing HEAD request...');
    const headResponse = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 3,
      validateStatus: (status) => status < 400,
    });

    const contentType = headResponse.headers['content-type'];
    const contentLength = headResponse.headers['content-length'];

    // Check 1: Must be PDF content type
    if (!contentType?.toLowerCase().includes('pdf')) {
      console.log(`   ❌ Not a PDF. Content-Type: ${contentType}`);
      return { valid: false, error: 'Not a PDF content type' };
    }

    // Check 2: Must have content length
    if (!contentLength) {
      console.log('   ❌ No content-length header (might be dynamic/gated)');
      return { valid: false, error: 'No content length' };
    }

    const sizeInMB = parseInt(contentLength) / (1024 * 1024);

    // Check 3: Size must be reasonable
    if (sizeInMB > 100) {
      console.log(`   ❌ PDF too large: ${sizeInMB.toFixed(1)} MB`);
      return { valid: false, error: 'File too large' };
    }

    if (sizeInMB < 0.01) {
      console.log(`   ❌ PDF too small: ${sizeInMB.toFixed(3)} MB (likely error page)`);
      return { valid: false, error: 'File too small' };
    }

    // Check 4: Try to download first 10KB to confirm it's truly accessible
    console.log('   → Testing partial download (first 10KB)...');
    const partialResponse = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 3,
      responseType: 'arraybuffer',
      headers: {
        Range: 'bytes=0-10240', // First 10KB
      },
      validateStatus: (status) => status === 200 || status === 206, // 206 = Partial Content
    });

    const buffer = Buffer.from(partialResponse.data);

    // Check 5: Verify PDF magic bytes (%PDF)
    const pdfHeader = buffer.toString('utf-8', 0, 4);
    if (pdfHeader !== '%PDF') {
      console.log(`   ❌ Not a valid PDF file (header: ${pdfHeader})`);
      return { valid: false, error: 'Invalid PDF header' };
    }

    console.log(`   ✅ PDF verified: ${sizeInMB.toFixed(1)} MB, directly downloadable`);

    return {
      valid: true,
      size: parseInt(contentLength),
      // Page count will be determined during full processing
    };
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.log('   ❌ Access forbidden (likely requires auth or has captcha)');
      return { valid: false, error: 'Access forbidden' };
    }
    if (error.response?.status === 404) {
      console.log('   ❌ PDF not found (404)');
      return { valid: false, error: 'Not found' };
    }
    if (error.code === 'ETIMEDOUT') {
      console.log('   ❌ Request timed out');
      return { valid: false, error: 'Timeout' };
    }

    console.error('   ❌ Verification error:', error.message);
    return { valid: false, error: error.message };
  }
}

/**
 * Answer a question using Perplexity web search
 * Used as fallback when manual content doesn't have the answer
 * 
 * @param question - User's question
 * @param context - Additional context (unit info, model, etc.)
 * @returns AI-generated answer with sources
 */
export async function answerWithWebSearch(
  question: string,
  context: {
    oem: string;
    modelNumber: string;
    unitInfo?: string;
  }
): Promise<{
  answer: string;
  sources: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  console.log(`🌐 Perplexity Web Search: "${question.substring(0, 60)}..."`);

  // Build context-aware prompt
  const contextInfo = `Equipment Context: ${context.oem} ${context.modelNumber}${context.unitInfo ? `\n${context.unitInfo}` : ''}`;

  const prompt = `${contextInfo}

Question: ${question}

Please provide a detailed, technically accurate answer for this HVAC/commercial equipment question. Focus on:
1. Practical troubleshooting and maintenance advice
2. Safety considerations
3. Industry best practices
4. Manufacturer-specific information when available

Be concise but comprehensive. Include specific technical details and procedures where relevant.`;

  try {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar', // Fast, real-time web search model
        messages: [
          {
            role: 'system',
            content: `You are an expert HVAC technician and service engineer with deep knowledge of commercial equipment. Provide accurate, practical answers based on current information from the web.

🚨 **CRITICAL SAFETY REQUIREMENTS:**

You MUST identify and warn about dangerous actions. If the question involves any of these hazards, include a prominent safety warning:

**ELECTRICAL HAZARDS:** Working on live circuits, touching electrical components, bypassing safety interlocks
→ Warn: Turn off power, verify with multimeter, use PPE, follow NFPA 70E

**REFRIGERANT HAZARDS:** Venting refrigerant, working without EPA certification, mixing refrigerant types
→ Warn: Requires EPA 608 certification, illegal to vent (Clean Air Act, $37,500/day fines), use recovery equipment

**GAS HAZARDS:** Working on gas lines, testing leaks with flame, ignition system work
→ Warn: Turn off gas, ventilate, never use flames, contact licensed gas technician

**PRESSURE HAZARDS:** Opening pressurized lines, working on compressors under pressure
→ Warn: Recover refrigerant, verify 0 PSI, wear safety gear, never heat refrigerant lines

**MECHANICAL HAZARDS:** Working on rotating equipment while running, removing guards
→ Warn: Lock out/tag out, verify stopped, reinstall guards, use fall protection

Always prioritize safety over speed. Include safety warnings prominently at the start of your response if applicable. Recommend licensed professionals when appropriate.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        return_citations: true,
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      }
    );

    const answer = response.data.choices[0]?.message?.content || 'No answer available';
    const citations = response.data.citations || [];

    // Extract token usage from response
    const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    // Calculate cost (Perplexity Sonar pricing: ~$1/1M input, ~$1/1M output)
    const INPUT_COST_PER_TOKEN = 1.0 / 1_000_000;  // $1 per 1M input tokens
    const OUTPUT_COST_PER_TOKEN = 1.0 / 1_000_000; // $1 per 1M output tokens
    const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);

    console.log(`✅ Perplexity answered (${answer.length} chars, ${citations.length} sources)`);
    console.log(`   💰 Tokens: ${inputTokens} in + ${outputTokens} out = ${totalTokens} total ($${cost.toFixed(6)})`);

    return {
      answer,
      sources: citations,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
      },
    };
  } catch (error: any) {
    console.error('❌ Perplexity API error:', error.response?.data || error.message);
    throw new Error('Failed to get answer from web search');
  }
}
