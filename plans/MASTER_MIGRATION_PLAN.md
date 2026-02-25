# Master Migration Plan - Equipment Taxonomy & Manual Ingestion
## Date: February 16, 2026
## Status: Planning → Execution

---

## 🎯 OBJECTIVES

1. ✅ Add proper equipment taxonomy (categories/sub-categories)
2. ✅ Recategorize existing Carrier models from flat "Chillers" to proper categories
3. ✅ Add Trane OEM with complete category structure
4. ✅ Ingest all new manuals from OEMTT_MANUALS
5. ✅ Process, chunk, and embed new manual content
6. ✅ Update ingestion pipeline for new structure
7. ✅ Preserve all existing data (55,239 manual sections, 13 chat sessions, 29 questions)

---

## 📊 CURRENT STATE ANALYSIS

### Database Inventory
- **OEMs**: 1 (Carrier only)
- **Product Lines**: 1 ("Chillers" - flat structure)
- **Models**: 41 model numbers (some duplicates)
- **Manuals**: 70+ manuals
- **Manual Sections**: 55,239 (chunked & embedded)
- **Chat Sessions**: 13
- **Questions**: 29
- **User Impact**: Data MUST be preserved

### Misclassified Models (Currently labeled as "Chillers")
| Model | Actual Category | Manuals | Sections |
|-------|----------------|---------|----------|
| 4850FE-GE | RTU | 7 | 5,120 |
| 4850A | RTU | 3 | 4,158 |
| 4850FC-GC | RTU | 3 | 3,405 |
| 39M | AHU | 2 | 2,645 |
| 4850LC | RTU | 3 | 2,568 |
| 4850P | RTU | 1 | 2,529 |
| 4850HC | RTU | 3 | 1,903 |
| 38A | Split Condenser | 7 | 1,696 |
| 4850V | RTU | 3 | 1,163 |
| 4850K | RTU | 2 | 1,052 |
| 50W | WSHP (likely) | 1 | ? |
| **Total** | **Non-Chillers** | **35+** | **~26,000** |

### Actual Chillers (Correctly placed)
- 19DV, 19MV, 19XR-XRV (Carrier 19 series)
- 23XR-XRV (Carrier 23 series)  
- 30HXC-HXA, 30RAP, 30RB, 30RC, 30XA-XW, 30XV (Carrier 30 series)
- **Total**: ~20 models, ~29,000 sections

---

## 📁 OEMTT_MANUALS STRUCTURE (Source of Truth)

### Carrier Categories
```
CARRIER/
├── AHUs/                    (12 models: 39CC, 39DC, 39L, 39M, 40RFA, 40RFQ, 40RFS, 40RLA, 40RLQ, 40RLS, 40RUA, 40RUQ, 40RUS)
├── Chillers/
│   ├── Air-Cooled/         (New models to add)
│   └── Water-Cooled/       (Existing 19*, 23*, 30* series)
├── Controls Products/       (Empty currently)
├── DOAS/                    (4 models: 62H, 62L, 62W, 62X)
├── RTUs/                    (23 models: 48*, 50* series)
├── Split Condensers/        (11 models: 09*, 38* series)
└── WSHP/                    (5 models: 50PEC, 50VQP, 50WC, 50WD, 50WT)
```

### Trane Categories (NOT in database - needs full ingestion)
```
TRANE/
├── AHUs/                    (1 model: TWE)
├── Chillers/
│   ├── Air-Cooled/         (Multiple models)
│   └── Water-Cooled/       (Multiple models)
├── DOAS/                    (6 models: OABD, OABE, OABF, OADG, OANF, OANG)
├── IntelliPak/             (10+ models: SAHL, SEHK, SEHL, SFHK, SFHL, SLHK, SLHL, SSHL, SXHK, SXHL)
├── Mini-Split/             (TBD)
├── RTUs/                    (Multiple models: ECC, GDK, HAE, TC, TE, TZC, YC, YHJ)
├── Split Condensers/        (4 models: RAUC, RAUJ, RAUK, TTA, TWA)
└── VFDs/                    (6 models: AFDE, AFDJ, AFDK, AFDL, VFDA, VFDB)
```

### Other OEMs (Future consideration)
- ABB (VFDs)
- DAIKIN (Chillers)
- DANFOSS (Controls/VFDs)
- GOODMAN
- LENNOX
- ROCKWELL AUTOMATION (VFDs)
- YORK

---

## 🏗️ PHASE 1: DATABASE SCHEMA MIGRATION

