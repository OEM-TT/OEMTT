# Equipment Category Schema Design
**Date:** February 17, 2026

## Current Structure Problems

1. **Flat Product Lines**: `product_lines.category` = "HVAC" is too generic
2. **No Equipment Taxonomy**: Can't distinguish Chillers from AHUs from RTUs
3. **No Sub-Categories**: Can't distinguish Air-Cooled vs Water-Cooled chillers
4. **Manual Organization**: Manuals are tied to models, but not to equipment hierarchy

## New Folder Structure (OEMTT_MANUALS)

```
OEM/
└── Equipment Type (Chillers, AHUs, RTUs, DOAS, VFDs, etc.)
    └── Sub-Category (Optional: Air-Cooled, Water-Cooled, etc.)
        └── Model Number/
            └── PDF files
```

### Examples:
```
CARRIER/
├── Chillers/
│   ├── Air-Cooled/
│   │   ├── 30RAP/
│   │   └── 30XA/
│   └── Water-Cooled/
│       ├── 17DA/
│       └── 30HXA/
├── AHUs/
│   ├── 39CC/
│   └── 39M/
├── RTUs/
│   ├── 48A/
│   └── 50GC/
└── DOAS/
    ├── 62H/
    └── 62L/

ABB/
└── HVACR/
    ├── ACH180/  (VFD model)
    └── ACH580-01/

TRANE/
├── Chillers/
├── RTUs/
└── VFDs/
    ├── AFDE/
    └── VFDA/
```

---

## Proposed New Schema

### Option 1: Add Equipment Category Tables (RECOMMENDED)

**New Tables:**

#### `equipment_categories`
```sql
CREATE TABLE equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,  -- "Chillers", "AHUs", "RTUs", "DOAS", "VFDs", etc.
  slug VARCHAR(100) NOT NULL UNIQUE,   -- "chillers", "ahus", "rtus", "doas", "vfds"
  description TEXT,
  icon_name VARCHAR(50),                -- For UI icons
  sort_order INTEGER,                   -- Display order
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `equipment_sub_categories`
```sql
CREATE TABLE equipment_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,          -- "Air-Cooled", "Water-Cooled", "Split System", etc.
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, slug)
);
```

**Modified Tables:**

#### Update `models` table
```sql
ALTER TABLE models 
  ADD COLUMN equipment_category_id UUID REFERENCES equipment_categories(id),
  ADD COLUMN equipment_sub_category_id UUID REFERENCES equipment_sub_categories(id);

-- Add indexes
CREATE INDEX idx_models_equipment_category ON models(equipment_category_id);
CREATE INDEX idx_models_equipment_sub_category ON models(equipment_sub_category_id);
```

**New Hierarchy:**
```
OEM
  └─ Equipment Category (Chillers, AHUs, RTUs)
      └─ Equipment Sub-Category (Air-Cooled, Water-Cooled) [OPTIONAL]
          └─ Product Line (AquaEdge, Infinity, General) [OPTIONAL]
              └─ Model (30XA, 19MV, 48LC)
                  └─ Manual
```

---

## Data Migration Strategy

### Step 1: Create Category Taxonomy

**Equipment Categories:**
```
1. Chillers (chillers)
2. Air Handling Units (ahus)
3. Rooftop Units (rtus)
4. Dedicated Outdoor Air Systems (doas)
5. Split Systems (split-systems)
6. Heat Pumps (heat-pumps)
7. Water Source Heat Pumps (wshp)
8. Variable Frequency Drives (vfds)
9. Controls & Sensors (controls)
10. Condensers (condensers)
```

**Sub-Categories (for Chillers):**
```
- Air-Cooled
- Water-Cooled
- Modular
- Screw
- Centrifugal
```

### Step 2: Parse OEMTT_MANUALS Folder Structure

**Algorithm:**
```typescript
for each OEM folder:
  for each Equipment Type folder:
    category = matchEquipmentCategory(folderName)
    
    if hasSubfolder (e.g., "Air-Cooled", "Water-Cooled"):
      sub_category = matchSubCategory(subfolderName)
      
      for each Model folder:
        model = createOrFindModel(modelNumber)
        model.equipment_category_id = category.id
        model.equipment_sub_category_id = sub_category?.id
        
        for each PDF:
          ingestManual(pdf, model)
    else:
      for each Model folder:
        model = createOrFindModel(modelNumber)
        model.equipment_category_id = category.id
        
        for each PDF:
          ingestManual(pdf, model)
```

### Step 3: Update Existing Models

For existing models in database (19MV, etc.), infer category from:
1. Manual titles (e.g., "Chiller Service Manual" → Chillers)
2. Model number patterns (e.g., "19MV" → Chillers, "48GC" → RTUs)
3. Product line names (e.g., "AquaEdge" → Chillers)

---

## API & Search Improvements

### New Search Filters
```typescript
GET /api/models/search?
  oem=Carrier
  &equipment_category=chillers
  &equipment_sub_category=water-cooled
  &model=19MV
```

### Browse by Category
```typescript
GET /api/equipment-categories
// Returns: ["Chillers", "AHUs", "RTUs", ...]

GET /api/equipment-categories/chillers/sub-categories
// Returns: ["Air-Cooled", "Water-Cooled", "Centrifugal"]

GET /api/equipment-categories/chillers/models?oem=Carrier
// Returns: All Carrier chiller models
```

---

## UI Improvements

### Category Tree Navigation
```
📂 Carrier
  📦 Chillers (12 models)
    ❄️ Air-Cooled (5 models)
      • 30RAP
      • 30XA
    💧 Water-Cooled (7 models)
      • 17DA
      • 19MV ← User's unit
      • 30HXA
  📦 RTUs (23 models)
    • 48GC
    • 50LC
```

---

## Benefits

1. ✅ **Organized Search**: Filter by equipment type
2. ✅ **Better UX**: Browse categories like eBay
3. ✅ **Accurate Matching**: No more "Carrier General" product lines
4. ✅ **Scalable**: Easy to add new categories (Mini-Splits, VRF, etc.)
5. ✅ **Data Quality**: Structured taxonomy prevents errors
6. ✅ **Analytics**: Track which equipment types are most searched
7. ✅ **Future-Proof**: Can add attributes per category (tonnage for chillers, CFM for AHUs)

---

## Implementation Order

1. ✅ Analyze folder structure
2. ✅ Design schema
3. ⏳ Create migration SQL
4. ⏳ Seed equipment categories
5. ⏳ Update ingestion pipeline
6. ⏳ Create batch processing script
7. ⏳ Test with 1-2 manuals
8. ⏳ Bulk ingest all OEMTT_MANUALS
9. ⏳ Update frontend (search, browse, display)
10. ⏳ Migrate existing models to new taxonomy

---

## Questions for User

1. Should we keep `product_lines` for branding (AquaEdge, Infinity)? Or merge into equipment categories?
2. Do we want to track VFD manufacturers separately (ABB, Danfoss, Rockwell)?
3. Should IntelliPak be its own category or a sub-category of RTUs?
4. Any other equipment types to add?
