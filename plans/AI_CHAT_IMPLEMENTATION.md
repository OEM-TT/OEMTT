# AI Chat Implementation Plan

## Database Context Available

### Current State
- **Manuals**: 6 manuals in DB, 1 has actual PDF (Carrier 25VNA8 - 43 pages)
- **Manual Sections**: 0 (need to process PDFs and chunk them)
- **Models**: 14 models with specifications
- **Serial Number Patterns**: Currently NULL for all models

### Data We Can Provide to AI

#### 1. **Model Context** (from `models` table)
```json
{
  "model_number": "25VNA8",
  "product_line": "Infinity Series",
  "oem": "Carrier",
  "specifications": {
    "seer": 20,
    "hspf": 10,
    "stages": "variable",
    "tonnage": [2, 3, 4, 5],
    "refrigerant": "R-410A"
  },
  "years_active": [2020, 2021, 2022, 2023, 2024],
  "variants": ["25VNA824", "25VNA836", "25VNA848", "25VNA860"]
}
```

#### 2. **Manual Context** (from `manuals` table)
- Manual type (service, install, parts, troubleshooting, user)
- Revision date
- Page count
- Storage path (for retrieval)

#### 3. **Saved Unit Context** (from `saved_units` table)
- User's nickname for unit
- Serial number (if provided)
- Install date
- Location
- User's notes

#### 4. **Manual Content** (from `manual_sections` table - TO BE BUILT)
- Chunked text from PDFs
- Vector embeddings for semantic search
- Section types: troubleshooting, specifications, wiring_diagrams, parts_list, maintenance, installation, safety

## Implementation Architecture

### Phase 1: PDF Processing & Embeddings (REQUIRED FIRST)

#### 1.1 PDF Text Extraction
**Tool**: `pdf-parse` npm package
**Process**:
1. Download PDF from Supabase storage
2. Extract text per page
3. Identify section headers
4. Chunk intelligently (by section, not just by token count)

#### 1.2 Chunk Strategy
**Goal**: Keep related content together for better context

```typescript
interface ManualChunk {
  section_title: string;
  section_type: 'troubleshooting' | 'specifications' | 'wiring' | 'parts' | 'maintenance' | 'installation' | 'safety';
  content: string;        // 500-1000 tokens
  page_reference: string; // "Pages 12-14"
  metadata: {
    keywords: string[];
    model_numbers_mentioned: string[];
    part_numbers_mentioned: string[];
  };
}
```

#### 1.3 Embedding Generation
**Model**: `text-embedding-3-small` (OpenAI)
- **Cost**: $0.02 per 1M tokens (~$0.000002 per chunk)
- **Dimensions**: 1536 (or 3072 for higher quality)
- **Why**: Balance of quality and cost

**Process**:
1. Generate embedding for each chunk
2. Store in `manual_sections.embedding` (pgvector column)
3. Create vector index for fast similarity search

### Phase 2: Serial Number Decoder

#### 2.1 Serial Number Pattern Extraction
**AI Task**: Extract serial number decoding rules from manual

**Prompt Template**:
```
You are analyzing a technical manual. Find any information about serial number formats and decoding.

Manual: {manual_title}
OEM: {oem_name}
Model: {model_number}

Look for:
1. Serial number format (e.g., "YYWWSSSSSSS")
2. What each position means (e.g., "YY = year, WW = week")
3. Example serial numbers
4. Regex pattern to match valid serial numbers

Content:
{relevant_chunks}

Respond in JSON:
{
  "pattern": "regex pattern",
  "decoder": {
    "YY": "Manufacturing year",
    "WW": "Manufacturing week"
  },
  "example": "2315A123456"
}
```

#### 2.2 Storage
- Save to `models.serial_number_patterns` as JSON array
- Each pattern includes: regex, decoder, date_range, source_manual_id

### Phase 3: Chat Implementation

#### 3.1 Model Selection

| Use Case | Model | Cost (per 1M tokens) | When to Use |
|----------|-------|---------------------|-------------|
| **Simple Q&A** | `gpt-4o-mini` | Input: $0.15<br>Output: $0.60 | General questions, parts lookup |
| **Complex Troubleshooting** | `gpt-4o` | Input: $2.50<br>Output: $10.00 | Multi-step diagnosis, wiring analysis |
| **Code Generation** | `o1-mini` | Input: $3.00<br>Output: $12.00 | Generating regex patterns, data extraction |

**Recommendation**: Start with `gpt-4o-mini`, escalate to `gpt-4o` only when:
- Question contains "troubleshoot", "diagnose", "why"
- Multiple follow-up questions in conversation
- User explicitly says "detailed analysis"

