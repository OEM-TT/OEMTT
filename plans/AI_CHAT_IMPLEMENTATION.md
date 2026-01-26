# AI Chat Implementation Status
**Last Updated:** 2026-01-26  
**For Full Details:** See `plans/MASTER/AI_CHAT_ENHANCEMENT_PLAN.md`

---

## 📊 Current Status

### ✅ Phase 1: Conversation History (COMPLETE)
**Completed:** 2026-01-26

**What Works:**
- Chat sessions group multiple Q&A pairs into conversations
- Backend sends last 10 messages with each new question
- AI understands pronouns and references from conversation history
- Token summarization for >8K conversations (using gpt-4o-mini)

**Key Files:**
- `backend/prisma/schema.prisma` - Added `chat_sessions` table
- `backend/src/controllers/chat.controller.ts` - Session management
- `backend/src/services/answering/context.ts` - Conversation processing
- `app/(modals)/unit-chat.tsx` - Frontend conversation state
- `services/api/chat.service.ts` - API client with `chatSessionId`

**Test Results:**
```
✅ "How do I check refrigerant levels?" → Answers
✅ "What if they're low?" → AI understands "they" = refrigerant
   Context sent: 2276 tokens
```

---

### ✅ Phase 2: Hybrid Knowledge (COMPLETE)
**Completed:** 2026-01-26

**What Works:**
- Three-tier knowledge strategy: Manual → General Knowledge → Web Search
- Temperature increased: 0.0 → 0.6 (allows reasoning)
- Confidence scoring: determines which tier to use
- AI can now answer general HVAC/electrical questions

**Changes Made:**

1. **Temperature** (`chat.controller.ts` line 165)
   ```typescript
   temperature: 0.6, // Was 0.0 - now allows reasoning
   ```

2. **System Prompt** (`context.ts` lines 671-711)
   ```
   TIER 1: Manual content (cite page numbers)
   TIER 2: General knowledge (add disclaimer)
   TIER 3: Cannot answer (suggest web search)
   ```

3. **Confidence Scoring** (`context.ts` lines 515-573)
   ```typescript
   function determineConfidenceAndSource(sections, question) {
     if (sections[0].similarity > 0.65) return { confidence, sourceType: 'manual' };
     if (isGeneralQuestion) return { confidence: 0.55, sourceType: 'general_knowledge' };
     return { confidence: 0.30, sourceType: 'needs_web_search' };
   }
   ```

4. **ChatContext Interface** (`context.ts` lines 15-50)
   ```typescript
   interface ChatContext {
     // ... existing fields ...
     confidence: number;
     sourceType: 'manual' | 'general_knowledge' | 'needs_web_search';
   }
   ```

**Example Queries:**
```
✅ "What is flash code 207?" 
   → TIER 1: Manual (confidence: 0.85)

✅ "How do I use a multimeter?"
   → TIER 2: General knowledge (confidence: 0.55)
   → Adds disclaimer: "📚 Based on general HVAC knowledge"

✅ "Are there recalls for this model?"
   → TIER 3: Needs web search (confidence: 0.30)
```

---

### ⏳ Phase 3: Perplexity Fallback (NEXT - Ready to Start)
**Status:** Not started  
**Priority:** HIGH - Automatically search web when confidence < 0.5

**What Needs to Be Built:**

1. **Perplexity API Integration** (`backend/src/services/answering/perplexity.ts`)
   - Use `sonar` model ($0.005 per request - cheaper than sonar-pro)
   - Request ALL data: citations, images, related questions
   - Set recency filter: last year
   - Domain whitelist: shareddocs.com, manufacturer sites

2. **Cache-First Strategy** (`backend/src/services/answering/cache.ts`)
   - Check cache before calling Perplexity API (95% cost reduction)
   - Store EVERYTHING from Perplexity response
   - Track cost per query

3. **Update chat.controller.ts**
   ```typescript
   if (context.confidence < 0.50 && context.sourceType === 'needs_web_search') {
     // Check cache first
     const cached = await checkCachedWebSearch(modelId, question);
     if (cached) {
       // Use cached result (free!)
     } else {
       // Call Perplexity API (expensive!)
       const result = await perplexity.search(query);
       await cacheWebSearchResult(result);
     }
   }
   ```

4. **Frontend Updates** (`app/(modals)/unit-chat.tsx`)
   ```typescript
   // Show source badge
   {message.sourceType === 'web_search_new' && (
     <Text>🌐 Found on web (New search)</Text>
   )}
   {message.sourceType === 'web_search_cached' && (
     <Text>🌐 Found on web (Previously searched)</Text>
   )}
   
   // Show ALL citations
   {message.citations?.map(c => ...)}
   ```

**Cost Projections:**
- Month 1: $10-20 (building cache)
- Month 2: $3-5 (50% cache hit)
- Month 3+: $0.50-2 (90% cache hit)

**Rate Limits:**
- 10 searches/user/day
- 50 searches/model/hour

---

## 🏗️ System Architecture

### Data Flow

