/**
 * Perplexity API Service - Find manuals on the web
 * Only triggered when manual doesn't exist in database
 */

import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexitySearchResult {
  found: boolean;
  pdfUrl?: string;
  title?: string;
  source?: string;
  pageCount?: number;
}

interface PDFVerification {
  valid: boolean;
  size?: number;
  pageCount?: number;
  error?: string;
}

/**
 * Search for a manual PDF using Perplexity
 * Restricted to official documentation sources only
 */
export async function findManualPDF(
  oem: string,
  modelNumber: string
): Promise<PerplexitySearchResult> {
  console.log(`🔍 Perplexity: Searching for ${oem} ${modelNumber} manual...`);

  const prompt = `Find the direct PDF download link for the official ${oem} ${modelNumber} service manual or installation manual.

⚠️ CRITICAL REQUIREMENTS - ALL MUST BE MET:
1. The link MUST be a DIRECT PDF file that can be downloaded programmatically
   - Example of GOOD link: https://www.shareddocs.com/hvac/docs/1009000/Public/04/04-5810-0141-02.pdf
   - Example of BAD link: https://manualslib.com/manual/... (requires clicks/captcha)

2. NO barriers allowed:
   - ❌ NO captchas
   - ❌ NO login/registration required
   - ❌ NO "click to download" pages
   - ❌ NO JavaScript-required sites
   - ✅ MUST be accessible via direct HTTP GET request

3. ONLY search these trusted domains (like shareddocs.com):
   - shareddocs.com (PREFERRED - always direct PDFs)
   - carrier.com/commercial/literature
   - lennox.com/support
   - trane.com/commercial/literature
   - york.com/support
   
4. The URL MUST end in .pdf
5. It MUST be an official OEM source
6. Prioritize service/troubleshooting manuals over installation manuals

TEST: Can this URL be downloaded with "curl [URL] > file.pdf" without any interaction? If NO, reject it.

Return ONLY:
URL: [direct PDF link]
Title: [manual title]
Source: [domain]

If no direct-download PDF is found, respond with "NOT FOUND"`;

  try {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar', // Fast model for web search
        messages: [
          {
            role: 'system',
            content: 'You are a technical documentation finder. Only return official OEM PDF links from authorized sources.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.0, // Deterministic
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const answer = response.data.choices[0]?.message?.content || '';

    // Parse response
    if (answer.includes('NOT FOUND') || !answer.includes('.pdf')) {
      console.log('❌ Perplexity: No manual found');
      return { found: false };
    }

    // Extract PDF URL (basic regex)
    const pdfUrlMatch = answer.match(/https?:\/\/[^\s]+\.pdf/i);
    const pdfUrl = pdfUrlMatch ? pdfUrlMatch[0] : undefined;

    if (!pdfUrl) {
      console.log('⚠️  Perplexity: Response did not contain valid PDF URL');
      return { found: false };
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

    const url = new URL(pdfUrl);
    const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain));

    if (!isAllowed) {
      console.log(`⚠️  Perplexity: PDF from untrusted domain: ${url.hostname}`);
      return { found: false };
    }

    // CRITICAL: Verify the PDF is actually downloadable before accepting
    console.log(`🔍 Verifying PDF is directly downloadable: ${pdfUrl}`);
    const verification = await verifyPDF(pdfUrl);
    
    if (!verification.valid) {
      console.log('❌ PDF verification failed - not a direct download link');
      return { found: false };
    }

    console.log(`✅ Perplexity: Found verified manual at ${pdfUrl}`);

    return {
      found: true,
      pdfUrl,
      title: extractTitle(answer, oem, modelNumber),
      source: url.hostname,
    };
  } catch (error: any) {
    console.error('❌ Perplexity API error:', error.response?.data || error.message);
    return { found: false };
  }
}

/**
 * Extract manual title from Perplexity response
 */
function extractTitle(response: string, oem: string, modelNumber: string): string {
  // Try to find title in response
  const titleMatch = response.match(/title[:\s]+(.+?)(?:\n|$)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Fallback to generic title
  return `${oem} ${modelNumber} Service Manual`;
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
