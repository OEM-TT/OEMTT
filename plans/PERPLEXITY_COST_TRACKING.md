# Perplexity Cost Tracking Implementation

**Date**: February 19, 2026  
**Status**: ✅ Completed

## Overview

Implemented comprehensive cost tracking for Perplexity API requests, including token usage monitoring and cost calculations for both manual discovery and AI chat fallback scenarios.

## Perplexity API Pricing

**Model**: `sonar` (Fast, real-time web search model)

| Metric | Cost |
|--------|------|
| **Input Tokens** | $1.00 per 1M tokens |
| **Output Tokens** | $1.00 per 1M tokens |
| **Average Request** | ~$0.001-0.003 per request |

> **Note**: Perplexity pricing is significantly lower than OpenAI's GPT-4 models, making it cost-effective for web search fallback scenarios.

## Implementation Details

### 1. Updated Perplexity Service

**File**: `backend/src/services/discovery/perplexity.ts`

#### Changes:
- Updated `answerWithWebSearch()` return type to include usage data:
  ```typescript
  interface PerplexityResponse {
    answer: string;
    sources: string[];
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
    };
  }
  ```

- Extracts token usage from Perplexity API response:
  ```typescript
  const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  ```

- Calculates cost using Perplexity pricing:
  ```typescript
  const INPUT_COST_PER_TOKEN = 1.0 / 1_000_000;  // $1 per 1M input tokens
  const OUTPUT_COST_PER_TOKEN = 1.0 / 1_000_000; // $1 per 1M output tokens
  const cost = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);
  ```

- Logs cost information for monitoring:
  ```typescript
  console.log(`💰 Tokens: ${inputTokens} in + ${outputTokens} out = ${totalTokens} total ($${cost.toFixed(6)})`);
  ```

### 2. Updated Chat Controller

**File**: `backend/src/controllers/chat.controller.ts`

#### Changes:
- Saves Perplexity token usage and cost to database when creating question records:
  ```typescript
  await prisma.question.create({
    data: {
      // ... other fields
      inputTokens: webResult.usage.inputTokens,
      outputTokens: webResult.usage.outputTokens,
      totalTokens: webResult.usage.totalTokens,
      estimatedCost: webResult.usage.cost,
      context: {
        source: 'web_search',
        confidence: context.confidence,
        provider: 'perplexity', // NEW: Identifies this as Perplexity
      },
    },
  });
  ```

- Includes cost in SSE completion event:
  ```typescript
  sendEvent('complete', {
    sessionId: sessionId,
    totalTokens: webResult.usage.totalTokens,
    cost: webResult.usage.cost, // NEW: Send cost to frontend
    source: 'web_search',
    sources: webResult.sources.slice(0, 3),
  });
  ```

### 3. Updated Analytics Controller

**File**: `backend/src/controllers/analytics.controller.ts`

#### Changes Made:

1. **Separated OpenAI and Perplexity Questions**:
   ```typescript
   const openAIQuestions = questions.filter(q => {
     const ctx = q.context as any;
     return !ctx || !ctx.provider || ctx.provider !== 'perplexity';
   });
   const perplexityQuestions = questions.filter(q => {
     const ctx = q.context as any;
     return ctx && ctx.provider === 'perplexity';
   });
   ```

2. **Calculate Separate Costs**:
   ```typescript
   const openAICost = openAIQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
   const perplexityChatCost = perplexityQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
   const perplexityDiscoveryCost = searches.length * PERPLEXITY_COST_PER_SEARCH; // Legacy manual discovery
   const totalPerplexityCost = perplexityChatCost + perplexityDiscoveryCost;
   ```

3. **Per-User Cost Breakdown**:
   ```typescript
   const userOpenAICost = userOpenAIQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
   const userPerplexityChatCost = userPerplexityQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
   const userPerplexityDiscoveryCost = user.searches.length * PERPLEXITY_COST_PER_SEARCH;
   const userPerplexityTotalCost = userPerplexityChatCost + userPerplexityDiscoveryCost;
   ```

4. **Enhanced Analytics Response**:
   ```typescript
   discovery: {
     totalSearches,
     perplexityCost: discoveryCost, // Total Perplexity cost
     perplexityChatCost: perplexityChatCost, // Chat fallback only
     perplexityDiscoveryCost: perplexityDiscoveryCost, // Manual discovery only
     perplexityChatQuestions: perplexityQuestions.length,
     avgCostPerSearch: PERPLEXITY_COST_PER_SEARCH,
     percentOfTotal: totalCost > 0 ? (discoveryCost / totalCost) * 100 : 0,
   }
   ```

## Database Schema

The existing `questions` table already supports cost tracking:

```prisma
model Question {
  // ... other fields
  inputTokens      Int?           @map("input_tokens")
  outputTokens     Int?           @map("output_tokens")
  totalTokens      Int?           @map("total_tokens")
  estimatedCost    Float?         @map("estimated_cost")
  context          Json?          // Includes { provider: 'perplexity' }
}
```

## Dashboard Display

### Cost Breakdown by Provider:

