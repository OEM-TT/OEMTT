# AI Chat Enhancement Plan
## Conversation History + Hybrid Knowledge + Perplexity Fallback

**Created:** 2026-01-25  
**Updated:** 2026-01-26  
**Status:** Phase 1 Complete ✅ | Phase 2 Ready  
**Priority:** HIGH  
**Timeline:** 2-3 weeks

---

## 🎯 Executive Summary

Transform the AI chat from isolated Q&A to intelligent conversational assistant with:
1. ✅ **Conversation memory** (last 10 messages) - **COMPLETE**
2. 🔶 **Hybrid knowledge** (manual + GPT general knowledge) - **NEXT**
3. ⏳ **Perplexity fallback** (user-controlled, last resort) - Pending
4. ⏳ **Knowledge caching** (reduce costs, grow database) - Pending

**Key Principle:** Perplexity is EXPENSIVE → Use as absolute last resort

---

## ✅ Phase 2 Complete: Hybrid Knowledge (2026-01-26)

**Goal:** Enable AI to use general HVAC/electrical knowledge while prioritizing manual content.

**What Was Implemented:**

1. ✅ **Temperature Adjustment** (`chat.controller.ts` line 165)
   - Changed from `0.0` (too restrictive) → `0.6` (balanced)
   - Allows reasoning and general knowledge while remaining mostly factual

2. ✅ **Three-Tier System Prompt** (`context.ts` lines 671-711)
   - **TIER 1**: Manual content (highest priority) - cite page numbers
   - **TIER 2**: General HVAC/electrical knowledge - add disclaimer
   - **TIER 3**: Cannot answer - suggest web search or support
   - Added decision tree with examples for each tier

3. ✅ **Confidence Scoring** (`context.ts` lines 515-573)
   - `determineConfidenceAndSource()` function
   - Returns: `{ confidence: number, sourceType: 'manual' | 'general_knowledge' | 'needs_web_search' }`
   - Detects general knowledge patterns (multimeter, refrigerant, HVAC theory)
   - Thresholds: >0.65 = manual, 0.50-0.65 = general, <0.50 = needs web search

4. ✅ **Updated ChatContext Interface** (`context.ts` lines 15-50)
   - Added `confidence: number` field
   - Added `sourceType` field for tier detection

**Example Queries Now Supported:**
```
Q: "What is flash code 207?"
→ TIER 1: Searches manual, cites page number (confidence: 0.85)

Q: "How do I use a multimeter to check voltage?"
→ TIER 2: Uses general electrical knowledge, adds disclaimer (confidence: 0.55)

Q: "Are there recalls for this model?"
→ TIER 3: Suggests web search (confidence: 0.30)
```

**Next Step:** Phase 3 - Perplexity Fallback (automatic when confidence < 0.5)

---

## 🏗️ Architecture Overview

### **Three-Tier Knowledge Strategy**

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1: Manual Content (PRIMARY - Free)                 │
│ • Vector search manual_sections                         │
│ • Keyword search for codes/part numbers                 │
│ • High confidence (>0.65 similarity)                    │
│ → Direct answer with source attribution                 │
└─────────────────────────────────────────────────────────┘
                        ↓ (No match OR low confidence)