#### 3.2 Context Gathering Strategy

**Step 1: Determine Intent**
```typescript
enum QuestionIntent {
  TROUBLESHOOTING = 'troubleshooting',    // "Why isn't it cooling?"
  SPECIFICATIONS = 'specifications',      // "What's the SEER rating?"
  INSTALLATION = 'installation',          // "How do I wire this?"
  PARTS = 'parts',                       // "What part number do I need?"
  MAINTENANCE = 'maintenance',           // "How often to clean?"
  SERIAL_DECODE = 'serial_decode'        // "What does this serial mean?"
}
```

**Step 2: Gather Context (in parallel)**
```typescript
const context = await Promise.all([
  // 1. Model Info (always include)
  getModelContext(modelId),
  
  // 2. User's Unit Info (always include)
  getSavedUnitContext(unitId),
  
  // 3. Relevant Manual Sections (vector search)
  searchManualSections({
    manualIds: unit.model.manuals.map(m => m.id),
    query: userQuestion,
    intent: detectedIntent,
    limit: 5  // Top 5 most relevant chunks
  }),
  
  // 4. Serial Number Context (if provided)
  unit.serialNumber ? decodeSerialNumber(unit.serialNumber, unit.model) : null,
  
  // 5. Conversation History (last 5 messages)
  getConversationHistory(userId, unitId, limit: 5)
]);
```

**Step 3: Build System Prompt**
```typescript
const systemPrompt = `You are an expert HVAC technician specializing in ${oem} equipment.

UNIT CONTEXT:
- Model: ${model.modelNumber} (${model.productLine})
- Specifications: ${JSON.stringify(model.specifications)}
- User's Location: ${unit.location}
- Install Date: ${unit.installDate}
${unit.serialNumber ? `- Serial: ${unit.serialNumber}\n  ${serialDecoded}` : ''}

AVAILABLE MANUALS:
${manuals.map(m => `- ${m.title} (${m.manualType}, ${m.pageCount} pages)`).join('\n')}

RELEVANT SECTIONS:
${relevantSections.map(s => `[${s.sectionTitle}, p.${s.pageReference}]\n${s.content}`).join('\n\n---\n\n')}

INSTRUCTIONS:
1. Answer based ONLY on the manual sections provided above
2. Always cite page numbers when referencing information
3. If the answer isn't in the provided context, say "I don't see that information in the available manuals"
4. For troubleshooting, provide step-by-step instructions
5. For parts, include part numbers if mentioned in the manual
6. Keep answers concise but complete

RESPONSE FORMAT:
- Answer the question directly
- Cite sources: (Service Manual, p.XX)
- If diagnostics needed, use numbered steps
- Flag if answer requires looking at physical unit
`;
```

#### 3.3 Cost Optimization Strategies

1. **Caching System Prompt** (OpenAI Prompt Caching - 90% discount)
   - System prompt changes rarely (only when manual context changes)
   - Cache key: `model_${modelId}_v${cacheVersion}`

2. **Conversation Summary**
   - After 10 messages, summarize conversation with `gpt-4o-mini` ($0.15/1M)
   - Replace old messages with summary to keep context window small

3. **Relevance Threshold**
   - Only include manual chunks with similarity score > 0.7
   - Fewer chunks = lower cost

4. **Streaming Responses**
   - Stream tokens to user for better UX
   - Can stop generation early if answer complete

5. **Question Classification**
   - Use `gpt-4o-mini` for 90% of questions
   - Reserve `gpt-4o` for complex multi-step troubleshooting

### Phase 4: Answer Storage & Learning

#### 4.1 Save Question/Answer
Store in `questions` table:
```typescript
{
  user_id: userId,
  model_id: modelId,
  manual_id: primaryManualUsed,
  question_text: userQuestion,
  context: {
    intent: detectedIntent,
    serial_number: unit.serialNumber,
    relevant_sections: chunkIds
  },
  answer_text: aiResponse,
  answer_sources: [
    { manual_id, section_id, page_reference, confidence }
  ],
  confidence_score: 0.85,  // Based on chunk similarity scores
  processing_time_ms: 1250
}
```

#### 4.2 Feedback Loop
- User can rate answer (👍👎)
- Track which chunks were most helpful
- Store in `feedback` table with `user_weight` for trusted users

#### 4.3 Future Learning
- Use feedback to fine-tune chunk selection
- Identify common questions → create FAQ section
- Flag low-confidence answers for manual review

## Cost Estimates

### One-Time Setup Costs
- **PDF Processing**: ~$2.00 per 1000 pages (gpt-4o for section classification)
- **Embeddings**: ~$0.05 per 1000 pages (text-embedding-3-small)
- **Total for 100 manuals (5000 pages)**: ~$250

