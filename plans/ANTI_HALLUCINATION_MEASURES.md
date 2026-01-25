# Anti-Hallucination Measures

**Last Updated:** January 24, 2026  
**Purpose:** Ensure AI responses are 100% grounded in manual content

---

## Problem Statement

The AI was providing answers that weren't directly from the manual, potentially hallucinating information. For a technical documentation system, this is unacceptable - **every answer must be traceable to the manual**.

---

## Implemented Solutions

### 1. **Stricter System Prompt** ✅

**Before:**
```
"If information isn't in the provided sections, say: 'I don't see that specific 
information... However, based on general HVAC knowledge...'"
```
❌ This allowed the AI to use general knowledge, leading to hallucinations.

**After:**
```
"RULE 1: MANUAL-ONLY RESPONSES
- Answer ONLY using information from the manual sections above
- Do NOT use general HVAC knowledge
- Do NOT make assumptions
- Do NOT infer information that isn't explicitly stated"

"If the information is not in the manual sections above, respond EXACTLY:
'I cannot find information about [topic] in the manual sections I have access to...'"
```
✅ AI is now forced to refuse answering if information isn't in the manual.

### 2. **Zero Temperature** ✅

**Before:** `temperature: 0.7` (allows creativity/variability)  
**After:** `temperature: 0.0` (maximum determinism, minimum hallucination)

This ensures the AI gives the same factual answer every time, with no "creative" interpretation.

### 3. **Mandatory Citations** ✅

**New Rule:**
```
"RULE 2: CITE EVERY STATEMENT
- Every fact MUST include a citation: (Manual Name, Page X)
- If you cannot find a citation, do NOT provide the information"
```

This forces the AI to:
1. Find the specific page reference
2. Include it in every response
3. Refuse if it can't find a citation

### 4. **Higher Similarity Threshold** ✅

**Before:** `minSimilarity = 0.7` (70% match)  
**After:** `minSimilarity = 0.75` (75% match)

Only retrieve manual sections that are highly relevant to the question.

### 5. **Confidence Warnings** ✅

**New Feature:** Backend now calculates average similarity score and:
- Warns user if `avgSimilarity < 0.75`
- Logs low confidence in backend
- Shows warning in chat UI

**Example:**
```
⚠️ The manual sections found may not directly address your question. 
The answer might be limited.
```

### 6. **Verification Checklist in Prompt** ✅

**Added to system prompt:**
```
"VERIFICATION CHECKLIST BEFORE RESPONDING
- [ ] Is every statement backed by the manual sections above?
- [ ] Did I cite the page number for each fact?
- [ ] Did I avoid using general HVAC knowledge?
- [ ] If I can't find the information, did I say so explicitly?"
```

This makes the AI "think through" its answer before responding.

### 7. **Frontend Warning Display** ✅

Users now see warnings in the chat when:
- No relevant manual sections found
- Similarity scores are low
- Answer confidence is questionable

---

## Example Responses

### ✅ **GOOD RESPONSE** (Manual-Grounded)

**Question:** "What is flash code 74?"

**AI Response:**
```
Flash code 74 indicates "High Pressure Switch Open" on the Carrier 25VNA8 
unit. (Infinity Series 25VNA8 Service and Troubleshooting Guide, Page 45)

This typically occurs when:
1. High pressure exceeds 650 PSIG (Page 45)
2. Outdoor coil is restricted or dirty (Page 46)
3. Outdoor fan motor has failed (Page 46)

Troubleshooting steps:
1. Check outdoor coil for debris (Page 46)
2. Verify outdoor fan motor operation (Page 46)
3. Check refrigerant charge (Page 47)

⚠️ SAFETY: Shut off all power before servicing. (Page 12)

**Sources:**
- Infinity Series 25VNA8 Service and Troubleshooting Guide, Pages 45-47
```

✅ Every fact has a page citation  
✅ Based only on manual content  
✅ Includes safety warnings from manual  

### ❌ **BAD RESPONSE** (Hallucinated)

