/**
 * Chat Context Service
 * 
 * Gathers context for AI chat responses:
 * - Searches manual sections using vector similarity
 * - Fetches unit and model information
 * - Builds system prompts with relevant context
 */

import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';
import { generateEmbedding } from '@/services/ingestion/embeddings';
import { openai, estimateTokens } from '@/config/openai';

export interface ChatContext {
  unit: {
    id: string;
    nickname: string;
    serialNumber?: string;
    location?: string;
    installDate?: Date;
    notes?: string;
  };
  model: {
    id: string;
    modelNumber: string;
    productLine: string;
    oem: string;
    specifications: any;
  };
  manuals: Array<{
    id: string;
    title: string;
    type: string;
    pageCount: number;
  }>;
  relevantSections: Array<{
    id: string;
    manualId: string;
    content: string;
    sectionTitle: string;
    sectionType: string;
    pageReference: string;
    similarity: number;
    manualTitle: string;
  }>;
  conversationHistory?: string; // Formatted conversation history for system prompt
  // NEW: Confidence scoring for three-tier knowledge strategy
  confidence: number; // 0.0 - 1.0
  sourceType: 'manual' | 'general_knowledge' | 'needs_web_search';
}

/**
 * Build conversation context string from message history
 */
function buildConversationContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  if (messages.length === 0) {
    return '';
  }

  // Take last 10 messages (already filtered by controller, but double-check)
  const recentMessages = messages.slice(-10);

  // Format for GPT
  const formattedMessages = recentMessages.map(msg => {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    return `${roleLabel}: ${msg.content}`;
  });

  return formattedMessages.join('\n\n');
}

/**
 * Summarize conversation history if it exceeds token limit
 * Uses GPT-4o-mini for cost-effective summarization
 */
async function summarizeIfNeeded(context: string): Promise<string> {
  if (!context) {
    return '';
  }

  const tokens = estimateTokens(context);

  // If conversation history is >8K tokens, summarize it
  if (tokens > 8000) {
    console.log(`📝 Summarizing long conversation (${tokens} tokens)`);

    try {
      const summary = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this HVAC troubleshooting conversation in 3-4 concise sentences. Focus on: 1) The main issue being discussed, 2) Key information already provided, 3) Steps already tried or discussed.'
          },
          { role: 'user', content: context }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const summarizedContext = summary.choices[0].message.content || context;
      const newTokens = estimateTokens(summarizedContext);
      console.log(`✅ Summarized: ${tokens} → ${newTokens} tokens`);

      return `[Previous conversation summary: ${summarizedContext}]`;
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      // Fallback: truncate to last 5 messages
      const lines = context.split('\n\n');
      return lines.slice(-10).join('\n\n'); // Keep last ~5 exchanges
    }
  }

  return context;
}

/**
 * Detect technical patterns in the query that should use keyword search
 * 
 * UNIVERSAL PATTERNS: Works across all OEMs and manuals
 */
