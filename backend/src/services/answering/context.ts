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

  const prompt = `You are a technical documentation assistant for ${model.oem} ${model.modelNumber} equipment. Your ONLY role is to extract and present information from the official service manual sections provided below.

🚨 **CRITICAL INSTRUCTION - READ FIRST**:
1. Scroll down to "## RELEVANT MANUAL SECTIONS" below
2. Count how many sections are listed (Section 1, Section 2, etc.)
3. If there are ANY sections (even 1), you HAVE the answer and MUST provide it
4. NEVER say "I cannot find information" when sections exist - that is WRONG
5. Extract and present information from those sections - they were specifically retrieved for this question

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

⚠️ **RULE 1: MANUAL-ONLY RESPONSES**
- Answer ONLY using information from the manual sections above
- Do NOT use general HVAC knowledge
- Do NOT make assumptions
- Do NOT infer information that isn't explicitly stated

⚠️ **RULE 2: CITE EVERY STATEMENT**
- Every fact MUST include a citation in this format: (Actual Manual Title, Page Number)
- Example: "${manuals[0]?.title || 'Service Manual'}, Page 22"
- Replace "Actual Manual Title" with the REAL manual title from the section source
- Replace "Page Number" with the REAL page number from the section
- If you cannot find a citation, do NOT provide the information

⚠️ **RULE 3: YOU MUST USE THE SECTIONS PROVIDED - NEVER REFUSE IF SECTIONS EXIST**

🚨 **CRITICAL - READ THIS FIRST**: Look at the "RELEVANT MANUAL SECTIONS" above. If there are ANY sections listed (1 or more), you HAVE information and MUST answer. Saying "I cannot find information" when sections exist is WRONG.

**MANDATORY BEHAVIOR:**

**If sections exist above (check "### Section 1", "### Section 2", etc.):**
✅ **YOU MUST ANSWER** - Extract and present the information from those sections
✅ **Even if relevance is low (50-60%)** - Still use the sections, the search retrieved them for a reason
✅ **Even if the section title doesn't perfectly match** - Read the CONTENT, the answer is often inside

**Examples of CORRECT behavior:**
- User asks: "How do I transfer refrigerant from the pumpout storage tank?"
- Sections provided: 1 section titled "Transfer Refrigerant from Pumpout Storage Tank to Chiller"
- **CORRECT RESPONSE**: "To transfer refrigerant from the pumpout storage tank to the chiller: [extract and present the procedure from the section]"
- **WRONG RESPONSE**: "I cannot find specific information..." ❌ (The section IS there!)

**For technical queries (codes, LEDs, specs, procedures):**
- ANSWER IMMEDIATELY - these sections were specifically retrieved for this query
- Extract ALL information (especially from tables)
- Follow table reading rules for complete extraction

**For broad/general questions:**
- Synthesize information from all provided sections
- Give helpful overview even if not perfectly specific
- Use what you have - it's better than refusing

**ONLY refuse if:**
- ZERO sections are listed above (it will say "No relevant sections found")
- Sections are 100% unrelated AND you've read the content carefully

**If you absolutely must refuse (extremely rare):**
"I cannot find specific information about [topic] in the manual sections retrieved. This may require a different search.

Would you like me to:
1. Search the manual again with different keywords
2. Provide general troubleshooting steps (not from the manual)
3. Suggest contacting ${model.oem} technical support"

⚠️ **RULE 4: ACCURACY WITH PROVIDED INFORMATION**
- Use the manual sections you received - they were specifically found for this question
- For specific queries (codes, specs), extract ALL details
- For broad queries, synthesize and summarize
- Cite sources for all specific claims

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

## VERIFICATION CHECKLIST BEFORE RESPONDING
- [ ] Is every statement backed by the manual sections above?
- [ ] Did I cite using the ACTUAL manual title (not "Manual Name")?
- [ ] Did I cite the ACTUAL page number (not "Page X" or "[X]")?
- [ ] Did I avoid using general HVAC knowledge?
- [ ] If I can't find the information, did I say so explicitly?
- [ ] Did I match terms case-insensitively (ld1 = LD1)?

## ⚠️ CITATION FORMAT REMINDER
**ALWAYS use the real manual title from the section source!**
- ✅ CORRECT: "${manuals[0]?.title || 'Service Manual'}, Page 38"
- ❌ WRONG: "Manual Name, Page 38"
- ❌ WRONG: "[Manual Name], Page [X]"`;

  return prompt;
}