### Step 1.1: Create Equipment Taxonomy Tables
```sql
-- equipment_categories table
CREATE TABLE equipment_categories (
  id TEXT PRIMARY KEY,
  oem_id TEXT REFERENCES oems(id),
  name TEXT NOT NULL,              -- e.g., "Chillers", "AHUs", "RTUs"
  slug TEXT NOT NULL,              -- e.g., "chillers", "ahus", "rtus"
  description TEXT,
  icon TEXT,
  display_order INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(oem_id, slug)
);

-- equipment_sub_categories table
CREATE TABLE equipment_sub_categories (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES equipment_categories(id),
  name TEXT NOT NULL,              -- e.g., "Air-Cooled", "Water-Cooled"
  slug TEXT NOT NULL,              -- e.g., "air-cooled", "water-cooled"
  description TEXT,
  display_order INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(category_id, slug)
);
```

### Step 1.2: Update Product Lines Table
```sql
-- Add sub_category_id to product_lines (nullable for backward compatibility)
ALTER TABLE product_lines 
ADD COLUMN sub_category_id TEXT REFERENCES equipment_sub_categories(id);

CREATE INDEX idx_product_lines_sub_category ON product_lines(sub_category_id);
```

### Step 1.3: Create Triggers
- `updated_at` triggers for both new tables

---

## 🔄 PHASE 2: CARRIER RECATEGORIZATION

### Step 2.1: Create Carrier Equipment Categories & Sub-Categories

#### Categories to Create:
1. **AHUs** (Air Handling Units)
2. **Chillers** (Existing, but add sub-categories)
   - Sub: Air-Cooled Chillers
   - Sub: Water-Cooled Chillers
3. **DOAS** (Dedicated Outdoor Air Systems)
4. **RTUs** (Rooftop Units)
5. **Split Condensers**
6. **WSHP** (Water Source Heat Pumps)

### Step 2.2: Create New Product Lines for Each Category
```
Current: 1 product_line ("Chillers")
After: 57+ product_lines (one per model family per sub-category)

Examples:
- "Carrier 19DV" → sub_category: "Water-Cooled Chillers"
- "Carrier 39M" → sub_category: "Commercial AHUs"
- "Carrier 48A" → sub_category: "Standard RTUs"
```

### Step 2.3: Recategorize Existing Models

#### RTUs (Move from "Chillers" to "RTUs")
- 4850A → 48A
- 4850FC-GC → 48FC, 48GC (split if needed)
- 4850FE-GE → 48FE, 48GE (split if needed)
- 4850HC → 48HC
- 4850K → 48K
- 4850LC → 48LC
- 4850P → 48P
- 4850V → 48V

**Action**: Update product_line_id to new RTU product line, preserve all manual associations

#### AHUs (Move from "Chillers" to "AHUs")
- 39M → Keep as 39M

**Action**: Update product_line_id to new AHU product line, preserve all manual associations

#### Split Condensers (Move from "Chillers" to "Split Condensers")
- 38A → Keep as 38A

**Action**: Update product_line_id to new Split Condenser product line, preserve all manual associations

#### Chillers (Keep but add sub-category)
- 19DV, 19MV, 19XR-XRV → Water-Cooled
- 23XR-XRV → Water-Cooled
- 30HXC-HXA, 30RAP, 30RB, 30RC, 30XA-XW, 30XV → Water-Cooled/Air-Cooled (verify)

**Action**: Update sub_category_id, preserve all manual associations

### Step 2.4: Handle Model Number Inconsistencies
- Database: "4850A" → Actual: "48A"
- **Decision**: Update to match OEMTT_MANUALS naming (48A, not 4850A)
- **Impact**: Update models table, preserve all foreign key relationships

### Step 2.5: Handle Duplicate Models
- Multiple records with same model_number (e.g., 19DV has 3 IDs)
- **Decision Required**: Consolidate or keep separate?
- **If Consolidate**: Merge manual associations, update foreign keys
- **If Keep**: Add variant/configuration field to distinguish

---

## 🆕 PHASE 3: TRANE OEM SETUP

### Step 3.1: Add Trane OEM
```sql
INSERT INTO oems (id, name, slug) VALUES (gen_random_uuid(), 'Trane', 'trane');
```

### Step 3.2: Create Trane Equipment Categories & Sub-Categories

#### Categories:
1. **AHUs**
2. **Chillers**
   - Sub: Air-Cooled Chillers
   - Sub: Water-Cooled Chillers
3. **DOAS**
4. **IntelliPak** (Packaged Rooftop Units with AHU functionality)
5. **RTUs**
6. **Split Condensers**
7. **VFDs** (Variable Frequency Drives)
8. **Mini-Split** (if needed)