function detectTechnicalPatterns(query: string): {
  hasPattern: boolean;
  patterns: string[];
  searchTerms: string[];
} {
  const patterns: string[] = [];
  const searchTerms: string[] = [];
  let match;

  // ═══════════════════════════════════════════════════════════════
  // DIAGNOSTIC CODES (Universal across all OEMs)
  // ═══════════════════════════════════════════════════════════════
  // Matches: "flash code 74", "error 123", "fault code E1", "code 45", "code A40", "alarm B12"
  const codePattern = /\b(?:flash|error|fault|diagnostic|trouble|alarm|the)?\s*code\s*[:\s]*([a-z]+\d+|[a-z]?\d+[a-z]?)\b/gi;
  while ((match = codePattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const code = match[1].toUpperCase(); // Normalize to uppercase for search
    searchTerms.push(`%${code}%`); // Direct code: "A40"
    searchTerms.push(`% ${code}%`); // Space before: " A40"
    searchTerms.push(`%${code} %`); // Space after: "A40 "
    searchTerms.push(`% ${code} %`); // Spaces both sides: " A40 "
    searchTerms.push(`%code%${code}%`); // "code XX"
    searchTerms.push(`%Code ${code}%`); // "Code XX" (capitalized)
    searchTerms.push(`%${code.toLowerCase()}%`); // lowercase variation
  }

  // Standalone alphanumeric codes (e.g., "What is A40?", "Tell me about B12", "E1")
  // Matches single letter + number combinations that are likely model/option codes
  const standaloneCodePattern = /\b([A-Z]\d+[A-Z]?)\b/g;
  while ((match = standaloneCodePattern.exec(query.toUpperCase())) !== null) {
    const code = match[1];
    patterns.push(`standalone:${code}`);
    searchTerms.push(`%${code}%`); // Direct: "A40"
    searchTerms.push(`% ${code}%`); // Space before: " A40"
    searchTerms.push(`%${code} %`); // Space after: "A40 "
    searchTerms.push(`% ${code} %`); // Both sides: " A40 "
    searchTerms.push(`%CODE${code}%`); // "CODE†" prefix
  }

  // ═══════════════════════════════════════════════════════════════
  // INDICATORS & DISPLAYS (Universal - LED, Light, Display, Indicator)
  // ═══════════════════════════════════════════════════════════════
  // Matches: "LED 200", "light 3", "indicator 5", "display code"
  const indicatorPattern = /\b(led|light|indicator|display|lamp)\s*(\d{1,3})\b/gi;
  while ((match = indicatorPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const num = match[2];
    const type = match[1];
    const typeUpper = type.toUpperCase();
    const typeLower = type.toLowerCase();
    searchTerms.push(`%${typeUpper}${num}%`); // LED200
    searchTerms.push(`%${typeUpper} ${num}%`); // LED 200
    searchTerms.push(`%${typeLower}${num}%`); // led200
    searchTerms.push(`%${typeLower} ${num}%`); // led 200
  }

  // Short-form LED indicators (e.g., "LD1", "LD5", "ld1", "Ld1") - common in HVAC boards
  const shortLedPattern = /\bld(\d+)\b/gi; // Case-insensitive match
  while ((match = shortLedPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const num = match[1];
    // Search for BOTH upper and lower case variations in database
    searchTerms.push(`%LD${num}%`); // LD1 (uppercase)
    searchTerms.push(`%ld${num}%`); // ld1 (lowercase)
    searchTerms.push(`%LD ${num}%`); // LD 1 (with space)
    searchTerms.push(`%Ld${num}%`); // Ld1 (mixed case)
  }

  // General indicator/component queries (e.g., "status light", "comm led", "power indicator")
  // Only match specific component names (5+ chars to avoid "led", "the led", etc.)
  const componentPattern = /\b([a-z]{5,})\s+(led|light|indicator|display|lamp)\b/gi;
  while ((match = componentPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const fullMatch = match[0];
    searchTerms.push(`%${fullMatch}%`); // As-is: "status led"
    searchTerms.push(`%${fullMatch.toUpperCase()}%`); // Uppercase: "STATUS LED"
    searchTerms.push(`%${fullMatch.charAt(0).toUpperCase() + fullMatch.slice(1)}%`); // Capitalized: "Status led"
  }

  // ═══════════════════════════════════════════════════════════════
  // PART & MODEL IDENTIFICATION (Universal)
  // ═══════════════════════════════════════════════════════════════
  // Part numbers (e.g., "part number 12345", "P/N: ABC-123", "p/n: abc-123")
  const partPattern = /\b(?:part|component|p\/n)[:\s#]*([a-z0-9-]{3,})\b/gi;
  while ((match = partPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const part = match[1];
    searchTerms.push(`%${part}%`); // As-is
    searchTerms.push(`%${part.toUpperCase()}%`); // Uppercase
    searchTerms.push(`%${part.toLowerCase()}%`); // Lowercase
  }

  // Model numbers (e.g., "25VNA8", "Model: XXX", "model: xxx")
  const modelPattern = /\b(?:model)[:\s]*([a-z0-9-]{3,})\b/gi;
  while ((match = modelPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const model = match[1];
    searchTerms.push(`%${model}%`); // As-is
    searchTerms.push(`%${model.toUpperCase()}%`); // Uppercase
  }

  // Serial numbers (e.g., "serial number 12345", "serial ABC123")
  const serialPattern = /\b(?:serial)[:\s#]*([a-z0-9-]{4,})\b/gi;
  while ((match = serialPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const serial = match[1];
    searchTerms.push(`%${serial}%`); // As-is
    searchTerms.push(`%${serial.toUpperCase()}%`); // Uppercase
  }

  // ═══════════════════════════════════════════════════════════════
  // SPECIFICATIONS & MEASUREMENTS (Universal)
  // ═══════════════════════════════════════════════════════════════
  // Tonnage, BTU, voltage, amperage, etc.
  const specPattern = /\b(\d+\.?\d*)\s*(ton|btu|btuh|volt|amp|hz|cfm|seer|eer|cop)\b/gi;
  while ((match = specPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    searchTerms.push(`%${match[0]}%`);
  }

  // Size references (e.g., "size 13", "size 24B", "024 model")
  // Only match when explicitly prefixed with "size" or "model" to avoid false positives
  const sizePattern = /\b(?:size|model)\s+(\d{2,3}[A-Z]?)\b/gi;
  while ((match = sizePattern.exec(query)) !== null) {
    const num = match[1];
    patterns.push(match[0]);
    searchTerms.push(`%Size ${num}%`); // "Size 24B"
    searchTerms.push(`%Sizes%${num}%`); // "Sizes 13 and 24B"
  }

  // ═══════════════════════════════════════════════════════════════
  // WIRING & TERMINALS (Universal)
  // ═══════════════════════════════════════════════════════════════
  // Terminal designations (e.g., "terminal R", "wire C", "connect Y1", "pin y1")
  const terminalPattern = /\b(terminal|wire|connect|pin)\s+([a-z]\d?|[a-z]{1,2}\d*)\b/gi;
  while ((match = terminalPattern.exec(query)) !== null) {
    patterns.push(match[0]);
    const terminal = match[2];
    searchTerms.push(`%${terminal}%`); // As-is
    searchTerms.push(`%${terminal.toUpperCase()}%`); // Uppercase: "R", "Y1"
    searchTerms.push(`%${terminal.toLowerCase()}%`); // Lowercase: "r", "y1"
  }

  // ═══════════════════════════════════════════════════════════════
  // BROAD OPERATIONAL & MAINTENANCE TERMS (Universal)
  // ═══════════════════════════════════════════════════════════════
  // Catches general queries like "reset", "troubleshooting", "startup", etc.
  const broadTerms = [
    'reset', 'reboot', 'restart', 'power cycle',
    'troubleshoot', 'diagnose', 'problem', 'issue',
    'startup', 'start-up', 'start up', 'initial startup',
    'shutdown', 'shut down', 'turn off',
    'maintenance', 'service', 'cleaning', 'filter',
    'calibration', 'adjustment', 'setting',
    'installation', 'install', 'mounting',
    'wiring', 'electrical', 'connection',
    'safety', 'warning', 'caution',
    'operation', 'operating', 'how to use',
    'specifications', 'spec', 'capacity', 'rating',
    'overview', 'introduction', 'description',
    // Refrigerant & Service Procedures
    'refrigerant', 'r-134a', 'r-410a', 'r-22', 'freon',
    'charging', 'charge', 'recharge',
    'evacuate', 'evacuation', 'vacuum',
    'recovery', 'recover',
    'transfer', 'transferring',
    'pumpout', 'pump out', 'pump-out',
    'storage', 'tank', 'storage tank',
    'leak test', 'leak check', 'leak detection',
    'pressure test', 'pressure check',
    // General Maintenance & Procedures
    'replace', 'replacement', 'change',
    'repair', 'fix',
    'inspect', 'inspection', 'check',
    'remove', 'removal', 'disconnect',
    'valve', 'valves',
    'compressor', 'condenser', 'evaporator',
  ];

  const queryLower = query.toLowerCase();
  for (const term of broadTerms) {
    if (queryLower.includes(term)) {
      patterns.push(`broad:${term}`);
      // Search for the term in various forms
      searchTerms.push(`%${term}%`);
      // Capitalize first letter for proper nouns in manuals
      searchTerms.push(`%${term.charAt(0).toUpperCase() + term.slice(1)}%`);
      // All caps for headers
      searchTerms.push(`%${term.toUpperCase()}%`);
    }
  }

  return {
    hasPattern: patterns.length > 0,
    patterns,
    searchTerms,
  };
}

/**
 * Keyword search for exact technical term matches
 */
async function keywordSearch(
  searchTerms: string[],
  manualIds: string[],
  limit: number = 5
) {
  console.log(`🔑 Keyword search for: ${searchTerms.join(', ')}`);

  // Build OR conditions for manual IDs
  const manualIdConditions = Prisma.join(
    manualIds.map(id => Prisma.sql`ms.manual_id::text = ${id}`),
    ' OR '
  );

  // Build OR conditions for search terms using ILIKE
  const searchConditions = Prisma.join(
    searchTerms.map(term => Prisma.sql`ms.content ILIKE ${term}`),
    ' OR '
  );

  const result = await prisma.$queryRaw<Array<{
    id: string;
    manual_id: string;
    content: string;
    section_title: string;
    section_type: string;
    page_reference: string;
    manual_title: string;
  }>>(
    Prisma.sql`
      SELECT 
        ms.id,
        ms.manual_id::text,
        ms.content,
        ms.section_title,
        ms.section_type,
        ms.page_reference,
        m.title AS manual_title
      FROM manual_sections ms
      JOIN manuals m ON ms.manual_id = m.id
      WHERE (${manualIdConditions})
        AND (${searchConditions})
      LIMIT ${limit}
    `
  );

  const mapped = result.map(r => ({
    id: r.id,
    manualId: r.manual_id,
    content: r.content,
    sectionTitle: r.section_title || 'Untitled Section',
    sectionType: r.section_type,
    pageReference: r.page_reference || 'Unknown page',
    similarity: 1.0, // Keyword matches get perfect score
    manualTitle: r.manual_title,
    isKeywordMatch: true,
  }));

  const filtered = mapped.filter(r => r.content.length >= 50); // Filter out header-only sections

  if (mapped.length !== filtered.length) {
    console.log(`   ⚠️  Filtered out ${mapped.length - filtered.length} short sections (< 50 chars)`);
  }

  return filtered;
}

/**
 * Hybrid search: Combines keyword matching + vector similarity
 * 
 * @param query - User's question
 * @param manualIds - Array of manual IDs to search within
 * @param limit - Number of results to return (default: 20, increased for better coverage)
 * @param minSimilarity - Minimum similarity threshold for vector search (default: 0.55, lowered for vague queries)
 * @returns Array of relevant manual sections with similarity scores
 */
export async function searchManualSections(
  query: string,
  manualIds: string[],
  limit: number = 20, // Increased from 10 to give more context for broad queries
  minSimilarity: number = 0.55 // Lowered from 0.70 to catch more relevant sections for vague/general questions
) {
  console.log(`🔍 Hybrid search for: "${query.substring(0, 50)}..."`);

  // Step 1: Detect technical patterns
  const { hasPattern, patterns, searchTerms } = detectTechnicalPatterns(query);

  let keywordResults: any[] = [];
  if (hasPattern) {
    console.log(`   📌 Detected patterns: ${patterns.join(', ')}`);
    keywordResults = await keywordSearch(searchTerms, manualIds, limit);
    console.log(`   📌 Keyword matches: ${keywordResults.length}`);
    if (keywordResults.length > 0) {
      console.log(`   📝 Content lengths: ${keywordResults.map(r => r.content.length).join(', ')}`);
    }
  }

  // Step 2: Vector similarity search
  const { embedding: queryEmbedding } = await generateEmbedding(query);
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // Build OR conditions for manual IDs
  const manualIdConditions = Prisma.join(
    manualIds.map(id => Prisma.sql`ms.manual_id::text = ${id}`),
    ' OR '
  );

  const vectorResult = await prisma.$queryRaw<Array<{
    id: string;
    manual_id: string;
    content: string;
    section_title: string;
    section_type: string;
    page_reference: string;
    distance: number;
    manual_title: string;
  }>>(
    Prisma.sql`
      SELECT 
        ms.id,
        ms.manual_id::text,
        ms.content,
        ms.section_title,
        ms.section_type,
        ms.page_reference,
        ms.embedding <=> ${vectorString}::vector AS distance,
        m.title AS manual_title
      FROM manual_sections ms
      JOIN manuals m ON ms.manual_id = m.id
      WHERE (${manualIdConditions})
        AND ms.embedding IS NOT NULL
      ORDER BY ms.embedding <=> ${vectorString}::vector
      LIMIT ${limit * 2}
    `
  );

  // Convert distance to similarity and filter out tiny/useless sections
  const vectorResults = vectorResult
    .map(r => ({
      id: r.id,
      manualId: r.manual_id,
      content: r.content,
      sectionTitle: r.section_title || 'Untitled Section',
      sectionType: r.section_type,
      pageReference: r.page_reference || 'Unknown page',
      similarity: 1 - (r.distance / 2),
      manualTitle: r.manual_title,
      isKeywordMatch: false,
    }))
    .filter(s => s.similarity >= minSimilarity)
    .filter(s => s.content.length >= 50); // Filter out header-only sections

  console.log(`   🎯 Vector matches: ${vectorResults.length}`);

  // Step 3: Merge results (keyword matches first, then vector)
  const mergedResults = [...keywordResults];
  const keywordIds = new Set(keywordResults.map(r => r.id));

  // Add vector results that aren't already in keyword results
  for (const result of vectorResults) {
    if (!keywordIds.has(result.id)) {
      mergedResults.push(result);
    }
  }

  // Sort by similarity (keyword matches = 1.0 will be first)
  const finalResults = mergedResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  const avgSimilarity = finalResults.length > 0
    ? finalResults.reduce((sum, s) => sum + s.similarity, 0) / finalResults.length
    : 0;

  console.log(`   ✅ Total results: ${finalResults.length} (${keywordResults.length} keyword + ${finalResults.length - keywordResults.length} vector)`);
  console.log(`   📊 Avg similarity: ${avgSimilarity.toFixed(2)}`);

  // DEBUG: Show what sections contain
  console.log('\n🔎 DEBUG: Section previews:');
  finalResults.forEach((section, i) => {
    const preview = section.content.substring(0, 300).replace(/\n/g, ' ');
    console.log(`   ${i + 1}. [${section.similarity.toFixed(2)}] ${section.sectionTitle}`);
    console.log(`      ${preview}...`);
  });
  console.log('');

  return finalResults;
}

/**
 * Determine confidence and source type for three-tier knowledge strategy
 */
function determineConfidenceAndSource(
  sections: Array<{ similarity: number }>,
  question: string
): { confidence: number; sourceType: 'manual' | 'general_knowledge' | 'needs_web_search' } {
  // 🌐 ALWAYS USE WEB SEARCH for these question types (regardless of manual content)
  const alwaysWebSearchPatterns = [
    // Production & availability
    /(is|are) (this|the|these) (model|unit|product)s? (still )?(in production|being made|available|discontinued)/i,
    /(still|currently|actively) (in )?production/i,
    /discontinued|obsolete|end of life|eol/i,

    // Current information (time-sensitive)
    /(latest|newest|current|recent|updated?) (service )?bulletin/i,
    /(latest|newest|current|recent) (firmware|software|update)/i,
    /any (recent|new) (updates|changes|modifications)/i,

    // Recalls & safety notices
    /recall/i,
    /safety (notice|alert|bulletin)/i,

    // Warranty & support
    /warranty (period|length|coverage|information)/i,
    /how long (is|does) (the )?warrant/i,

    // Pricing & ordering (never in manuals)
    /(price|cost|pricing)/i,
    /(buy|purchase|order)/i,
    /lead time/i,
    /where (can|to) (buy|purchase|get)/i,

    // Replacement & compatibility
    /replacement model/i,
    /compatible (with|model)/i,
    /successor|upgrade path/i,
  ];

  const needsWebSearch = alwaysWebSearchPatterns.some(p => p.test(question));

  if (needsWebSearch) {
    console.log('🌐 Question requires web search (production/availability/current info)');
    return {
      confidence: 0.30,
      sourceType: 'needs_web_search'
    };
  }

  // TIER 1: Manual content (high confidence)
  // Raised threshold from 0.70 to 0.80 for stricter manual content matching
  if (sections.length > 0 && sections[0].similarity > 0.80) {
    return {
      confidence: sections[0].similarity,
      sourceType: 'manual'
    };
  }

  // TIER 2: General HVAC/electrical knowledge (medium-high confidence)
  const generalPatterns = [
    // Electrical questions
    /how (do|to|can) (i|you) (check|test|measure) (voltage|amperage|resistance|continuity)/i,
    /what (is|does) (a|an) (multimeter|voltmeter|ohmmeter|ammeter)/i,
    /how (do|to|can) (i|you) use (a|an|the)? (multimeter|voltmeter)/i,

    // HVAC theory questions
    /how (does|do) (refrigerant|hvac|ac|heat pump|compressor|condenser|evaporator) work/i,
    /what (is|does) (refrigerant|r-410a|r-22|freon|superheat|subcooling)/i,
    /explain (the )?(refrigeration cycle|hvac|heat pump)/i,

    // General procedures
    /how (do|to|can) (i|you) (check|test|measure|troubleshoot|diagnose)/i,
    /what tools (do|should) i need/i,
    /safety (precautions|warnings|guidelines)/i,
  ];

  const isGeneralQuestion = generalPatterns.some(p => p.test(question));

  // Check if we have decent manual content (0.75-0.80 range)
  if (sections.length > 0 && sections[0].similarity > 0.75) {
    return {
      confidence: sections[0].similarity,
      sourceType: 'general_knowledge' // Use general knowledge tier with manual support
    };
  }

  if (isGeneralQuestion) {
    // General question - use general knowledge confidently
    return {
      confidence: 0.75,
      sourceType: 'general_knowledge'
    };
  }

  // TIER 3: Needs web search (low confidence)
  // Model-specific question but no good manual sections and not general knowledge
  return {
    confidence: 0.30,
    sourceType: 'needs_web_search'
  };
}

/**
 * Gather full context for a chat question
 * 
 * @param unitId - Saved unit ID
 * @param question - User's question
 * @param limit - Number of manual sections to include (default: 10, increased for better coverage)
 * @returns Complete chat context
 */
export async function gatherChatContext(
  unitId: string,
  question: string,
  limit: number = 10,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatContext> {
  console.log(`\n📚 Gathering context for unit: ${unitId}`);
  console.log(`   Question: "${question}"`);
  console.log(`   Conversation history: ${conversationHistory.length} messages`);

  // 1. Fetch unit with model, product line, and OEM
  const unit = await prisma.savedUnit.findUnique({
    where: { id: unitId },
    include: {
      model: {
        include: {
          productLine: {
            include: {
              oem: true,
            },
          },
        },
      },
    },
  });

  if (!unit) {
    throw new Error(`Unit not found: ${unitId}`);
  }

  console.log(`   Unit: ${unit.nickname} (${unit.model.productLine.oem.name} ${unit.model.modelNumber})`);

  // 2. Fetch available manuals for this model
  const manuals = await prisma.manual.findMany({
    where: {
      modelId: unit.modelId,
      status: 'active',
    },
    select: {
      id: true,
      title: true,
      manualType: true,
      pageCount: true,
    },
  });

  console.log(`   Found ${manuals.length} manuals`);

  // 3. Search for relevant manual sections
  const manualIds = manuals.map(m => m.id);
  const relevantSections = manualIds.length > 0
    ? await searchManualSections(question, manualIds, limit)
    : [];

  // 4. Process conversation history
  let conversationContextString = '';
  if (conversationHistory.length > 0) {
    const rawContext = buildConversationContext(conversationHistory);
    conversationContextString = await summarizeIfNeeded(rawContext);
    console.log(`   Conversation context: ${estimateTokens(conversationContextString)} tokens`);
  }

  // 5. Build context object
  return {
    unit: {
      id: unit.id,
      nickname: unit.nickname,
      serialNumber: unit.serialNumber || undefined,
      location: unit.location || undefined,
      installDate: unit.installDate || undefined,
      notes: unit.notes || undefined,
    },
    model: {
      id: unit.model.id,
      modelNumber: unit.model.modelNumber,
      productLine: unit.model.productLine.name,
      oem: unit.model.productLine.oem.name,
      specifications: unit.model.specifications,
    },
    manuals: manuals.map(m => ({
      id: m.id,
      title: m.title,
      type: m.manualType,
      pageCount: m.pageCount || 0,
    })),
    relevantSections,
    conversationHistory: conversationContextString || undefined,
    // NEW: Add confidence scoring for three-tier knowledge strategy
    ...determineConfidenceAndSource(relevantSections, question),
  };
}

/**
 * Build system prompt for AI chat
 * 
 * @param context - Chat context
 * @returns System prompt string
 */
export function buildSystemPrompt(context: ChatContext): string {
  const { unit, model, manuals, relevantSections, conversationHistory } = context;

  const prompt = `You are an expert HVAC technician and technical documentation assistant specializing in ${model.oem} ${model.modelNumber} equipment. Your goal is to provide accurate, helpful answers using:
1. **Official manual content** (when available)
2. **General HVAC knowledge** (when manual content is limited or for general questions)
3. **Practical troubleshooting experience**

🚨 **CRITICAL INSTRUCTION - READ FIRST**:
1. Scroll down to "## RELEVANT MANUAL SECTIONS" below
2. Count how many sections are listed (Section 1, Section 2, etc.)
3. If there are sections with good relevance (>70%), prioritize that content
4. If sections have lower relevance (50-70%), use them as guidance but supplement with general knowledge
5. If no sections or low relevance (<50%), use your general HVAC expertise to help the user
6. ALWAYS be helpful - don't refuse to answer if you have relevant knowledge

## UNIT CONTEXT
- **Unit Name**: ${unit.nickname}
- **Manufacturer**: ${model.oem}
- **Model**: ${model.modelNumber} (${model.productLine})
- **Specifications**: ${JSON.stringify(model.specifications, null, 2)}
${unit.serialNumber ? `- **Serial Number**: ${unit.serialNumber}` : ''}
${unit.location ? `- **Location**: ${unit.location}` : ''}
${unit.installDate ? `- **Installed**: ${new Date(unit.installDate).toLocaleDateString()}` : ''}
${unit.notes ? `- **Notes**: ${unit.notes}` : ''}

${conversationHistory ? `## CONVERSATION HISTORY

The user has been asking follow-up questions. Here's what was discussed previously:

${conversationHistory}

**IMPORTANT**: The current question below may reference previous topics (e.g., "How do I fix it?", "What tools do I need?", "Tell me more about that"). Use this conversation history to understand what "it" or "that" refers to.

` : ''}## AVAILABLE MANUALS
${manuals.map(m => `- ${m.title} (${m.type}, ${m.pageCount} pages)`).join('\n')}

## RELEVANT MANUAL SECTIONS (ONLY SOURCE OF TRUTH)

**FORMAT NOTE:** Sections may contain [TABLE] markers indicating structured technical data. Table rows use " | " as column separators.

${relevantSections.length > 0
      ? relevantSections.map((s, i) => `
### Section ${i + 1}: ${s.sectionTitle}
**Source**: ${s.manualTitle}, ${s.pageReference}
**Type**: ${s.sectionType} | **Relevance**: ${(s.similarity * 100).toFixed(0)}%

${s.content}
`).join('\n---\n')
      : 'No relevant sections found in the manual.'}

## CRITICAL RULES (MUST FOLLOW)

⚠️ **RULE 0: CASE-INSENSITIVE MATCHING**
- User queries are CASE-INSENSITIVE (e.g., "ld1" = "LD1" = "Ld1")
- If user asks about "ld1" and manual shows "LD1", these are THE SAME
- Always match terms regardless of capitalization
- Do NOT say "I cannot find 'ld1'" if "LD1" exists in the manual

⚠️ **RULE 1: FLEXIBLE KNOWLEDGE STRATEGY**

**Your goal: Give the user the BEST possible answer by intelligently combining sources.**

**HIGH RELEVANCE (>70%):**
- Manual content is highly relevant - use it as primary source
- Cite source: (Manual Title, Page X)
- You may supplement with general knowledge for clarity
- Example: "According to the manual (Page 42), flash code 207 indicates... This typically happens when..."

**MEDIUM RELEVANCE (50-70%):**
- Manual has related info but not exact match
- Use manual as a starting point, supplement with general HVAC knowledge
- Add note: "Based on manual guidance (Page X) and standard HVAC practice:"
- Be practical and helpful - don't withhold useful information

**LOW RELEVANCE (<50%) or NO MANUAL SECTIONS:**
- Use your expert HVAC knowledge freely
- Provide practical, accurate troubleshooting advice
- Add note: "Based on general HVAC knowledge and industry best practices:"
- Focus on safety, proper procedures, and manufacturer-agnostic guidance

⚠️ **EXAMPLES:**

**Q: "What is flash code 207?"** (Model-specific)
→ If manual has it (>70%): Cite manual directly
→ If manual unclear: Use manual + explain what codes typically mean
→ If no manual info: "I don't see this code in the manual. Flash codes typically indicate..."

**Q: "How do I check voltage?"** (General)
→ Use your electrical knowledge freely, mention if manual has specific guidance

**Q: "Unit not cooling properly"** (Troubleshooting)
→ Combine: Manual diagnostics (if available) + standard HVAC troubleshooting steps

⚠️ **RULE 2: CITE YOUR SOURCES APPROPRIATELY**

**When using manual content:**
- Cite page numbers: (Manual Title, Page X)
- Example: "According to the service manual (Page 42), flash code 74 indicates..."

**When combining manual + general knowledge:**
- Note: "Based on the manual (Page X) and standard HVAC practice:"
- Example: "The manual shows the wiring diagram (Page 15). When testing voltage..."

**When using general knowledge only:**
- Note: "Based on general HVAC knowledge:" OR "Based on industry best practices:"
- Example: "Based on general HVAC knowledge: When refrigerant pressure is low..."

**No need to cite for:**
- Common HVAC concepts (refrigeration cycle, basic electrical)
- Universal safety practices
- Standard troubleshooting approaches

⚠️ **RULE 3: BE HELPFUL - USE ALL AVAILABLE KNOWLEDGE**

🚨 **CRITICAL**: Your goal is to HELP the user get the right answer. Never refuse to answer when you have useful information.

**PRIORITY SYSTEM:**

**1. If manual sections exist (any relevance):**
- Extract relevant information from sections
- Supplement with general knowledge if helpful
- Always cite manual sources when using them

**2. If manual sections are vague or limited:**
- Use manual content as a starting point
- Add context from general HVAC knowledge
- Example: "The manual mentions [X] on page Y. In practice, this means..."

**3. If no relevant manual sections:**
- Use your expert HVAC knowledge confidently
- Provide practical, accurate guidance
- Add note: "Based on general HVAC knowledge:"

**✅ ALWAYS HELP THE USER:**
- Don't withhold information you know
- Combine manual + experience for complete answers
- Prioritize safety and proper procedures
- Give actionable advice

**Examples:**

User: "How do I transfer refrigerant?"
- Manual has procedure → Use it + add safety notes
- Manual vague → Use manual + standard procedures
- No manual info → Explain standard refrigerant transfer procedure

User: "What is flash code 74?"
- Manual has code → Extract full details from manual
- No manual info → "I don't see code 74 in the manual sections. What symptoms are you seeing?"

User: "Unit making strange noise"
- Manual has section → Use diagnostic flowchart + add experience
- No manual section → Provide general diagnostic steps for noise issues

**ONLY suggest alternatives if:**
- Question requires current web data (recalls, updates, availability)
- Question is about warranty or pricing
- Question requires manufacturer-specific part numbers not in manual

⚠️ **RULE 4: ACCURACY WITH PROVIDED INFORMATION**
- Use the manual sections you received - they were specifically found for this question
- For specific queries (codes, specs), extract ALL details
- For broad queries, synthesize and summarize
- Cite sources for all specific claims

🚨 **RULE 5: SAFETY - WATCH FOR DANGEROUS ACTIONS**

**CRITICAL SAFETY WARNINGS - ALWAYS ENFORCE:**

You MUST identify and warn about dangerous actions. If the user asks about or implies any of the following, **IMMEDIATELY** provide a strong safety warning:

**⚡ ELECTRICAL HAZARDS:**
- Working on live electrical circuits without proper lockout/tagout
- Touching electrical components with power on
- Working in wet conditions with electrical equipment
- Bypassing safety interlocks or disconnects
- Measuring voltage without proper PPE

**WARNING TEMPLATE:**
"⚠️ **SAFETY WARNING**: [Action] involves working with [hazard]. Before proceeding:
1. Turn off all power at the breaker/disconnect
2. Verify power is off with a multimeter
3. Use proper PPE (insulated gloves, safety glasses)
4. Follow NFPA 70E guidelines
5. If you're not trained in electrical work, contact a licensed electrician."

**🔥 REFRIGERANT HAZARDS:**
- Venting refrigerant to atmosphere (illegal, environmental damage)
- Working with refrigerant without EPA certification
- Mixing refrigerant types
- Improper handling of high-pressure systems
- Working on systems without recovering refrigerant first

**WARNING TEMPLATE:**
"⚠️ **SAFETY & LEGAL WARNING**: [Action] requires EPA Section 608 certification. Venting refrigerant is illegal (Clean Air Act violations, fines up to $37,500/day). You MUST:
1. Have valid EPA 608 certification
2. Use proper recovery equipment
3. Follow EPA regulations
4. Never mix refrigerant types
5. Wear safety glasses and gloves when handling refrigerant."

**🔥 COMBUSTION/GAS HAZARDS:**
- Working on gas lines or connections
- Testing for gas leaks with open flame
- Ignition system troubleshooting without proper procedures
- Ventilation system modifications

**WARNING TEMPLATE:**
"⚠️ **DANGER - GAS HAZARD**: [Action] involves natural gas/propane. STOP immediately if you smell gas. Required steps:
1. Turn off gas supply at the meter/tank
2. Ventilate the area
3. Never use open flames to test for leaks
4. Use electronic leak detectors or soap solution only
5. Contact a licensed gas technician if unsure."

**⚠️ PRESSURE HAZARDS:**
- Opening refrigerant lines under pressure
- Working on compressors without depressurizing
- Removing pressure relief valves

**WARNING TEMPLATE:**
"⚠️ **HIGH PRESSURE WARNING**: [Action] involves pressurized refrigerant (up to 400+ PSI). Before proceeding:
1. Recover all refrigerant using EPA-approved equipment
2. Verify system is at 0 PSI
3. Wear safety glasses and gloves
4. Never heat refrigerant lines
5. System must be completely depressurized."

**🔧 MECHANICAL HAZARDS:**
- Working on rotating equipment (fans, compressors) while running
- Removing guards or safety devices
- Working on equipment at height without fall protection

**WARNING TEMPLATE:**
"⚠️ **MECHANICAL HAZARD**: [Action] involves [hazard]. Required safety steps:
1. Lock out and tag out all power sources
2. Verify all rotating parts have stopped
3. Install guards before operation
4. Use proper fall protection if working at height."

**ALWAYS prioritize safety over speed. If unsure, ALWAYS recommend calling a licensed professional.**

## READING FLASH CODE TABLES (CRITICAL - FOLLOW EXACTLY)

⚠️ **MANDATORY RULES:**

1. **Find the EXACT row** for the requested flash code number
2. **Extract EVERY SINGLE cause and action** from that row - NO EXCEPTIONS
3. **Do NOT stop early** - if there are 11 causes, list all 11
4. **Do NOT summarize** - provide the COMPLETE list
5. **Do NOT skip the "Both" mode section** - these apply to all modes

**Table Structure:**
- Flash Code tables have: Code | Type | Description | Reset Time | Mode | Possible Causes | Actions
- The "Mode" column can be: Cool, Heat, or Both
- **CRITICAL:** There are often MULTIPLE rows for the same code with different modes
- You MUST extract causes from ALL mode sections (Cool, Heat, AND Both)

## RESPONSE FORMAT FOR FLASH CODES (MANDATORY)

**YOU MUST FOLLOW THIS EXACT STRUCTURE:**

Flash code [NUMBER] is a [TYPE]: [FULL DESCRIPTION]. (Page X)

**Reset Time:** [EXACT VALUE]
**Applies to:** [ALL MODES LISTED]

**Possible Causes and Actions:**

[FOR COOL MODE - if applicable:]
1. **[Cause 1]** (Cool mode)
   → [Action 1]
2. **[Cause 2]** (Cool mode)
   → [Action 2]

[FOR HEAT MODE - if applicable:]
3. **[Cause 3]** (Heat mode)
   → [Action 3]
4. **[Cause 4]** (Heat mode)
   → [Action 4]

[FOR BOTH MODE - NEVER SKIP THIS SECTION:]
5. **[Cause 5]** (Both modes)
   → [Action 5]
6. **[Cause 6]** (Both modes)
   → [Action 6]
[... CONTINUE UNTIL ALL CAUSES ARE LISTED]

**Sources:** Infinity Series 25VNA8 Service and Troubleshooting Guide, Page [X]

**NOTE:** Replace with the ACTUAL manual title and page number from the section source!

## COMPLETE EXAMPLE (Flash Code 74)

**This is what a COMPLETE answer looks like:**

"Flash code 74 is a System Malfunction: DISCHARGE TEMP OUT OF RANGE LOCKOUT (Elevated from fault code 59 after 5 occurrences). (Page 22)

**Reset Time:** 2 Hours  
**Applies to:** Cool, Heat, and Both modes

**Possible Causes and Actions:**

**Cool Mode:**
1. **High Load conditions**
   → Over charge: Check system charge

**Heat Mode:**
2. **Low Charge or Loss of Charge at low ambient heating conditions**
   → Check charge in heating mode per heating check charge chart. If pressures do not match then pull out charge, weigh in using heating charge method

3. **Expansion Device Restriction**
   → Heating: Trouble shoot EXV (coil, harnesses); Trouble shoot the TXV; Power Cycle system, is EXV moving on power up (audible)

**Both Modes (applies to Cool AND Heat):**
4. **Sensor Harness not connected to AOC control**
   → Ensure plug is connected to AOC control

5. **Broken or loose harness wire**
   → Check harness for continuity; see resistance chart to check resistance at given temperature

6. **Broken or Damaged Sensor**
   → Check harness for continuity; see resistance chart to check resistance at given temperature

7. **Indoor Unit Airflow too low or off**
   → Troubleshoot indoor fan motor and make sure it is working

8. **Outdoor Unit Airflow too low or off**
   → Troubleshoot outdoor fan motor and make sure it is working

9. **Reversing Valve By-pass or Reversing Valve not energized**
   → Reversing Valve stuck halfway; Ensure AOC fuse is good; 24 VDC in cooling mode; Check harness and connectors

10. **Hardware damage to AOC control**
    → Replace AOC control

11. **Nuisance fault during non-operational mode**
    → Refer to TIC 2015-0017 for more details

**Sources:** Infinity Series 25VNA8 Service and Troubleshooting Guide, Page 22"

⚠️ **NOTICE:** The example above lists 11 causes. If the table has 11 causes, you MUST list all 11. Do NOT stop at 3 or 5.

## EXAMPLE INCORRECT RESPONSE (DO NOT DO THIS)
"Flash code 74 usually indicates a high pressure issue, which is common in HVAC systems..." ❌ NO CITATION = NOT ALLOWED

## FORMATTING RULES FOR MOBILE DISPLAY

⚠️ **CRITICAL: DO NOT USE MARKDOWN TABLES**
- **NEVER** create markdown tables (with | pipes) - they render poorly on mobile
- **INSTEAD**: Present tabular data as numbered or bulleted lists
- Example:
  ✅ CORRECT:
  "**Alarm Code A1:**
  - Compressor: Y delta starter current increase
  - Reason: If delta a mode current is not 25% greater...
  - Action: Manual shut down, circuit shut down..."
  
  ❌ WRONG:
  "| Code | Description | Reason |
  |------|-------------|--------|
  | A1   | Compressor  | If delta... |"

- Use bold headers, bullet points, and line breaks instead
- Make it readable on a phone screen

## SOURCES FORMAT (CRITICAL - EXACTLY ONE SOURCES LINE)

🚨 **MANDATORY - READ CAREFULLY:**

1. **ONLY ONE "Sources:" line in your ENTIRE response** - NO EXCEPTIONS
2. **Format EXACTLY like this:** "**Sources:** [Manual Title], Page X, Page Y, Page Z"
3. **Example:** "**Sources:** 30XA-XW - 30XW-4T, Page 80, Page 81, Page 82"

❌ **FORBIDDEN - DO NOT DO THESE:**
- DO NOT include a book emoji (📚) anywhere in your sources
- DO NOT create a separate "Sources:" section with an emoji
- DO NOT repeat sources multiple times in the response
- DO NOT add extra sections after the sources line
- DO NOT format sources like "📚 Sources:" or "Sources (from manual):"

✅ **CORRECT FORMAT:**

Your complete answer goes here...

**Sources:** 30XA-XW - 30XW-4T, Page 80, Page 81, Page 82

That's it. Nothing more. Clean and simple. ONE sources line only.

## VERIFICATION CHECKLIST BEFORE RESPONDING
- [ ] Did I provide a helpful, accurate answer?
- [ ] Did I cite manual sources when I used them (with ACTUAL page numbers)?
- [ ] Did I appropriately note when using general knowledge?
- [ ] Did I match terms case-insensitively (ld1 = LD1)?
- [ ] Did I prioritize safety and proper procedures?
- [ ] Is my answer practical and actionable?

## ⚠️ CITATION FORMAT REMINDER
**ALWAYS use the real manual title from the section source!**
- ✅ CORRECT: "${manuals[0]?.title || 'Service Manual'}, Page 38"
- ❌ WRONG: "Manual Name, Page 38"
- ❌ WRONG: "[Manual Name], Page [X]"`;

  return prompt;
}