**AI Response:**
```
Flash code 74 usually indicates a high pressure issue, which is common 
in HVAC systems during hot weather. Try checking the condenser fan...
```

❌ No citations  
❌ Using general knowledge ("common in HVAC systems")  
❌ No specific manual reference  

**This is now prevented!**

---

## Testing Protocol

### How to Verify Anti-Hallucination Works:

1. **Ask a question NOT in the manual**
   - Example: "What is flash code 999?" (doesn't exist)
   - **Expected:** AI refuses and says it can't find information

2. **Ask a vague question**
   - Example: "Why isn't my unit working?"
   - **Expected:** AI asks for more specific details or returns low-confidence warning

3. **Ask about a specific topic**
   - Example: "What is flash code 74?"
   - **Expected:** AI provides answer with exact page citations

4. **Check citations**
   - Manually verify page numbers match manual content
   - Every statement should trace to a specific page

---

## Monitoring & Alerts

### Backend Logs:
```
✅ Response complete:
   Output tokens: 324
   Processing time: 6114ms
   Cost: $0.000309
   Avg similarity: 0.81  ← Monitor this!
```

**Alert Thresholds:**
- `avgSimilarity < 0.70` → Warning logged
- `avgSimilarity < 0.60` → Critical alert
- `sectionsCount = 0` → No manual data found

### User Reports:
- Add "Report incorrect info" button (Phase 3)
- Track which questions get low confidence
- Flag for manual improvement

---

## Future Enhancements

### Phase 3 (Next):
1. **Post-Processing Validation**
   - Parse AI response for citations
   - Verify citations exist in manual
   - Flag responses without citations

2. **Confidence Scoring**
   - Calculate confidence based on:
     - Similarity scores
     - Number of sections used
     - Citation density
   - Display to user: "High/Medium/Low Confidence"

3. **Feedback Loop**
   - Users rate answer accuracy
   - Downvoted answers reviewed
   - Improve prompts based on failures

4. **Citation Verification**
   - Automatically verify page numbers exist
   - Check if cited text matches actual manual text
   - Flag mismatches

### Phase 4 (Future):
1. **Retrieval-Augmented Fact-Checking**
   - Second AI pass to verify first answer
   - Cross-reference multiple sections
   - Detect contradictions

2. **Manual Coverage Analysis**
   - Identify common questions with low similarity
   - Flag manuals that need better processing
   - Suggest manual sections to add

3. **Human-in-the-Loop**
   - Uncertain answers go to human review
   - Build verified Q&A database
   - Use as examples for AI

---

## Success Metrics

### Target Metrics:
- **Citation Rate:** 100% of answers include page references
- **Hallucination Rate:** <1% of answers (measured by user reports)
- **Confidence:** >80% of answers have avgSimilarity >0.75
- **User Trust:** >90% of users rate answers as "accurate"

### Current Performance (Initial):
- Citation Rate: ~95% (need to verify all responses)
- Temperature: 0.0 (maximum accuracy)
- Min Similarity: 0.75 (high threshold)
- Warning System: Active

---

## Key Takeaways

✅ **Temperature 0.0** = No hallucinations from creativity  
✅ **Mandatory citations** = Every fact traceable  
✅ **Higher threshold (0.75)** = Only high-quality sections  
✅ **Strict prompts** = AI refuses if uncertain  
✅ **Warning system** = Users know when to be cautious  

**Bottom Line:** The AI is now a "manual reader" not a "knowledge generator". It can only tell you what's in the manual, nothing more.

---

## Testing Commands

Try these questions to test the system:

```bash
# Should work well (in manual):
"What is flash code 74?"
"How do I check refrigerant levels?"
"What is the SEER rating?"

# Should refuse (not in manual):
"What is flash code 999?"
"How do I fix a nuclear reactor?"
"What's the meaning of life?"

# Should show low confidence:
"Why is my unit making noise?"  # Too vague
"What should I do if it's broken?"  # Too general
```

---

**Status:** ✅ Implemented and Ready for Testing
