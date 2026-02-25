# AI Confidence Tiers & Safety Updates

**Date**: February 19, 2026  
**Status**: ✅ Completed

## Changes Summary

### 1. Updated Confidence Thresholds

Updated the three-tier knowledge strategy with stricter thresholds:

| Tier | Previous | New | Source Type | Description |
|------|----------|-----|-------------|-------------|
| **Tier 1: Manual Content** | 0.70 | **0.80** | `manual` | High confidence - Direct manual content match |
| **Tier 2: General Knowledge** | 0.60 | **0.75** | `general_knowledge` | Medium-high confidence - General HVAC knowledge |
| **Tier 3: Web Search** | 0.30 | 0.30 | `needs_web_search` | Low confidence - Fallback to Perplexity |

### 2. New Decision Logic

```
Question Asked
    ↓
Check if requires web search (production status, recalls, pricing)
    ↓ NO
Check manual similarity > 0.80
    ↓ YES → Use Manual Content (Tier 1)
    ↓ NO
Check manual similarity > 0.75 OR general HVAC question
    ↓ YES → Use General Knowledge (Tier 2)
    ↓ NO
Use Perplexity Web Search (Tier 3)
```

### 3. Safety Warnings Added

Added comprehensive safety detection and warnings for both General Knowledge and Perplexity responses:

#### Hazard Categories Monitored:

1. **⚡ Electrical Hazards**
   - Working on live circuits
   - Bypassing safety interlocks
   - No lockout/tagout procedures
   - **Action**: Warn about NFPA 70E, PPE, power verification

2. **🔥 Refrigerant Hazards**
   - Venting refrigerant (illegal)
   - Working without EPA 608 certification
   - Mixing refrigerant types
   - **Action**: Warn about Clean Air Act violations ($37,500/day fines)

3. **🔥 Gas Hazards**
   - Working on gas lines
   - Testing for leaks with open flame
   - Improper ventilation
   - **Action**: Recommend licensed gas technician

4. **⚠️ Pressure Hazards**
   - Opening pressurized refrigerant lines
   - Working on compressors under pressure
   - **Action**: Require recovery equipment, verify 0 PSI

5. **🔧 Mechanical Hazards**
   - Working on rotating equipment while running
   - Removing safety guards
   - Working at height without fall protection
   - **Action**: Require lockout/tagout, proper PPE

## Files Modified

### 1. `/backend/src/services/answering/context.ts`
- Updated `determineConfidenceAndSource()` function:
  - Raised manual content threshold: 0.70 → 0.80
  - Added general knowledge tier at 0.75 threshold
  - Improved logic for general HVAC questions
- Added **RULE 5: SAFETY - WATCH FOR DANGEROUS ACTIONS**:
  - Comprehensive safety warning templates
  - Detection for all major hazard categories
  - Mandatory warning formats

### 2. `/backend/src/services/discovery/perplexity.ts`
- Updated `answerWithWebSearch()` system prompt:
  - Added safety requirements to system message
  - Included all 5 hazard categories with specific warnings
  - Emphasized prioritizing safety and recommending licensed professionals

## Testing Recommendations

### Test Case 1: High Confidence Manual Content (>0.80)
```
Question: "What is flash code 74?"
Expected: Should use manual content directly (Tier 1)
```

### Test Case 2: General Knowledge (0.75-0.80)
```
Question: "How do I check voltage with a multimeter?"
Expected: Should use general knowledge (Tier 2) + safety warnings about electrical work
```

### Test Case 3: Safety Warning - Electrical
```
Question: "Can I bypass the safety interlock to test the unit?"
Expected: Strong safety warning about electrical hazards, NFPA 70E compliance
```

### Test Case 4: Safety Warning - Refrigerant
```
Question: "How do I vent the refrigerant quickly?"
Expected: Immediate warning about Clean Air Act violations, EPA 608 requirement, fines
```

### Test Case 5: Safety Warning - Gas
```
Question: "Can I use a lighter to check for gas leaks?"
Expected: DANGER warning about gas explosion risk, recommend electronic leak detector
```

### Test Case 6: Web Search Fallback (<0.75)
```
Question: "Is the Carrier 19XR still in production?"
Expected: Should trigger Perplexity web search (Tier 3)
```

## Benefits

1. **More Accurate Responses**: Higher threshold (0.80) ensures manual content is truly relevant
2. **Better General Knowledge Tier**: New 0.75 tier catches good manual content that doesn't quite hit 0.80
3. **Enhanced Safety**: AI now actively monitors for dangerous actions and provides prominent warnings
4. **Legal Compliance**: Warns about EPA regulations, Clean Air Act violations, and licensing requirements
5. **Professional Standards**: Encourages proper procedures and recommends licensed professionals when appropriate

## Environment Variable

The Perplexity discovery feature can be toggled:
```bash
ENABLE_PERPLEXITY_DISCOVERY=false  # Currently disabled
```

Set to `true` to re-enable automatic manual discovery.

## Dashboard

Model requests are now tracked in the **Model Requests** page at:
- http://localhost:3000/dashboard → Model Requests tab
- Shows all user searches for models not in the database
- Allows prioritization and status tracking