| Provider | Source | Purpose | Dashboard Label |
|----------|--------|---------|----------------|
| **OpenAI** | GPT-4o-mini | Manual + General Knowledge responses | "Chat Cost" |
| **Perplexity (Chat)** | Sonar | AI chat web search fallback | "Perplexity Chat Cost" |
| **Perplexity (Discovery)** | Sonar | Manual discovery searches | "Perplexity Discovery Cost" |

### Analytics Endpoints:

1. **`GET /api/analytics/overview`**:
   - Returns `costs.today` and `costs.total`
   - Includes both OpenAI and Perplexity costs combined

2. **`GET /api/analytics/costs`**:
   - Detailed breakdown:
     - `overview.chatCost` (OpenAI only)
     - `overview.discoveryCost` (All Perplexity)
     - `discovery.perplexityChatCost` (Chat fallback)
     - `discovery.perplexityDiscoveryCost` (Manual discovery)
     - `discovery.perplexityChatQuestions` (Number of Perplexity chat responses)
   - Per-user costs with provider breakdown

## Cost Comparison

### Example Scenario: 100 User Questions

| Model | Input Tokens | Output Tokens | Total Cost | Cost per Question |
|-------|--------------|---------------|------------|-------------------|
| **GPT-4o-mini** | 50K | 200K | $0.1275 | $0.001275 |
| **Perplexity Sonar** | 40K | 80K | $0.120 | $0.001200 |

**Savings**: ~6% cost reduction when using Perplexity for web-based questions

### Monthly Cost Projection (1,000 users)

Assuming:
- 10 questions/user/month
- 70% OpenAI responses (7 questions)
- 30% Perplexity responses (3 questions)

| Component | Questions | Avg Cost | Monthly Total |
|-----------|-----------|----------|---------------|
| OpenAI Chat | 7,000 | $0.001275 | $8.93 |
| Perplexity Chat | 3,000 | $0.001200 | $3.60 |
| **Total** | 10,000 | - | **$12.53** |

**Cost per active user**: $0.01253/month

## Monitoring

### Key Metrics to Watch:

1. **Perplexity Usage Rate**: `perplexityChatQuestions / totalQuestions`
   - Target: 20-30% (indicates proper fallback thresholds)
   - High (>50%): May need to adjust confidence thresholds
   - Low (<10%): Manual content may be insufficient

2. **Average Cost per Perplexity Request**:
   - Target: $0.001-0.002
   - Monitor for unexpected spikes

3. **Cost Distribution**:
   - OpenAI vs Perplexity ratio
   - Ensure Perplexity is used appropriately for web-based questions

4. **Per-User Monthly Costs**:
   - Monitor high-usage outliers
   - Adjust subscription pricing accordingly

## Testing

### Test Perplexity Cost Tracking:

1. **Trigger Perplexity Fallback**:
   ```bash
   # Ask a question requiring web search
   curl -X POST http://localhost:3000/api/chat/ask \
     -H "Content-Type: application/json" \
     -d '{
       "question": "Is the Carrier 19XR still in production?",
       "unitId": "your-unit-id"
     }'
   ```

2. **Check Question Record**:
   ```sql
   SELECT 
     question_text,
     input_tokens,
     output_tokens,
     total_tokens,
     estimated_cost,
     context
   FROM questions
   WHERE context->>'provider' = 'perplexity'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Check Analytics**:
   ```bash
   curl http://localhost:3000/api/analytics/costs
   ```

   Look for:
   - `discovery.perplexityChatCost` > 0
   - `discovery.perplexityChatQuestions` > 0

## Benefits

1. **✅ Accurate Cost Attribution**: Know exactly how much Perplexity costs vs OpenAI
2. **✅ Per-User Tracking**: Identify high-cost users and adjust pricing
3. **✅ ROI Analysis**: Determine if Perplexity fallback is cost-effective
4. **✅ Budget Forecasting**: Predict monthly costs based on usage patterns
5. **✅ Optimization Opportunities**: Identify which questions trigger expensive responses

## Next Steps

1. **Add Dashboard Visualizations**:
   - Pie chart showing OpenAI vs Perplexity cost distribution
   - Time series showing Perplexity usage trend
   - Cost per provider breakdown in user details

2. **Cost Alerts**:
   - Set up alerts for unusual cost spikes
   - Monitor daily/monthly cost thresholds

3. **A/B Testing**:
   - Test different confidence thresholds
   - Measure impact on cost and answer quality

## Environment Variables

No new environment variables required. Perplexity cost tracking uses the existing:
```bash
PERPLEXITY_API_KEY=your_api_key_here
```

## Deployment Checklist

- [x] Update Perplexity service to return usage data
- [x] Update chat controller to save Perplexity costs
- [x] Update analytics to separate OpenAI and Perplexity costs
- [x] Test Perplexity cost tracking in development
- [ ] Deploy to production
- [ ] Monitor cost metrics for 7 days
- [ ] Update dashboard UI to display Perplexity costs
- [ ] Document cost trends in monthly reports

---

**Related Docs**:
- [AI Confidence Tiers & Safety Updates](./AI_CONFIDENCE_AND_SAFETY_UPDATE.md)
- [Perplexity Discovery Toggle](./PERPLEXITY_DISCOVERY_TOGGLE.md)
