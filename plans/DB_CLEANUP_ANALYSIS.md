# Database Cleanup Analysis
## Date: February 16, 2026

## Current Database State

### Summary
- **Total OEMs**: 1 (Carrier only)
- **Total Product Lines**: 1 (Chillers only)
- **Total Model Numbers**: 41 unique model numbers (some duplicates with different IDs)
- **Total Model Records**: 41
- **Issue**: Everything is categorized as "Chillers" under a flat product_line structure

### Current Carrier Models in DB (All under "Chillers" product line)
```
19DV (3 records, 4 manuals)
19MV (1 record, 5 manuals)
19XR-XRV (1 record, 5 manuals)
23XR-XRV (1 record, 3 manuals)
30HXC-HXA (1 record, 1 manual)
30RAP (2 records, 2 manuals)
30RB (2 records, 2 manuals)
30RC (3 records, 4 manuals)
30XA-XW (4 records, 5 manuals)
30XV (2 records, 2 manuals)
38A (2 records, 7 manuals)
39M (2 records, 2 manuals)
4850A (2 records, 3 manuals)
4850FC-GC (3 records, 3 manuals)
4850FE-GE (2 records, 7 manuals)
4850HC (3 records, 3 manuals)
4850K (2 records, 2 manuals)
4850LC (2 records, 3 manuals)
4850P (1 record, 1 manual)
4850V (1 record, 3 manuals)
50W (1 record, 1 manual)
```

## OEMTT_MANUALS Folder Structure (Source of Truth)

### Trane (NOT in database)
1. **Air Handling Units/**
   - CenTraVac/
   - IntelliPak/
   - Odyssey/
   - Voyager/

2. **Chillers/**
   - Ascend-Air-Cooled-Chiller-AGZ/
   - Ascend-Water-Cooled-Chiller-ACX/
   - CenTraVac-CVHE-CVHF-CVHG/
   - Sintesis-Air-Cooled-Chiller-RTAC/
   - Sintesis-Air-Cooled-Chiller-RTHD/
   - Sintesis-Air-Cooled-Modular-Chiller-CGAM/
   - Sintesis-Air-Cooled-Modular-Chiller-CXAM/
   - Sintesis-Water-Cooled-Chiller-CVGF/
   - Sintesis-Water-Cooled-Chiller-RTWD/
   - Trane-Model-R-Helical-Rotary-Liquid-Chiller-RTAA-RTWA/

3. **Packaged Units/**
   - Precedent/
   - Voyager-III/

4. **VFDs/**
   - Chiller-System-Control-Panel-CSCP-with-VFD/
   - Variable-Frequency-Drive-Panels-CVFP/

### Carrier (Existing in database, but may need reorganization)
- Need to compare with OEMTT_MANUALS/Carrier/ structure

## Problems Identified

### 1. Missing OEM: Trane
- Entire Trane catalog missing from database
- 4 equipment categories with multiple models

### 2. Flat "Chillers" Product Line
- Current DB has single "Chillers" product_line for all Carrier equipment
- No equipment category/sub-category structure
- Cannot distinguish between Air Handling Units, Chillers, Packaged Units, VFDs

### 3. Duplicate Model Records
- Multiple model records with same model_number
- Example: 19DV has 3 different model IDs
- Needs consolidation or explanation

### 4. Missing Equipment Taxonomy
- No `equipment_categories` table
- No `equipment_sub_categories` table
- Cannot properly organize equipment by type

## Required Actions

### Phase 1: Schema Migration
1. Create `equipment_categories` table
   - OEM → Equipment Category (e.g., Chillers, Air Handling Units, VFDs)
2. Create `equipment_sub_categories` table
   - Equipment Category → Sub-Category (e.g., Air-Cooled, Water-Cooled)
3. Update `product_lines` table
   - Add `sub_category_id` foreign key
   - Maintain backward compatibility
4. Create migration to reorganize existing Carrier data

### Phase 2: Data Migration
1. Categorize existing Carrier models from "Chillers" into proper categories
2. Handle duplicate model records
3. Verify manual associations remain intact

### Phase 3: Trane Ingestion
1. Add Trane OEM
2. Add all Trane equipment categories, sub-categories, product lines
3. Ingest all Trane manuals from OEMTT_MANUALS

### Phase 4: Carrier Completion
1. Add any new Carrier categories/models from OEMTT_MANUALS
2. Verify all existing Carrier models are properly categorized

## Next Steps
1. ✅ Analyze current database state
2. ✅ Document OEMTT_MANUALS structure
3. ⏳ Create database migration SQL
4. ⏳ Test migration on development branch
5. ⏳ Execute migration on production
6. ⏳ Update ingestion pipeline
7. ⏳ Bulk ingest OEMTT_MANUALS