┌─────────────────────────────────────────────────────────┐
│ TIER 2: GPT General Knowledge (SECONDARY - Free)        │
│ • Electrician knowledge (voltage, wiring, multimeter)   │
│ • HVAC fundamentals (refrigerant, pressures, cycles)    │
│ • General troubleshooting (not model-specific)          │
│ → Answer with disclaimer: "Based on general HVAC        │
│   knowledge (not in manual)"                            │
└─────────────────────────────────────────────────────────┘
                        ↓ (Can't answer confidently)
┌─────────────────────────────────────────────────────────┐
│ TIER 3: Perplexity Web Search (AUTOMATIC LAST RESORT)   │
│ ⚠️ EXPENSIVE: $0.005-0.060 per search                   │
│ • Triggered automatically when confidence < 0.5         │
│ • Model-specific query to Perplexity                    │
│ • Store EVERYTHING (answer, sources, citations, URLs)   │
│ • Cache result for future users (95% cost reduction)    │
│ → Answer with sources + "🌐 Found on web" badge         │
└─────────────────────────────────────────────────────────┘
```

**Key Decision Point:**
```
if (manualConfidence > 0.65) {
  → Answer from manual
} else if (generalKnowledgeApplies) {
  → Answer with GPT general knowledge
} else {
  → AUTOMATIC Perplexity search (last resort)
}
```

---

## 💰 Perplexity API Strategy (CRITICAL - Cost Optimization)

### **Why Perplexity is Expensive**

**Pricing (as of 2026):**
- `sonar` (standard): **$0.005 per request** + $0.0006 per 1K tokens
- `sonar-pro` (advanced): **$0.060 per request** + $0.006 per 1K tokens
- `sonar-deep-research`: **$5.00 per search** (overkill for us)

**Cost Comparison:**
```
GPT-4o-mini (our current):  $0.0003 per 1K input tokens  ← CHEAP
Perplexity sonar:           $0.005 per request + tokens  ← 15-20x MORE
Perplexity sonar-pro:       $0.060 per request + tokens  ← 200x MORE
```

### **Our Strategy: sonar (Standard) with Aggressive Caching**

**✅ Use: `sonar` (standard model)**
- Cheaper than sonar-pro ($0.005 vs $0.060)
- Still accesses real-time web data
- Good enough for HVAC troubleshooting
- 4-5 second response time (acceptable)

**❌ Avoid: `sonar-pro` unless critical**
- Only use for complex multi-step queries
- Only use if user explicitly requests "deep search"
- Track usage separately for cost monitoring

### **Cost Reduction Strategies**

#### **1. Aggressive Caching (95% Cost Reduction)**
```typescript
// Before calling Perplexity, check cache
const cached = await checkCachedWebSearch(modelId, question);
if (cached) {
  // Saved $0.005-0.060!
  return cached;
}

// Only call if no cache hit
const result = await perplexity.search(query);

// Cache for future users
await cacheWebSearchResult(result);
```

**Expected Cache Hit Rates:**
- Month 1: 20% (building cache)
- Month 2: 50% (common questions cached)
- Month 3+: 80-90% (mature system)

#### **2. Store EVERYTHING from Perplexity**
```typescript
interface PerplexityResponse {
  answer: string;              // Main answer text
  citations: Array<{          // KEEP ALL CITATIONS
    url: string;
    title: string;
    snippet: string;
    position: number;
  }>;
  images?: Array<{            // KEEP IMAGES (diagrams!)
    url: string;
    description: string;
  }>;
  related_questions?: string[]; // KEEP RELATED (future cache seeds)
  usage: {                    // KEEP USAGE (cost tracking)
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Store ALL fields in database
await prisma.manualSection.create({
  data: {
    content: answer,
    source_type: 'web_search',
    source_metadata: {
      perplexity_full_response: result, // ENTIRE RESPONSE
      citations: result.citations,      // All sources
      images: result.images,            // Diagrams/photos
      related: result.related_questions,
      cost: calculateCost(result.usage),
      model: 'sonar',
      timestamp: new Date().toISOString()
    }
  }
});
```

#### **3. Smart Query Construction**
```typescript
// BAD: Vague query
"Are there common issues?"
→ Perplexity returns generic results

// GOOD: Specific query with model context
"Carrier 19XR AquaEdge chiller: Common fault codes and troubleshooting for flash code 207"
→ Perplexity returns highly relevant, cacheable results
```

#### **4. Rate Limiting (Prevent Abuse)**
```typescript
// Limit per user per day
const dailySearches = await redis.incr(`perplexity:user:${userId}:${today}`);
if (dailySearches > 10) {
  throw new Error('Daily Perplexity limit reached (10/day)');
}

// Limit per model per hour (prevent spam)
const hourlySearches = await redis.incr(`perplexity:model:${modelId}:${hour}`);
if (hourlySearches > 50) {
  throw new Error('Too many searches for this model this hour');
}
```

### **Cost Projections**

**Scenario 1: 1,000 users, 10 questions/user/month = 10,000 questions**

**Without caching:**
- 10,000 × $0.005 = **$50/month** (if all use Perplexity - unrealistic)

**With 90% cache hit rate (realistic by Month 3):**
- New searches: 1,000 × $0.005 = $5
- Cached hits: 9,000 × $0 = $0
- **Total: $5/month** ✅

**Best case (95% cache, only 5% use Perplexity):**
- Questions needing Perplexity: 500
- New searches: 25 × $0.005 = $0.125
- Cached hits: 475 × $0 = $0
- **Total: $0.13/month** 🎉

### **API Configuration**

```typescript
const PERPLEXITY_CONFIG = {
  model: 'sonar',                    // Standard model (cheaper)
  temperature: 0.4,                  // Balanced (not too creative)
  return_citations: true,            // ALWAYS GET SOURCES
  return_images: true,               // GET DIAGRAMS (helpful for visual learners)
  return_related_questions: true,   // SEED FUTURE CACHE
  max_tokens: 1500,                 // Cap response length (cost control)
  search_recency_filter: 'year',    // Last year only (HVAC doesn't change fast)
  search_domain_filter: [           // Prioritize official sources
    'shareddocs.com',
    'carrier.com', 
    'trane.com',
    'lennox.com',
    'hvac-talk.com'                 // Forums for real-world tips
  ]
};
```

### **Monitoring & Alerts**

```typescript
// Daily cost report
const stats = await getPerplexityStats();
if (stats.dailyCost > 10) {
  // Alert admin: Unusual Perplexity usage
  await sendAlert({
    level: 'warning',
    message: `Perplexity costs: $${stats.dailyCost}/day (expected: $1-2/day)`,
    breakdown: stats.byUser
  });
}

// Cache health check
if (stats.cacheHitRate < 0.70 && stats.daysSinceLaunch > 30) {
  // Cache hit rate should be >70% by day 30
  await sendAlert({
    level: 'info',
    message: `Low cache hit rate: ${stats.cacheHitRate * 100}% (expected: >70%)`,
    suggestion: 'Review query patterns for optimization'
  });
}
```

### **📝 Summary: Perplexity Strategy**

**✅ DO:**
- Use `sonar` (standard model) - cheaper ($0.005 vs $0.060)
- Store **EVERYTHING** (answer, citations, images, related questions, usage)
- Check cache **FIRST** before calling API (95% cost reduction)
- Build model-specific queries: "Carrier 19XR: [question]"
- Set rate limits (10/user/day, 50/model/hour)
- Filter to recent results (last year)
- Prioritize official domains (shareddocs.com, carrier.com, etc.)

**❌ DON'T:**
- Don't use `sonar-pro` unless critical (12x more expensive)
- Don't filter out sources, images, or related questions (we want ALL data)
- Don't let users spam Perplexity (rate limits!)
- Don't call Perplexity if cache hit available

**📊 Expected Costs:**
- Month 1: $10-20 (building cache)
- Month 2: $3-5 (50% cache hit)
- Month 3+: $0.50-2 (90% cache hit) ✅

**🎯 Goal: < $2/month by Month 3**

---

## 📋 Phase 1: Conversation History (Week 1)

### **Goal:** Enable follow-up questions with context awareness

### **Backend Changes**

#### 1.1 Update Chat API Schema
**File:** `backend/src/controllers/chat.controller.ts`

```typescript
// OLD: Single message
{
  unitId: "uuid",
  question: "What is code 207?"
}

// NEW: Conversation array
{
  unitId: "uuid",
  messages: [
    { role: "user", content: "What is code 207?", timestamp: "..." },
    { role: "assistant", content: "Code 207 indicates...", timestamp: "..." },
    { role: "user", content: "How do I check the voltage?" } // ← Needs context
  ]
}
```

#### 1.2 Conversation History Processing
**File:** `backend/src/services/answering/context.ts`

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatRequest {
  unitId: string;
  messages: ConversationMessage[]; // Last 10 messages
}

function buildConversationContext(messages: ConversationMessage[]): string {
  // Take last 10 messages
  const recentMessages = messages.slice(-10);
  
  // Format for GPT
  return recentMessages.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n\n');
}

// Check token count - summarize if >8K tokens
async function summarizeIfNeeded(context: string): Promise<string> {
  const tokens = estimateTokens(context);
  
  if (tokens > 8000) {
    // Use GPT to summarize conversation so far
    const summary = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize this HVAC troubleshooting conversation in 3-4 sentences.' },
        { role: 'user', content: context }
      ],
      temperature: 0.3
    });
    return summary.choices[0].message.content;
  }
  
  return context;
}
```

#### 1.3 Update System Prompt
```typescript
function buildSystemPrompt(
  manual: ManualContext,
  sections: ManualSection[],
  conversationHistory: string // ← NEW
): string {
  return `You are an expert HVAC technician assistant for ${manual.oem} ${manual.model}.

CONVERSATION HISTORY:
${conversationHistory}

CURRENT QUESTION CONTEXT:
The user just asked a follow-up question. Use the conversation history to understand:
- What they've already been told
- What component/issue they're working on
- What steps they've already tried

[Rest of system prompt...]`;
}
```

### **Frontend Changes**

#### 1.4 Store Full Conversation
**File:** `app/(modals)/unit-chat.tsx`

```typescript
const [messages, setMessages] = useState<Message[]>([]);

// When sending new message
const handleSend = async (userMessage: string) => {
  const newMessages = [
    ...messages,
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
  ];
  
  setMessages(newMessages);
  
  // Send last 10 messages to API
  const response = await chatService.sendMessage(unitId, {
    messages: newMessages.slice(-10)
  });
  
  setMessages([...newMessages, {
    role: 'assistant',
    content: response.answer,
    sources: response.sources,
    confidence: response.confidence,
    timestamp: new Date().toISOString()
  }]);
};
```

### **Success Criteria**
- ✅ User asks "What is code 207?" → Gets answer ✅ **TESTED**
- ✅ User asks "How do I fix it?" → AI knows "it" = code 207 ✅ **TESTED**
- ✅ User asks "What tools do I need?" → AI remembers context ✅ **TESTED**
- ✅ Conversations >8K tokens get summarized ✅ **IMPLEMENTED**

### **✅ Phase 1 Completed (2026-01-26)**

**What We Built:**
1. **Database Schema** (`backend/prisma/schema.prisma`)
   - Created `chat_sessions` table to group conversations
   - Added `chat_session_id` to `questions` table
   - Migrated existing questions to individual sessions

2. **Backend API** (`backend/src/controllers/chat.controller.ts`)
   - Updated `/api/chat/ask` to accept `messages` array (last 10 messages)
   - Auto-creates `chat_session` on first question
   - Reuses session for follow-up questions via `chatSessionId` parameter
   - Returns `chatSessionId` in response for frontend to track

3. **Conversation Processing** (`backend/src/services/answering/context.ts`)
   - `buildConversationContext()` - Formats last 10 messages for GPT
   - `summarizeIfNeeded()` - Uses gpt-4o-mini to summarize >8K token conversations
   - `gatherChatContext()` - Passes conversation history to system prompt

4. **System Prompt Enhancement** (`buildSystemPrompt`)
   - Added "CONVERSATION HISTORY" section
   - Instructions for AI to use context for pronouns and references
   - Examples of how to understand follow-up questions

5. **Frontend Updates** (`app/(modals)/unit-chat.tsx`, `services/api/chat.service.ts`)
   - Stores full conversation in `messages` state
   - Sends last 10 messages with each new question
   - Tracks `chatSessionId` across conversation
   - Passes `chatSessionId` to backend for session continuity

6. **Chat History UI** (`app/(modals)/unit-details.tsx`)
   - Updated to display chat sessions (not individual questions)
   - Click session → Loads full conversation history
   - New endpoint: `GET /api/chat/session/:sessionId`
   - Shows session title, last message time, and preview

**Real-World Test Results:**
```
User: "How do I check refrigerant levels?"
AI: [Answers from manual]

User: "What if they're low?"
Context sent: 2276 tokens of conversation history
AI: ✅ Understands "they" = refrigerant levels
AI: ✅ Provides next steps for low refrigerant
```

**Performance:**
- Conversation context: ~2K tokens average
- Token summarization: Triggers at >8K tokens
- Processing time: +2-3 seconds for context processing
- Cost impact: ~$0.0002 per conversation turn (minimal)

---

## 📋 Phase 2: Hybrid Knowledge (Temperature + Prompt Engineering) (Week 1)

### **Goal:** Allow GPT to use general HVAC/electrical knowledge

**Status:** 🔶 READY TO START (Next Priority)

### **2.1 Temperature Adjustment**
**File:** `backend/src/controllers/chat.controller.ts`

```typescript
// OLD
temperature: 0.2  // Too restrictive, refuses general questions

// NEW
temperature: 0.6  // Balanced: follows manual but thinks independently
```

### **2.2 Enhanced System Prompt**
**File:** `backend/src/services/answering/context.ts`

```typescript
const SYSTEM_PROMPT = `You are an expert HVAC technician assistant.

KNOWLEDGE HIERARCHY (CRITICAL):

1. MANUAL CONTENT (HIGHEST PRIORITY)
   - For technical/specific questions about THIS unit
   - Examples: "What is flash code 207?", "What refrigerant does this use?", "Where is the compressor?"
   - ALWAYS cite the manual section and page number
   - Format: "According to the manual (Page X)..."

2. GENERAL HVAC/ELECTRICAL KNOWLEDGE (SECONDARY)
   - For general troubleshooting/process questions
   - Examples: "How do I check voltage?", "What's a multimeter?", "How does refrigerant work?"
   - CLEARLY indicate this is general knowledge, not manual-specific
   - Format: "Based on general HVAC knowledge (not specific to this manual)..."

3. CANNOT ANSWER (TRIGGER WEB SEARCH)
   - Model-specific questions NOT in manual
   - Examples: "What's the recall for this model?", "Where can I buy parts?", "Known issues?"
   - Respond: "I don't have this information in the manual. Would you like me to search the web?"

DECISION TREE:
┌─ Question about THIS specific unit? (codes, specs, parts)
│  └─ YES → Search manual sections → Answer from manual
│  └─ NO  ↓
├─ General HVAC/electrical question? (how-to, definitions, theory)
│  └─ YES → Use your training knowledge → Prefix with disclaimer
│  └─ NO  ↓
└─ Model-specific but NOT in manual? (recalls, availability, forums)
   └─ Suggest web search

EXAMPLES:

Q: "What is flash code 207?"
A: According to the manual (Page 28), flash code 207 indicates...
   [CITE MANUAL]

Q: "How do I use a multimeter to check voltage?"
A: Based on general electrical knowledge (not specific to this manual):
   1. Set multimeter to AC voltage...
   [GENERAL KNOWLEDGE]

Q: "Are there any recalls for this unit?"
A: I don't have recall information in the manual. Would you like me to search the web?
   [TRIGGER WEB SEARCH]

---

MANUAL SECTIONS PROVIDED:
${sections.map(s => `[Page ${s.page_reference}] ${s.section_title}\n${s.content}`).join('\n\n')}
`;
```

### **2.3 Confidence Scoring**
```typescript
interface ChatResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'manual' | 'general_knowledge' | 'unknown';
  canSearchWeb: boolean;
  sections?: ManualSection[];
}

function determineConfidence(
  sections: ManualSection[],
  question: string
): ChatResponse {
  // High confidence: Manual sections found with similarity >0.65
  if (sections.length > 0 && sections[0].similarity > 0.65) {
    return {
      confidence: 'high',
      source: 'manual',
      canSearchWeb: false
    };
  }
  
  // Medium confidence: General question patterns detected
  const generalPatterns = [
    /how (do|to|can) (i|you) (check|test|measure)/i,
    /what (is|does) (a|an) (multimeter|voltmeter|ohmmeter)/i,
    /how (does|do) (refrigerant|hvac|ac|heat pump) work/i
  ];
  
  const isGeneralQuestion = generalPatterns.some(p => p.test(question));
  
  if (isGeneralQuestion) {
    return {
      confidence: 'medium',
      source: 'general_knowledge',
      canSearchWeb: false
    };
  }
  
  // Low confidence: Can't help
  return {
    confidence: 'low',
    source: 'unknown',
    canSearchWeb: true
  };
}
```

### **Success Criteria**
- ✅ "What is code 207?" → Answers from manual (high confidence)
- ✅ "How do I check voltage?" → Answers from general knowledge (medium)
- ✅ "Are there recalls?" → Suggests web search (low confidence)
- ✅ All answers clearly indicate source

---

## 📋 Phase 3: Perplexity Fallback (Automatic) (Week 2)

### **Goal:** Automatic web search when confidence is low (< 0.5)

**Key Change:** Perplexity is now **automatic**, not user-triggered

### **3.1 Confidence Detection**
**File:** `backend/src/services/answering/context.ts`

```typescript
interface ChatContext {
  confidence: number;        // 0.0 - 1.0
  source: 'manual' | 'general_knowledge' | 'needs_web_search';
  sections: ManualSection[];
}

function determineConfidence(sections: ManualSection[], question: string): ChatContext {
  // High confidence: Manual sections with good similarity
  if (sections.length > 0 && sections[0].similarity > 0.65) {
    return {
      confidence: sections[0].similarity,
      source: 'manual',
      sections
    };
  }
  
  // Medium confidence: General HVAC question patterns
  const generalPatterns = [
    /how (do|to|can) (i|you) (check|test|measure|use)/i,
    /what (is|does) (a|an) (multimeter|voltmeter|refrigerant)/i,
  ];
  
  if (generalPatterns.some(p => p.test(question))) {
    return {
      confidence: 0.6,
      source: 'general_knowledge',
      sections
    };
  }
  
  // Low confidence: Needs web search
  return {
    confidence: 0.3,
    source: 'needs_web_search',
    sections
  };
}
```

### **3.2 Backend Endpoint (Automatic Perplexity)**
**File:** `backend/src/controllers/chat.controller.ts`

```typescript
/**
 * POST /api/chat/ask
 * NOW INCLUDES AUTOMATIC PERPLEXITY FALLBACK
 */
export const askQuestion = asyncHandler(async (req: Request, res: Response) => {
  // ... existing code ...
  
  // Gather context from manual + conversation history
  const context = await gatherChatContext(unitId, question, conversationHistory);
  
  // DECISION POINT: Do we need Perplexity?
  if (context.confidence < 0.50 && context.source === 'needs_web_search') {
    console.log(`⚠️ Low confidence (${context.confidence}), triggering Perplexity...`);
    
    // 1. Check cache first (save $$$)
    const cached = await checkCachedWebSearch(context.model.id, question);
    
    if (cached) {
      console.log(`💾 Cache hit! Saved $0.005 on Perplexity API`);
      
      // Use cached result
      context.sections = [cached];
      context.confidence = 0.75; // Cached web results are trustworthy
      context.source = 'web_search_cached';
      
      // Track cache hit (no cost)
      await logPerplexityUsage({
        userId,
        unitId,
        query: question,
        cost: 0,
        cached: true,
        cacheHitId: cached.id
      });
      
    } else {
      // 2. Call Perplexity API (EXPENSIVE)
      const modelContext = `${context.model.productLine.oem.name} ${context.model.modelNumber}`;
      const enhancedQuery = `${modelContext}: ${question}`;
      
      console.log(`🌐 Calling Perplexity API for: "${enhancedQuery}"`);
      
      const perplexityResult = await perplexityService.search({
        query: enhancedQuery,
        conversationHistory,
        model: 'sonar', // Standard model (cheaper)
        config: {
          return_citations: true,        // GET ALL SOURCES
          return_images: true,            // GET DIAGRAMS
          return_related_questions: true, // SEED CACHE
          search_recency_filter: 'year',
          max_tokens: 1500
        }
      });
      
      // 3. Store EVERYTHING in cache
      const cachedSection = await cacheWebSearchResult({
        modelId: context.model.id,
        question,
        fullResponse: perplexityResult, // ENTIRE RESPONSE
        userId
      });
      
      // 4. Track cost
      await logPerplexityUsage({
        userId,
        unitId,
        query: enhancedQuery,
        cost: perplexityResult.cost,
        cached: false,
        tokens: perplexityResult.usage.total_tokens
      });
      
      // 5. Use Perplexity result
      context.sections = [cachedSection];
      context.confidence = 0.70; // Web results are good
      context.source = 'web_search_new';
    }
  }
  
  // Continue with GPT response (using manual, general, or web search context)
  // ... existing streaming code ...
});
```

### **3.2 Perplexity Service**
**File:** `backend/src/services/answering/perplexity.ts`

```typescript
interface PerplexitySearchOptions {
  query: string;
  context?: string; // Conversation history
  model?: 'sonar' | 'sonar-pro';
}

interface PerplexityResult {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  cost: number;
}

export async function search(options: PerplexitySearchOptions): Promise<PerplexityResult> {
  const { query, context, model = 'sonar' } = options;
  
  // Build system prompt
  const systemPrompt = `You are an HVAC technical expert. Answer the question concisely and accurately.
${context ? `\n\nConversation context:\n${context}` : ''}

Provide:
1. Direct answer (2-3 paragraphs max)
2. Step-by-step instructions if applicable
3. Safety warnings if relevant`;

  const response = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.4,
      return_citations: true,
      return_images: false
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Extract sources
  const sources = response.data.citations?.map((citation: any) => ({
    title: citation.title || new URL(citation.url).hostname,
    url: citation.url,
    snippet: citation.snippet || ''
  })) || [];
  
  // Estimate cost
  const cost = model === 'sonar-pro' ? 0.05 : 0.01;
  
  return {
    answer: response.data.choices[0].message.content,
    sources,
    cost
  };
}
```

### **3.3 Frontend UI** (Automatic, No Button Needed)
**File:** `app/(modals)/unit-chat.tsx`

```typescript
// Show source badge based on where answer came from
{message.source && (
  <View style={styles.sourceBadge}>
    {message.source === 'manual' && (
      <Text style={styles.sourceBadgeManual}>📖 From Manual</Text>
    )}
    {message.source === 'general_knowledge' && (
      <Text style={styles.sourceBadgeGeneral}>
        💡 General HVAC Knowledge
      </Text>
    )}
    {(message.source === 'web_search_new' || message.source === 'web_search_cached') && (
      <>
        <Text style={styles.sourceBadgeWeb}>
          🌐 Found on Web {message.source === 'web_search_cached' && '(Previously searched)'}
        </Text>
        {message.source === 'web_search_new' && (
          <Text style={styles.costNote}>• New web search performed</Text>
        )}
      </>
    )}
  </View>
)}

// Show ALL citations from Perplexity
{message.citations && message.citations.length > 0 && (
  <View style={styles.citations}>
    <Text style={styles.citationsTitle}>Sources:</Text>
    {message.citations.map((citation, idx) => (
      <TouchableOpacity
        key={idx}
        onPress={() => Linking.openURL(citation.url)}
        style={styles.citationLink}
      >
        <Text style={styles.citationNumber}>[{idx + 1}]</Text>
        <View style={styles.citationContent}>
          <Text style={styles.citationTitle}>{citation.title}</Text>
          <Text style={styles.citationUrl}>{citation.url}</Text>
          {citation.snippet && (
            <Text style={styles.citationSnippet}>{citation.snippet}</Text>
          )}
        </View>
      </TouchableOpacity>
    ))}
  </View>
)}

// Show related questions (seed for future searches)
{message.related_questions && (
  <View style={styles.relatedQuestions}>
    <Text style={styles.relatedTitle}>Related questions:</Text>
    {message.related_questions.map((q, idx) => (
      <TouchableOpacity
        key={idx}
        onPress={() => handleSuggestion(q)}
        style={styles.relatedQuestion}
      >
        <Text style={styles.relatedText}>• {q}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

### **3.4 Cost Tracking Dashboard**
**File:** `backend/src/controllers/analytics.controller.ts`

```typescript
// Admin endpoint to monitor Perplexity usage
export const getPerplexityStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await prisma.perplexityUsage.aggregate({
    _sum: { cost: true },
    _count: { id: true },
    where: {
      created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }
  });
  
  const cacheHits = await prisma.manualSection.count({
    where: {
      source_type: 'web_search',
      metadata: {
        path: ['accessed_count'],
        gte: 1
      }
    }
  });
  
  res.json({
    total_searches: stats._count.id,
    total_cost: stats._sum.cost,
    cache_hits: cacheHits,
    estimated_savings: cacheHits * 0.05, // Assume $0.05 per search
    avg_cost_per_search: stats._sum.cost / stats._count.id
  });
});
```

### **Success Criteria**
- ✅ User can trigger web search manually
- ✅ Results are cached for future users
- ✅ Sources are clickable and attributed
- ✅ Cost is tracked per user/query
- ✅ "🌐 Found on web" badge shows source type

---

## 📋 Phase 4: Knowledge Caching (Week 2-3)

### **Goal:** Store Perplexity results to reduce future costs

### **4.1 Database Schema**
**File:** `backend/prisma/schema.prisma`

```prisma
model ManualSection {
  // ... existing fields ...
  
  source_type      String   @default("manual") // 'manual' | 'web_search' | 'community'
  source_metadata  Json?    // Store Perplexity sources, user votes, etc.
  
  @@index([source_type])
}

model PerplexityUsage {
  id          String   @id @default(uuid())
  user_id     String
  unit_id     String
  query       String
  cost        Float
  cached      Boolean  @default(false)
  created_at  DateTime @default(now())
  
  user        User     @relation(fields: [user_id], references: [id])
  unit        SavedUnit @relation(fields: [unit_id], references: [id])
  
  @@index([user_id])
  @@index([created_at])
}
```

### **4.2 Cache Web Search Result**
**File:** `backend/src/services/answering/cache.ts`

```typescript
interface CacheWebSearchOptions {
  modelId: string;
  question: string;
  answer: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  userId: string;
}

export async function cacheWebSearchResult(options: CacheWebSearchOptions): Promise<ManualSection> {
  const { modelId, question, answer, sources, userId } = options;
  
  // 1. Generate embedding for future searches
  const embedding = await generateEmbedding(answer);
  
  // 2. Extract section title from question
  const sectionTitle = question.slice(0, 100); // First 100 chars as title
  
  // 3. Store as manual section
  const cached = await prisma.manualSection.create({
    data: {
      manual_id: modelId, // Link to model's primary manual
      section_title: sectionTitle,
      section_type: 'troubleshooting', // Default type
      content: answer,
      embedding,
      source_type: 'web_search',
      source_metadata: {
        original_query: question,
        perplexity_sources: sources,
        cached_at: new Date().toISOString(),
        cached_by: userId,
        upvotes: 0,
        downvotes: 0,
        accessed_count: 1
      }
    }
  });
  
  console.log(`✅ Cached web search result: "${sectionTitle.slice(0, 50)}..."`);
  
  return cached;
}

// Check if similar question was already answered
export async function checkCachedWebSearch(modelId: string, question: string): Promise<ManualSection | null> {
  const embedding = await generateEmbedding(question);
  
  // Search only web_search source_type sections
  const cached = await prisma.$queryRaw`
    SELECT *, 
      1 - (embedding <=> ${embedding}::vector) as similarity
    FROM manual_sections
    WHERE manual_id = ${modelId}
      AND source_type = 'web_search'
      AND 1 - (embedding <=> ${embedding}::vector) > 0.75
    ORDER BY similarity DESC
    LIMIT 1
  `;
  
  if (cached && cached.length > 0) {
    // Increment access count
    await prisma.manualSection.update({
      where: { id: cached[0].id },
      data: {
        source_metadata: {
          ...cached[0].source_metadata,
          accessed_count: (cached[0].source_metadata.accessed_count || 0) + 1,
          last_accessed: new Date().toISOString()
        }
      }
    });
    
    console.log(`💾 Cache hit! Saved $0.05 on Perplexity API`);
    return cached[0];
  }
  
  return null;
}
```

### **4.3 Update Search to Include Cache**
**File:** `backend/src/services/answering/context.ts`

```typescript
export async function gatherContext(
  unitId: string,
  question: string,
  conversationHistory?: string
): Promise<ContextResult> {
  // ... existing code ...
  
  // Search ALL manual sections (including web_search source_type)
  const sections = await searchManualSections({
    modelId: unit.model.id,
    query: enhancedQuery,
    limit: 20,
    minSimilarity: 0.55,
    includeWebSearch: true // ← NEW: Include cached web searches
  });
  
  // Separate by source type
  const manualSections = sections.filter(s => s.source_type === 'manual');
  const cachedSections = sections.filter(s => s.source_type === 'web_search');
  
  return {
    sections: [...manualSections, ...cachedSections], // Manual first, cache second
    confidence: calculateConfidence(sections),
    canSearchWeb: sections.length === 0 || sections[0].similarity < 0.55
  };
}
```

### **4.4 User Voting System**
**File:** `app/(modals)/unit-chat.tsx`

```typescript
// Show voting for web search results
{message.source_type === 'web_search' && (
  <View style={styles.voting}>
    <Text style={styles.votingPrompt}>Was this helpful?</Text>
    <View style={styles.voteButtons}>
      <TouchableOpacity
        onPress={() => handleVote(message.sectionId, 'up')}
        style={styles.voteButton}
      >
        <Text style={styles.voteIcon}>👍</Text>
        <Text style={styles.voteCount}>{message.upvotes || 0}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleVote(message.sectionId, 'down')}
        style={styles.voteButton}
      >
        <Text style={styles.voteIcon}>👎</Text>
        <Text style={styles.voteCount}>{message.downvotes || 0}</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

**Backend:**
```typescript
// POST /api/chat/vote
export const voteOnAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { sectionId, vote } = req.body; // vote: 'up' | 'down'
  const userId = req.user!.id;
  
  const section = await prisma.manualSection.findUnique({
    where: { id: sectionId }
  });
  
  if (section.source_type !== 'web_search') {
    throw new Error('Can only vote on web search results');
  }
  
  const metadata = section.source_metadata as any;
  
  await prisma.manualSection.update({
    where: { id: sectionId },
    data: {
      source_metadata: {
        ...metadata,
        upvotes: vote === 'up' ? (metadata.upvotes || 0) + 1 : metadata.upvotes,
        downvotes: vote === 'down' ? (metadata.downvotes || 0) + 1 : metadata.downvotes,
        votes: [
          ...(metadata.votes || []),
          { userId, vote, timestamp: new Date().toISOString() }
        ]
      }
    }
  });
  
  // If too many downvotes (>5), flag for review
  if (vote === 'down' && metadata.downvotes >= 5) {
    console.warn(`⚠️  Cached answer ${sectionId} has ${metadata.downvotes} downvotes - needs review`);
  }
  
  res.json({ success: true });
});
```

### **Success Criteria**
- ✅ First user triggers Perplexity search → Result cached
- ✅ Second user asks same question → Gets cached answer (no API call)
- ✅ Cost savings tracked and displayed
- ✅ Users can vote on cached answers
- ✅ Low-quality answers flagged for review

---

## 📊 Cost Analysis

### **Current State**
- **Per chat session:** $0.10-0.30 (GPT-4 + embeddings)
- **No web search:** Can't answer many questions

### **With Perplexity (Unoptimized)**
- **Perplexity API:** $0.05 per search (sonar-pro)
- **100 users ask same question:** 100 × $0.05 = **$5.00**

### **With Caching (Optimized)**
- **First search:** $0.05 (Perplexity API)
- **Next 99 users:** $0.00 (cached)
- **Total:** **$0.05** (99% savings!)

### **Projected Monthly Costs**
Assume 1,000 active users, 10 questions/user/month = 10,000 questions

**Scenario 1: No caching**
- 10,000 × $0.05 = **$500/month** 😱

**Scenario 2: 80% cache hit rate**
- Unique questions: 2,000 × $0.05 = $100
- Cached hits: 8,000 × $0 = $0
- **Total: $100/month** ✅ (80% savings)

**Scenario 3: 95% cache hit rate (mature system)**
- Unique questions: 500 × $0.05 = $25
- Cached hits: 9,500 × $0 = $0
- **Total: $25/month** 🎉 (95% savings)

### **ROI Timeline**
- **Month 1:** High costs ($300-500) as cache builds
- **Month 2:** Costs drop 50% as common questions cached
- **Month 3+:** Costs stabilize at $25-50/month with 95% cache hit rate

---

## 🚀 Implementation Timeline

### **Week 1: Foundation**
- [x] Day 1-2: Conversation history (backend + frontend) ✅ **COMPLETED 2026-01-26**
  - [x] Database schema (chat_sessions)
  - [x] Backend API (messages array + chatSessionId)
  - [x] Conversation context processing
  - [x] System prompt enhancement
  - [x] Frontend conversation state
  - [x] Chat history UI (session-based)
  - [x] Token summarization logic
- [x] Day 3: Temperature adjustment + prompt engineering ✅ **COMPLETED 2026-01-26**
  - [x] Temperature: 0.0 → 0.6 (allows reasoning)
  - [x] Three-tier system prompt (manual → general → web)
  - [x] Confidence scoring function
  - [x] Updated ChatContext interface
- [ ] **NEXT:** Day 4-5: Testing & refinement (manual vs. general questions)

### **Week 2: Perplexity Integration**
- [ ] Day 1-2: Perplexity service + backend endpoint
- [ ] Day 3: Frontend "Search web" button
- [ ] Day 4-5: Database schema + caching logic

### **Week 3: Polish & Analytics**
- [ ] Day 1-2: User voting system
- [ ] Day 3: Cost tracking dashboard
- [ ] Day 4-5: Testing, bug fixes, documentation

---

## ✅ Success Metrics

### **User Experience**
- [ ] 90%+ of follow-up questions understood correctly
- [ ] <2 seconds average response time
- [ ] Clear source attribution on all answers

### **Cost Efficiency**
- [ ] <$100/month Perplexity costs by Month 2
- [ ] 80%+ cache hit rate by Month 3
- [ ] 95%+ cache hit rate by Month 6

### **Knowledge Growth**
- [ ] 100+ cached web search answers by Month 1
- [ ] 500+ cached answers by Month 3
- [ ] Avg 3+ cache hits per cached answer

### **Quality**
- [ ] 70%+ of cached answers upvoted
- [ ] <5% of cached answers flagged for review
- [ ] Manual sections remain primary source (>80% of answers)

---

## 🎯 Testing Plan

### **Phase 1: Conversation History** ✅ **PASSED**
```
Test 1: Follow-up questions ✅
- Ask: "What is flash code 207?"
- Ask: "How do I fix it?" ← Should understand "it" = code 207
- Ask: "What tools do I need?" ← Should remember context
RESULT: ✅ PASSED - AI correctly understands pronouns and references

Test 2: Multi-turn troubleshooting ✅
- Ask: "How do I check refrigerant levels?"
- Ask: "What if they're low?" ← Should understand "they" = refrigerant
RESULT: ✅ PASSED - Context sent: 2276 tokens, AI understood "they"

Test 3: Token limit handling ⏳
- Send 20 messages (force >8K tokens)
- Verify conversation gets summarized
- Verify AI still understands context
RESULT: ⏳ IMPLEMENTED (not yet tested at scale)
```

### **Phase 2: Hybrid Knowledge**
```
Test 4: Manual-specific questions
- Ask: "What is flash code 207 on Carrier 19XR?"
- Expect: Answer from manual, high confidence

Test 5: General HVAC questions
- Ask: "How does refrigerant work?"
- Expect: General knowledge answer, medium confidence, disclaimer

Test 6: General electrical questions
- Ask: "How do I use a multimeter to check voltage?"
- Expect: General knowledge answer, no manual sections needed

Test 7: Unanswerable questions
- Ask: "Are there recalls for this unit?"
- Expect: "Search web" button shown
```

### **Phase 3: Perplexity Fallback**
```
Test 8: Web search trigger
- Ask unanswerable question
- Click "Search web" button
- Verify Perplexity API called
- Verify sources displayed

Test 9: Cache verification
- First user: Trigger web search for "Carrier 19XR common problems"
- Second user: Ask same question
- Verify cached answer returned (no API call)
- Verify cost savings logged

Test 10: Source attribution
- Trigger web search
- Verify "🌐 Found on web" badge
- Verify Perplexity sources are clickable links
```

### **Phase 4: User Voting**
```
Test 11: Voting system
- Get web search answer
- Upvote answer
- Verify count increments
- Downvote 5 times
- Verify flagged for review
```

---

## 🔒 Future Enhancements (Post-MVP)

### **Rate Limiting**
```typescript
// Limit Perplexity searches per user
const dailyLimit = await redis.get(`perplexity:${userId}:${today}`);
if (dailyLimit >= 5) {
  throw new Error('Daily web search limit reached (5/day)');
}
```

### **Premium Tier**
- Free: 5 web searches/day
- Premium: Unlimited web searches
- Enterprise: Priority Perplexity (sonar-pro model)

### **Community Contributions**
- Users can submit their own fixes/tips
- Moderation workflow
- `source_type: 'community'` badge

### **Multi-Model Support**
- Fallback: GPT-4 → Claude → Perplexity
- Cost optimization based on question type

---

## 📝 Documentation Requirements

- [ ] API documentation for new endpoints
- [ ] Frontend component documentation
- [ ] Admin dashboard for cost monitoring
- [ ] User guide for "Search web" feature

---

## 🎉 Summary

This plan transforms the AI chat from a basic manual lookup to an intelligent, cost-effective troubleshooting assistant that:

1. **Remembers context** (last 10 messages)
2. **Thinks independently** (temperature 0.6, allows general knowledge)
3. **Falls back gracefully** (Perplexity as last resort)
4. **Learns over time** (caches web search results)
5. **Grows organically** (user voting, community knowledge)

**Key Principle:** Perplexity is expensive → Always search manual + use GPT knowledge first, web search only when user explicitly requests it.

**Timeline:** 2-3 weeks for full implementation
**Cost:** $25-50/month at scale (95% cache hit rate)
**ROI:** 95% cost savings vs uncached Perplexity

**Next Step:** Begin Phase 1 (Conversation History) implementation.