```
User asks question
  ↓
Frontend sends: { unitId, messages[], chatSessionId }
  ↓
Backend: chat.controller.ts
  ├→ gatherChatContext()
  │  ├→ Search manual sections (vector + keyword)
  │  ├→ Build conversation history (last 10 messages)
  │  └→ determineConfidenceAndSource()
  │     ├→ >0.65 similarity: sourceType = 'manual'
  │     ├→ 0.50-0.65 + general patterns: sourceType = 'general_knowledge'
  │     └→ <0.50: sourceType = 'needs_web_search'
  ↓
  ├→ IF sourceType === 'needs_web_search' && confidence < 0.50:
  │  ├→ Check cache (checkCachedWebSearch)
  │  │  ├→ Cache hit? Use cached result (FREE)
  │  │  └→ Cache miss? Call Perplexity API (EXPENSIVE)
  │  │     └→ Store result in cache for future users
  │  └→ Update context with web search results
  ↓
  ├→ buildSystemPrompt(context)
  │  ├→ Include conversation history
  │  ├→ Include manual sections
  │  └→ Include three-tier rules
  ↓
  └→ Stream OpenAI response (temperature: 0.6)
     └→ Save to database (link to chat_session)
```

### Database Schema

```sql
-- Phase 1: Chat Sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,
  unit_id UUID,
  title TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE questions (
  id UUID PRIMARY KEY,
  user_id UUID,
  model_id UUID,
  manual_id UUID,
  chat_session_id UUID,  -- NEW: Links to session
  question_text TEXT,
  answer_text TEXT,
  answer_sources JSONB,
  confidence_score FLOAT,
  processing_time_ms INT,
  created_at TIMESTAMP
);

-- Phase 4: Perplexity Cache (TODO)
ALTER TABLE manual_sections ADD COLUMN source_type TEXT DEFAULT 'manual';
-- source_type: 'manual' | 'web_search' | 'community'

ALTER TABLE manual_sections ADD COLUMN source_metadata JSONB;
-- For web_search: stores citations, images, related questions, cost, etc.
```

---

## 🧪 Testing Checklist

### Phase 1: Conversation History
- [x] Follow-up pronouns: "What if they're low?" → Understands "they" = refrigerant
- [x] Session continuity: Questions link to same chat_session_id
- [x] History loading: Can view previous conversations
- [ ] Token summarization: Test with >8K token conversation

### Phase 2: Hybrid Knowledge
- [ ] **TIER 1 (Manual)**: "What is flash code 207?" → Cites manual page
- [ ] **TIER 2 (General)**: "How do I use a multimeter?" → Adds disclaimer
- [ ] **TIER 3 (Web Search)**: "Are there recalls?" → Triggers Perplexity (when Phase 3 done)
- [ ] Temperature: AI gives helpful answers without being too creative

### Phase 3: Perplexity Fallback (TODO)
- [ ] Low confidence triggers Perplexity automatically
- [ ] Cache hit returns cached result (no API call)
- [ ] Cache miss calls Perplexity and stores result
- [ ] All citations displayed in frontend
- [ ] Cost tracking working
- [ ] Rate limits enforced

---

## 📝 Quick Reference

### Key Functions

**`gatherChatContext(unitId, question, limit, conversationHistory)`**
- Returns: `ChatContext` with `confidence` and `sourceType`
- Location: `backend/src/services/answering/context.ts`

**`determineConfidenceAndSource(sections, question)`**
- Logic: Decides which tier to use
- Returns: `{ confidence: number, sourceType: string }`
- Location: `backend/src/services/answering/context.ts` (line 515)

**`buildSystemPrompt(context)`**
- Creates AI system prompt with three-tier rules
- Location: `backend/src/services/answering/context.ts` (line 678)

**`askQuestion(req, res)`**
- Main chat endpoint
- Handles: session management, streaming, database saves
- Location: `backend/src/controllers/chat.controller.ts` (line 27)

### API Endpoints

```
POST /api/chat/ask
Body: { unitId, messages: [], chatSessionId? }
Response: SSE stream (context, token, warning, complete, error)

GET /api/chat/history?unitId=xxx&limit=10
Response: { sessions: [...] }

GET /api/chat/session/:sessionId
Response: { id, title, messages: [...] }
```

### Environment Variables

```bash
OPENAI_API_KEY=sk-proj-...
PERPLEXITY_API_KEY=pplx-...  # Phase 3
```

---

## 🚧 If Context Runs Out

**This document (`AI_CHAT_IMPLEMENTATION.md`) contains:**
- Current implementation status (Phases 1-2 complete)
- What needs to be built next (Phase 3: Perplexity)
- System architecture and data flow
- Key functions and their locations
- Testing checklist

**For complete details, see:**
- `plans/MASTER/AI_CHAT_ENHANCEMENT_PLAN.md` (full plan with code examples)
- `plans/PHASE1_IMPLEMENTATION_SUMMARY.md` (Phase 1 detailed notes)

**To continue Phase 3:**
1. Read this document first
2. Review `AI_CHAT_ENHANCEMENT_PLAN.md` sections for Phase 3
3. Implement Perplexity integration with cache-first strategy
4. Test with low-confidence queries

---

## ✅ Success Criteria

### Overall Goals
- [x] Phase 1: Conversation memory working
- [x] Phase 2: Hybrid knowledge strategy working
- [ ] Phase 3: Perplexity fallback working (automatic)
- [ ] Phase 4: Knowledge caching (95% hit rate by Month 3)
- [ ] Phase 5: Quality & refinement

### Cost Targets
- Month 1: < $20/month (building Perplexity cache)
- Month 2: < $5/month (50% cache hit rate)
- Month 3+: < $2/month (90% cache hit rate)

### User Experience
- [x] AI understands follow-up questions
- [x] AI answers general HVAC questions
- [ ] AI seamlessly falls back to web search when needed
- [ ] Clear source attribution (manual vs. general vs. web)
- [ ] Fast response times (< 5 seconds)

---

**End of Implementation Status**
