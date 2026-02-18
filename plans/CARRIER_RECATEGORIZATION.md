# Carrier Model Recategorization Analysis
## Date: February 16, 2026

## Current Database Models (All incorrectly labeled as "Chillers")

### ✅ ACTUAL CHILLERS (Keep in Chillers category)
```
19DV (3 records)    → Chiller
19MV (1 record)     → Chiller  
19XR-XRV (1 record) → Chiller
23XR-XRV (1 record) → Chiller
30HXC-HXA (1 record)→ Chiller
30RAP (2 records)   → Chiller
30RB (2 records)    → Chiller
30RC (3 records)    → Chiller
30XA-XW (4 records) → Chiller
30XV (2 records)    → Chiller
```

### ❌ INCORRECTLY CATEGORIZED - Need Recategorization

#### 1. Air Handling Units (AHUs)
```
39M (2 records) → Should be: AHUs
```
- **Evidence**: OEMTT_MANUALS/CARRIER/AHUs/39M/ folder exists with 7 PDFs
- **Current Status**: Labeled as "Chillers"
- **Action**: Move to new "AHUs" equipment category

#### 2. Split Condensers
```
38A (2 records) → Should be: Split Condensers
```
- **Evidence**: OEMTT_MANUALS/CARRIER/Split Condensers/ has 38AK, 38AP, 38AR, 38AUD, 38AUQ, 38AUZ, 38AX, 38RC
- **Model 38A** is likely a variant or related to these 38A* models
- **Current Status**: Labeled as "Chillers"
- **Action**: Move to new "Split Condensers" equipment category

#### 3. Rooftop Units (RTUs)
```
4850A (2 records)    → Should be: RTUs (Model 48A)
4850FC-GC (3 records)→ Should be: RTUs (Model 48FC + 48GC)
4850FE-GE (2 records)→ Should be: RTUs (Model 48FE + 48GE)
4850HC (3 records)   → Should be: RTUs (Model 48HC)
4850K (2 records)    → Should be: RTUs (Model 48K)
4850LC (2 records)   → Should be: RTUs (Model 48LC)
4850P (1 record)     → Should be: RTUs (Model 48P)
4850V (1 record)     → Should be: RTUs (Model 48V)
```
- **Evidence**: OEMTT_MANUALS/CARRIER/RTUs/ folder contains:
  - 48A/, 48FC/, 48FE/, 48GC/, 48GE/, 48HC/, 48K/, 48LC/, 48P/, 48V/
- **Pattern**: Database has "4850" prefix, but actual models are "48" series
- **Current Status**: All labeled as "Chillers"
- **Action**: Move to new "RTUs" equipment category AND update model numbers

#### 4. Unknown - Needs Investigation
```
50W (1 record) → Could be: RTU or WSHP
```
- **Evidence**: 
  - OEMTT_MANUALS/CARRIER/RTUs/ has: 50FC, 50FE, 50GC, 50GE, 50HC, 50J, 50K, 50LC, 50P, 50V
  - OEMTT_MANUALS/CARRIER/WSHP/ has: 50PEC, 50VQP, 50WC, 50WD, 50WT
- **50W** doesn't directly match either, but **50WT** and **50WC/50WD** suggest WSHP
- **Likely**: WSHP (Water Source Heat Pump)
- **Current Status**: Labeled as "Chillers"
- **Action**: Investigate and move to appropriate category

## Summary of Recategorization

| Equipment Type | Models to Move | Count |
|----------------|----------------|-------|
| AHUs | 39M | 2 |
| Split Condensers | 38A | 2 |
| RTUs | 4850A, 4850FC-GC, 4850FE-GE, 4850HC, 4850K, 4850LC, 4850P, 4850V | 16 |
| WSHP (likely) | 50W | 1 |
| **Total Non-Chillers** | | **21 records** |
| **Actual Chillers** | All 19*, 23*, 30* series | **20 records** |

## Additional Issues

### Model Number Inconsistencies
- Database has "4850" prefix (e.g., "4850A", "4850FC-GC")
- Actual models are "48" series (e.g., "48A", "48FC")
- **Question**: Should we rename these in the database or keep as-is?

### Duplicate Model Records
Many models have multiple records with different IDs:
- 19DV: 3 records
- 30RAP: 2 records
- 30RB: 2 records
- 30RC: 3 records
- 30XA-XW: 4 records
- 38A: 2 records
- 39M: 2 records
- 4850A: 2 records
- 4850FC-GC: 3 records
- etc.

**Question**: Should we consolidate these or are they intentionally separate (different variants/configurations)?

## Required New Equipment Categories for Carrier

Based on OEMTT_MANUALS/CARRIER/ structure:

1. **AHUs** (Air Handling Units)
   - Sub-categories: (TBD based on tonnage/application)
   - Models: 39CC, 39DC, 39L, 39M, 40RFA, 40RFQ, 40RFS, 40RLA, 40RLQ, 40RLS, 40RUA, 40RUQ, 40RUS

2. **Chillers** (Existing, but needs sub-categories)
   - Sub-categories: Air-Cooled, Water-Cooled
   - Models: 19*, 23*, 30* series

3. **Controls Products** (Empty in OEMTT_MANUALS currently)

4. **DOAS** (Dedicated Outdoor Air Systems)
   - Models: 62H, 62L, 62W, 62X

5. **RTUs** (Rooftop Units)
   - Sub-categories: (TBD based on tonnage)
   - Models: 48*, 50* series

6. **Split Condensers**
   - Sub-categories: (TBD)
   - Models: 09*, 38* series

7. **WSHP** (Water Source Heat Pumps)
   - Models: 50PEC, 50VQP, 50WC, 50WD, 50WT

## Migration Strategy

### Option 1: Clean Slate (Recommended)
1. Create new equipment taxonomy
2. Backup existing data
3. Delete all current Carrier records
4. Re-ingest from OEMTT_MANUALS with proper categorization
5. **Pros**: Clean, accurate structure
6. **Cons**: Lose any user-generated data (chat history, etc.)

### Option 2: In-Place Recategorization
1. Create new equipment taxonomy
2. Update existing records with new category mappings
3. Fix model number inconsistencies
4. Consolidate duplicates
5. **Pros**: Preserve user data
6. **Cons**: Complex migration, risk of data inconsistency

## Recommendation
**Option 1** if chat/user data is not critical yet (early development).
**Option 2** if preserving existing data is important.