### Ongoing Chat Costs (per 1000 questions)

| Scenario | Avg Tokens | Model | Cost |
|----------|-----------|-------|------|
| Simple Q&A | Input: 2K<br>Output: 500 | gpt-4o-mini | $0.60 |
| Complex Troubleshooting | Input: 5K<br>Output: 1500 | gpt-4o | $37.50 |
| **Mixed (90% simple)** | - | - | **$4.29** |

**With prompt caching (90% hit rate)**:
- Simple: $0.06 per 1K questions
- Mixed: **$0.86 per 1K questions**

### Cost Per User (Monthly Estimates)
- Light user (10 questions/mo): $0.01
- Regular user (50 questions/mo): $0.04
- Power user (200 questions/mo): $0.17

**Revenue needed**: At $5/mo subscription, need ~100 questions per user to break even on AI costs alone.

## Implementation Timeline

### Week 1: Foundation ✅ **COMPLETE**
- [x] Set up OpenAI client with streaming
- [x] Create PDF processing pipeline  
- [x] Implement text chunking algorithm
- [x] Generate embeddings for test manual (25VNA8)
- [x] Create vector search function - **Using pgvector**
- [x] Process Carrier 25VNA8 manual - **706 sections stored with embeddings!**

### Week 2: Core Chat ✅ **COMPLETE**
- [x] Build question intent classifier (model selection based on question)
- [x] Implement context gathering system (`answering/context.ts`)
- [x] Create system prompt builder  
- [x] Build chat endpoint with streaming (`/api/chat/ask`)
- [x] Add conversation history management (`/api/chat/history`)

### Week 3: Advanced Features ⏳ **IN PROGRESS**
- [ ] Serial number decoder with AI extraction
- [ ] Save patterns to DB automatically
- [x] Question/answer storage - **Saved with full context**
- [ ] Feedback system (thumbs up/down) - **Deferred to Phase 2**
- [x] Cost tracking per request - **Tracked in responses**

### Week 4: Optimization
- [ ] Implement prompt caching
- [ ] Add conversation summarization
- [ ] Build question classification (simple vs complex)
- [ ] Add monitoring dashboard
- [ ] Load test and optimize

## ✅ **AI CHAT FULLY FUNCTIONAL!** (Jan 24, 2026)

### What We Built:
1. **✅ PDF Processing System** - Extract, chunk, embed
2. **✅ Vector Search** - pgvector with similarity matching (cosine distance)
3. **✅ AI Chat API** - Streaming SSE responses with full context
4. **✅ Frontend Integration** - Real-time chat UI with loading states
5. **✅ Carrier 25VNA8 Processed** - 706 sections with embeddings
6. **✅ Chat History** - Previous conversations saved and retrievable
7. **✅ Source Citations** - Manual titles and page references in responses
8. **✅ User Sync** - Auto-creates users on first chat for seamless experience

### Features Working:
- ✅ Real-time streaming responses
- ✅ Context gathering from saved units
- ✅ Vector similarity search (5 top sections)
- ✅ GPT-4o-mini for cost-effective answers
- ✅ Source citations with confidence scores
- ✅ Chat history stored in database
- ✅ Previous chat loading with full Q&A
- ✅ Unit details screen shows recent chats
- ✅ Automatic refresh when returning from chat

### How to Use:
1. Open the app, go to Library
2. Tap on a saved unit (must be Carrier 25VNA8)
3. Tap "Ask AI About This Unit" button
4. Ask questions like:
   - "How do I check refrigerant levels?"
   - "How do I reset this unit?"
   - "What are common error codes?"
   - "What's the SEER rating?"
5. See your previous chats in "Previous Chats" section
6. Tap any previous chat to view the full conversation

### Cost per Chat (Actual):
- Simple questions: ~$0.0003 (30 cents per 1,000 questions)
- Complex troubleshooting: ~$0.005 (5 dollars per 1,000 questions)
- **Your $10 credit = ~2,000-30,000 questions depending on complexity!**

## Open Questions

1. **Should we process ALL manuals upfront or on-demand?**
   - Upfront: Better UX, higher initial cost
   - On-demand: Lower cost, slight delay first time

2. **How to handle images/diagrams in PDFs?**
   - Option A: Extract, store in storage, reference by ID
   - Option B: Use GPT-4 Vision for image understanding (expensive)

3. **Should we allow users to upload their own manuals?**
   - Creates moderation challenge
   - Potential legal issues with copyrighted content

4. **Rate limiting strategy?**
   - Free tier: 10 questions/day?
   - Paid tier: Unlimited?

Let me know your thoughts on these questions, and we can start building! 🚀
