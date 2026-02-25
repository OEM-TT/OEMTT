# Perplexity Cost Tracking - Quick Summary

**Date**: February 19, 2026  
**Status**: ✅ Complete - Ready to Deploy

## What Was Implemented

✅ **Real-time cost tracking for every Perplexity API request**  
✅ **Token usage monitoring** (input/output tokens)  
✅ **Per-request cost calculation** based on actual usage  
✅ **Dashboard display** showing Perplexity costs separately  
✅ **Analytics separation** between OpenAI and Perplexity costs  

## Perplexity Pricing

- **Input**: $1.00 per 1M tokens
- **Output**: $1.00 per 1M tokens
- **Average cost per request**: $0.001-0.003

## Dashboard Updates

The Cost Analytics page now shows:

### Old Display:
- **Chat Costs**: All AI responses (mixed OpenAI + Perplexity)
- **Discovery Costs**: Perplexity searches (estimated)

### New Display:
- **Chat Costs (OpenAI)**: GPT-4o-mini responses only
- **Perplexity Costs**: Complete breakdown
  - Chat Fallback Requests: # of Perplexity chat responses
  - Chat Fallback Cost: $ actual cost from chat fallback
  - Manual Discovery Searches: # of manual searches
  - Manual Discovery Cost: $ from manual discovery
  - **Total Perplexity Cost**: Combined total
  - % of Total: Perplexity as % of all AI costs

## Files Modified

1. ✅ `backend/src/services/discovery/perplexity.ts`
   - Returns token usage and cost data

2. ✅ `backend/src/controllers/chat.controller.ts`
   - Saves Perplexity costs to database

3. ✅ `backend/src/controllers/analytics.controller.ts`
   - Separates OpenAI vs Perplexity costs
   - Provides detailed breakdown

4. ✅ `backend/src/public/dashboard.html`
   - Updated UI to display Perplexity cost breakdown

## How Costs Are Tracked

### 1. Perplexity Request (answerWithWebSearch):
```
User asks: "Is the Carrier 19XR still in production?"
    ↓
Perplexity API called
    ↓
Response includes: { usage: { prompt_tokens: 150, completion_tokens: 300 } }
    ↓
Calculate cost: (150 × $0.000001) + (300 × $0.000001) = $0.00045
```

### 2. Save to Database:
```typescript
await prisma.question.create({
  data: {
    questionText: "Is the Carrier 19XR still in production?",
    answerText: "...",
    inputTokens: 150,
    outputTokens: 300,
    totalTokens: 450,
    estimatedCost: 0.00045,
    context: {
      provider: 'perplexity', // ← This identifies it as Perplexity
      source: 'web_search',
    },
  },
});
```

### 3. Analytics Calculation:
```typescript
// Separate questions by provider
const openAIQuestions = questions.filter(q => 
  q.context?.provider !== 'perplexity'
);
const perplexityQuestions = questions.filter(q => 
  q.context?.provider === 'perplexity'
);

// Calculate costs
const openAICost = sum(openAIQuestions.estimatedCost);
const perplexityCost = sum(perplexityQuestions.estimatedCost);
```

## Testing

### 1. Trigger a Perplexity request:
Ask a question requiring web search:
- "Is the Carrier 19XR still in production?"
- "What's the warranty on this model?"
- "Any recent recalls for this unit?"

### 2. Check the database:
```sql
SELECT 
  question_text,
  input_tokens,
  output_tokens,
  estimated_cost,
  context->>'provider' as provider
FROM questions
WHERE context->>'provider' = 'perplexity'
ORDER BY created_at DESC
LIMIT 5;
```

### 3. View in Dashboard:
Navigate to: **Dashboard → Cost Analytics**

Look for:
- "Chat Fallback Requests" should show > 0
- "Chat Fallback Cost" should show $0.00XXX
- Total should include both OpenAI and Perplexity

## Cost Comparison Example

**100 user questions:**

| Provider | Questions | Avg Cost | Total Cost |
|----------|-----------|----------|------------|
| **OpenAI (GPT-4o-mini)** | 70 | $0.001275 | $0.08925 |
| **Perplexity (Sonar)** | 30 | $0.001200 | $0.03600 |
| **Combined** | 100 | - | **$0.12525** |

**Cost per user**: $0.00125 per question

## Benefits

1. ✅ **Accurate attribution**: Know exactly what Perplexity costs vs OpenAI
2. ✅ **Budget forecasting**: Predict costs based on real usage
3. ✅ **Cost optimization**: Identify expensive patterns
4. ✅ **Per-user tracking**: See which users cost the most
5. ✅ **ROI analysis**: Determine if Perplexity fallback is worth it

## Next Steps

1. **Deploy to production** (restart backend server)
2. **Monitor for 7 days** to establish baseline costs
3. **Compare OpenAI vs Perplexity usage patterns**
4. **Adjust confidence thresholds** if needed to optimize cost/quality balance

## Deployment

No new environment variables required! Just restart the backend:

```bash
cd backend
npm run dev  # or your production command
```

The system will automatically start tracking Perplexity costs for all new requests.

---

**📊 View Costs**: http://localhost:3000/dashboard → Cost Analytics tab