### Step 3.3: Create Product Lines for Trane Models
- Parse OEMTT_MANUALS/TRANE/ structure
- Create product_line for each model family
- Link to appropriate sub_category_id

---

## 📥 PHASE 4: MANUAL INGESTION PIPELINE UPDATE

### Step 4.1: Update Ingestion Code Structure

#### Current Issues:
- Assumes flat OEM → Model structure
- No category/sub-category awareness
- Discovery system disabled (manual loading)

#### Required Updates:

**File**: `backend/src/services/ingestion/manualProcessor.ts`
- Add category/sub-category metadata to processing
- Update folder parsing logic for new structure

**File**: `backend/src/services/ingestion/bulkIngest.ts` (Create if doesn't exist)
- Parse OEMTT_MANUALS folder structure
- Extract: OEM → Category → Sub-Category → Model → PDFs
- Match against database taxonomy
- Identify new vs. existing models

**File**: `backend/src/services/ingestion/chunker.ts`
- Ensure chunking logic remains unchanged (preserve existing chunks)
- Add category metadata to chunks

### Step 4.2: Create Batch Processing Script

**File**: `scripts/ingestOEMTTManuals.ts` (New)
```typescript
// Pseudo-code structure:
1. Parse OEMTT_MANUALS folder
2. For each OEM:
   a. Verify OEM exists in DB
   b. For each Category:
      - Verify category exists, create if not
   c. For each Sub-Category:
      - Verify sub-category exists, create if not
   d. For each Model:
      - Check if model exists in DB
      - If exists: Check if manual already ingested (hash check)
      - If new: Create model, product_line, ingest manuals
3. Download PDF (if not local)
4. Extract text
5. Chunk text (using existing chunker)
6. Generate embeddings (OpenAI)
7. Store in manual_sections + Pinecone
8. Update manual status to 'active'
```

---

## 🔢 PHASE 5: MANUAL PROCESSING & CHUNKING

### Step 5.1: Identify New Manuals

**Carrier - New Models to Ingest**:
- AHUs: 39CC, 39DC, 39L, 40RFA, 40RFQ, 40RFS, 40RLA, 40RLQ, 40RLS, 40RUA, 40RUQ, 40RUS (11 new)
- Chillers/Air-Cooled: (Count from OEMTT_MANUALS)
- DOAS: 62H, 62L, 62W, 62X (4 new)
- RTUs: 50FC, 50FE, 50GC, 50GE, 50HC, 50J, 50K, 50LC, 50P, 50V (10 new, 48* series already in DB)
- Split Condensers: 09AZ, 09DP, 09RC, 38AK, 38AP, 38AR, 38AUD, 38AUQ, 38AUZ, 38AX, 38RC (11 new, 38A already in DB)
- WSHP: 50PEC, 50VQP, 50WC, 50WD, 50WT (5 new, except maybe 50W)
- **Estimated New Carrier Models**: 40+

**Trane - All New**:
- AHUs: 1 model
- Chillers: 8+ models
- DOAS: 6 models
- IntelliPak: 10+ models
- RTUs: 8+ models
- Split Condensers: 5 models
- VFDs: 6 models
- **Estimated New Trane Models**: 45+

**Total New Models to Ingest**: ~85 models
**Total New PDFs**: Estimated 200-300 manuals

### Step 5.2: Batch Processing Strategy

#### Option A: Sequential Processing
- Process one model at a time
- Pros: Safe, easy to debug, can monitor progress
- Cons: Slow (could take hours)
- **Recommended for initial run**

#### Option B: Parallel Processing
- Process multiple models simultaneously
- Pros: Fast
- Cons: Higher risk, harder to debug, rate limits
- **Use after initial run is proven**

### Step 5.3: Chunking Strategy
- Use existing chunker (preserve consistency)
- Chunk size: 1000 tokens (existing setting)
- Overlap: 200 tokens (existing setting)
- Preserve metadata: OEM, Category, Sub-Category, Product Line, Model, Manual Type, Page Number

### Step 5.4: Embedding Strategy
- OpenAI `text-embedding-3-large` (existing)
- Batch size: 100 chunks per request (rate limit consideration)
- Cost estimate: ~$0.13 per million tokens
- Estimated cost: $50-100 for all new manuals

### Step 5.5: Storage Strategy
- **Database**: manual_sections table (text + metadata)
- **Vector DB**: Pinecone (embeddings + metadata)
- **Files**: Supabase Storage buckets (original PDFs)

---

## ✅ PHASE 6: VALIDATION & TESTING

### Step 6.1: Schema Validation
- ✅ All tables created successfully
- ✅ Foreign key constraints working
- ✅ Indexes created
- ✅ Triggers functional

### Step 6.2: Data Migration Validation
- ✅ All existing models recategorized
- ✅ No orphaned records
- ✅ Manual associations preserved
- ✅ Chat sessions still linked
- ✅ Questions still linked

### Step 6.3: Ingestion Validation
- ✅ Sample model ingestion successful
- ✅ PDF extraction working
- ✅ Chunking producing correct output
- ✅ Embeddings generated
- ✅ Vector search working
- ✅ Manual sections stored correctly

### Step 6.4: Application Testing
- ✅ Frontend can display new categories
- ✅ Chat search works across all categories
- ✅ Model selection shows proper hierarchy
- ✅ Manual display works for new structure
- ✅ No breaking changes to existing features

---

## 📋 PHASE 7: EXECUTION CHECKLIST

### Pre-Flight Checks
- [ ] Backup production database
- [ ] Test migration on development branch
- [ ] Verify all SQL scripts
- [ ] Prepare rollback plan
- [ ] Document all changes

### Migration Execution Order
1. [ ] Create equipment taxonomy tables (Phase 1)
2. [ ] Create Carrier categories & sub-categories (Phase 2.1)
3. [ ] Create new Carrier product lines (Phase 2.2)
4. [ ] Recategorize existing Carrier models (Phase 2.3)
5. [ ] Fix model number inconsistencies (Phase 2.4)
6. [ ] Handle duplicate models (Phase 2.5)
7. [ ] Add Trane OEM (Phase 3.1)
8. [ ] Create Trane categories & sub-categories (Phase 3.2)
9. [ ] Create Trane product lines (Phase 3.3)
10. [ ] Update ingestion pipeline code (Phase 4)
11. [ ] Test with single manual (Phase 5)
12. [ ] Bulk ingest Carrier new models (Phase 5)
13. [ ] Bulk ingest Trane all models (Phase 5)
14. [ ] Validate all data (Phase 6)
15. [ ] Update frontend if needed (Phase 6)

### Post-Migration
- [ ] Verify manual counts match expectations
- [ ] Verify section counts match expectations
- [ ] Verify vector search quality
- [ ] Test chat functionality across all categories
- [ ] Monitor for errors
- [ ] Document final state

---

## 🎯 SUCCESS METRICS

### Database Structure
- ✅ 2 OEMs (Carrier, Trane)
- ✅ 12+ equipment categories
- ✅ 20+ equipment sub-categories
- ✅ 100+ product lines
- ✅ 120+ models
- ✅ All existing data preserved

### Manual Coverage
- ✅ 250+ manuals ingested
- ✅ 150,000+ manual sections
- ✅ All OEMTT_MANUALS processed
- ✅ No missing models
- ✅ All categories populated

### System Health
- ✅ No broken foreign keys
- ✅ No orphaned records
- ✅ Chat sessions functional
- ✅ Search quality maintained
- ✅ Response times acceptable

---

## 🚨 RISK MITIGATION

### High-Risk Operations
1. **Recategorizing existing models** - Could break foreign keys
   - Mitigation: Transaction-based updates, rollback on error
   
2. **Model number changes** (4850A → 48A) - Could break lookups
   - Mitigation: Update all references in single transaction
   
3. **Bulk ingestion** - Could hit rate limits, timeouts
   - Mitigation: Batch processing, retry logic, progress tracking

4. **Duplicate models** - Unclear consolidation strategy
   - Mitigation: Analysis first, user decision, then execute

### Medium-Risk Operations
1. **Creating new categories** - Naming conflicts
   - Mitigation: Unique constraints, slug-based lookups
   
2. **Vector DB sync** - Pinecone metadata updates
   - Mitigation: Match manual_sections updates exactly

### Low-Risk Operations
1. **Adding Trane OEM** - New data, no existing conflicts
2. **Creating taxonomy tables** - Additive only

---

## 📝 NEXT IMMEDIATE STEPS

1. **NOW**: Create and execute database migration SQL (Phase 1 & 2)
2. **NEXT**: Add Trane OEM and structure (Phase 3)
3. **THEN**: Update ingestion pipeline code (Phase 4)
4. **THEN**: Test single manual ingestion (Phase 5.1)
5. **FINALLY**: Bulk ingest all OEMTT_MANUALS (Phase 5.2)

**Estimated Total Time**: 4-6 hours
**Estimated Cost**: $50-100 (OpenAI embeddings)
**Estimated Sections Added**: ~100,000

---

## 🤝 READY TO PROCEED?

Awaiting confirmation to begin Phase 1: Database Schema Migration.
