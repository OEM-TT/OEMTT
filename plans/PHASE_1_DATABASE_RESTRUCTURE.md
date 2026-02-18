# Phase 1: Database Restructuring Plan
## Date: February 17, 2026
## Goal: Restructure existing data to match new equipment taxonomy (NO new manual ingestion)

---

## 🎯 OBJECTIVES

1. ✅ Create equipment taxonomy tables (categories/sub-categories)
2. ✅ Create all necessary categories for Carrier and Trane
3. ✅ Recategorize existing Carrier models into proper categories
4. ✅ Fix model number inconsistencies (4850A → 48A)
5. ✅ Preserve ALL existing data (55,239 sections, chat sessions, embeddings)
6. ✅ Validate structure is ready for Phase 2 (manual uploads)

**NO MANUAL INGESTION IN THIS PHASE** - That comes in Phase 2 with the dashboard interface

---

## 📊 CURRENT STATE

### Database Facts
- **OEMs**: 1 (Carrier)
- **Product Lines**: 1 (flat "Chillers")
- **Models**: 41 models (all labeled as "Chillers")
- **Manuals**: ~70 manuals
- **Manual Sections**: 55,239 (must preserve)
- **Chat Sessions**: 13 (must preserve)
- **Questions**: 29 (must preserve)

### Misclassified Models (Currently all labeled as "Chillers")

| Model | Actual Type | Manuals | Sections | Action |
|-------|-------------|---------|----------|--------|
| **RTUs (Rooftop Units)** |
| 4850A | RTU | 3 | 4,158 | Move + Rename to 48A |
| 4850FC-GC | RTU | 3 | 3,405 | Move + Rename to 48FC/48GC |
| 4850FE-GE | RTU | 7 | 5,120 | Move + Rename to 48FE/48GE |
| 4850HC | RTU | 3 | 1,903 | Move + Rename to 48HC |
| 4850K | RTU | 2 | 1,052 | Move + Rename to 48K |
| 4850LC | RTU | 3 | 2,568 | Move + Rename to 48LC |
| 4850P | RTU | 1 | 2,529 | Move + Rename to 48P |
| 4850V | RTU | 3 | 1,163 | Move + Rename to 48V |
| **AHUs (Air Handling Units)** |
| 39M | AHU | 2 | 2,645 | Move to AHU category |
| **Split Condensers** |
| 38A | Split Condenser | 7 | 1,696 | Move to Split Condenser |
| **Unknown (Needs Investigation)** |
| 50W | RTU or WSHP? | 1 | ? | Determine + Move |
| **Actual Chillers (Keep)** |
| 19DV, 19MV, 19XR-XRV | Chiller | Multiple | ~8,000 | Add sub-category |
| 23XR-XRV | Chiller | 3 | 2,421 | Add sub-category |
| 30HXC-HXA, 30RAP, 30RB, 30RC, 30XA-XW, 30XV | Chiller | Multiple | ~20,000 | Add sub-category |

---

## 🏗️ MIGRATION STEPS

### Step 1: Create Taxonomy Tables

```sql
-- Create equipment_categories table
CREATE TABLE IF NOT EXISTS equipment_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  oem_id TEXT NOT NULL REFERENCES oems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(oem_id, slug)
);

CREATE INDEX idx_equipment_categories_oem ON equipment_categories(oem_id);
CREATE INDEX idx_equipment_categories_slug ON equipment_categories(slug);

-- Create equipment_sub_categories table
CREATE TABLE IF NOT EXISTS equipment_sub_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id TEXT NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_equipment_sub_categories_category ON equipment_sub_categories(category_id);
CREATE INDEX idx_equipment_sub_categories_slug ON equipment_sub_categories(slug);

-- Add sub_category_id to product_lines (nullable for backward compatibility)
ALTER TABLE product_lines 
ADD COLUMN IF NOT EXISTS sub_category_id TEXT REFERENCES equipment_sub_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_lines_sub_category ON product_lines(sub_category_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_equipment_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_categories_updated_at
  BEFORE UPDATE ON equipment_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_categories_updated_at();

CREATE OR REPLACE FUNCTION update_equipment_sub_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_sub_categories_updated_at
  BEFORE UPDATE ON equipment_sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_sub_categories_updated_at();
```

### Step 2: Populate Carrier Equipment Categories & Sub-Categories

```sql
-- Get Carrier OEM ID
DO $$
DECLARE
  carrier_oem_id TEXT;
  cat_chillers_id TEXT;
  cat_ahus_id TEXT;
  cat_rtus_id TEXT;
  cat_split_id TEXT;
  cat_wshp_id TEXT;
  cat_doas_id TEXT;
BEGIN
  -- Get Carrier OEM ID
  SELECT id INTO carrier_oem_id FROM oems WHERE name = 'Carrier' LIMIT 1;

  -- Create Equipment Categories for Carrier
  INSERT INTO equipment_categories (id, oem_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, carrier_oem_id, 'Chillers', 'chillers', 'Water-cooled and air-cooled chiller systems', 1),
    (gen_random_uuid()::text, carrier_oem_id, 'Air Handling Units', 'ahus', 'Commercial air handling units', 2),
    (gen_random_uuid()::text, carrier_oem_id, 'Rooftop Units', 'rtus', 'Packaged rooftop HVAC units', 3),
    (gen_random_uuid()::text, carrier_oem_id, 'Split Condensers', 'split-condensers', 'Split system condensing units', 4),
    (gen_random_uuid()::text, carrier_oem_id, 'Water Source Heat Pumps', 'wshp', 'Water source heat pump systems', 5),
    (gen_random_uuid()::text, carrier_oem_id, 'DOAS', 'doas', 'Dedicated outdoor air systems', 6)
  ON CONFLICT (oem_id, slug) DO NOTHING
  RETURNING id INTO cat_chillers_id;

  -- Get category IDs
  SELECT id INTO cat_chillers_id FROM equipment_categories WHERE oem_id = carrier_oem_id AND slug = 'chillers';
  SELECT id INTO cat_ahus_id FROM equipment_categories WHERE oem_id = carrier_oem_id AND slug = 'ahus';
  SELECT id INTO cat_rtus_id FROM equipment_categories WHERE oem_id = carrier_oem_id AND slug = 'rtus';
  SELECT id INTO cat_split_id FROM equipment_categories WHERE oem_id = carrier_oem_id AND slug = 'split-condensers';
  SELECT id INTO cat_wshp_id FROM equipment_categories WHERE oem_id = carrier_oem_id AND slug = 'wshp';
  SELECT id INTO cat_doas_id FROM equipment_categories WHERE oem_id = carrier_oem_id AND slug = 'doas';

  -- Create Sub-Categories for Chillers
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_chillers_id, 'Water-Cooled Chillers', 'water-cooled', 'Water-cooled chiller systems', 1),
    (gen_random_uuid()::text, cat_chillers_id, 'Air-Cooled Chillers', 'air-cooled', 'Air-cooled chiller systems', 2)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Create Sub-Categories for AHUs
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_ahus_id, 'Commercial AHUs', 'commercial-ahus', 'Commercial air handling units', 1)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Create Sub-Categories for RTUs
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_rtus_id, 'Standard RTUs', 'standard-rtus', 'Standard packaged rooftop units', 1)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Create Sub-Categories for Split Condensers
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_split_id, 'Commercial Split Systems', 'commercial-split', 'Commercial split system condensers', 1)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Create Sub-Categories for WSHP
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_wshp_id, 'Standard WSHP', 'standard-wshp', 'Standard water source heat pumps', 1)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Create Sub-Categories for DOAS
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_doas_id, 'Standard DOAS', 'standard-doas', 'Standard dedicated outdoor air systems', 1)
  ON CONFLICT (category_id, slug) DO NOTHING;

END $$;
```

### Step 3: Add Trane OEM and Categories (Structure Only, No Models Yet)

```sql
-- Add Trane OEM
INSERT INTO oems (id, name, slug, description)
VALUES (gen_random_uuid()::text, 'Trane', 'trane', 'Trane commercial HVAC equipment')
ON CONFLICT (slug) DO NOTHING;

-- Create Equipment Categories for Trane
DO $$
DECLARE
  trane_oem_id TEXT;
  cat_chillers_id TEXT;
  cat_ahus_id TEXT;
  cat_rtus_id TEXT;
  cat_split_id TEXT;
  cat_doas_id TEXT;
  cat_intellipak_id TEXT;
  cat_vfds_id TEXT;
BEGIN
  -- Get Trane OEM ID
  SELECT id INTO trane_oem_id FROM oems WHERE name = 'Trane' LIMIT 1;

  -- Create Equipment Categories for Trane
  INSERT INTO equipment_categories (id, oem_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, trane_oem_id, 'Chillers', 'chillers', 'Water-cooled and air-cooled chiller systems', 1),
    (gen_random_uuid()::text, trane_oem_id, 'Air Handling Units', 'ahus', 'Commercial air handling units', 2),
    (gen_random_uuid()::text, trane_oem_id, 'Rooftop Units', 'rtus', 'Packaged rooftop HVAC units', 3),
    (gen_random_uuid()::text, trane_oem_id, 'Split Condensers', 'split-condensers', 'Split system condensing units', 4),
    (gen_random_uuid()::text, trane_oem_id, 'DOAS', 'doas', 'Dedicated outdoor air systems', 5),
    (gen_random_uuid()::text, trane_oem_id, 'IntelliPak', 'intellipak', 'IntelliPak packaged rooftop systems', 6),
    (gen_random_uuid()::text, trane_oem_id, 'VFDs', 'vfds', 'Variable frequency drives', 7)
  ON CONFLICT (oem_id, slug) DO NOTHING;

  -- Get category IDs
  SELECT id INTO cat_chillers_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'chillers';
  SELECT id INTO cat_ahus_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'ahus';
  SELECT id INTO cat_rtus_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'rtus';
  SELECT id INTO cat_split_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'split-condensers';
  SELECT id INTO cat_doas_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'doas';
  SELECT id INTO cat_intellipak_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'intellipak';
  SELECT id INTO cat_vfds_id FROM equipment_categories WHERE oem_id = trane_oem_id AND slug = 'vfds';

  -- Create Sub-Categories for Trane Chillers
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_chillers_id, 'Water-Cooled Chillers', 'water-cooled', 'Water-cooled chiller systems', 1),
    (gen_random_uuid()::text, cat_chillers_id, 'Air-Cooled Chillers', 'air-cooled', 'Air-cooled chiller systems', 2)
  ON CONFLICT (category_id, slug) DO NOTHING;

  -- Create Sub-Categories for other Trane categories (basic structure)
  INSERT INTO equipment_sub_categories (id, category_id, name, slug, description, display_order)
  VALUES 
    (gen_random_uuid()::text, cat_ahus_id, 'Commercial AHUs', 'commercial-ahus', 'Commercial air handling units', 1),
    (gen_random_uuid()::text, cat_rtus_id, 'Standard RTUs', 'standard-rtus', 'Standard packaged rooftop units', 1),
    (gen_random_uuid()::text, cat_split_id, 'Commercial Split Systems', 'commercial-split', 'Commercial split system condensers', 1),
    (gen_random_uuid()::text, cat_doas_id, 'Standard DOAS', 'standard-doas', 'Standard dedicated outdoor air systems', 1),
    (gen_random_uuid()::text, cat_intellipak_id, 'IntelliPak Rooftop AHUs', 'intellipak-rooftop', 'IntelliPak packaged systems', 1),
    (gen_random_uuid()::text, cat_vfds_id, 'HVAC VFDs', 'hvac-vfds', 'Variable frequency drives for HVAC', 1)
  ON CONFLICT (category_id, slug) DO NOTHING;

END $$;
```

### Step 4: Create New Product Lines for Each Model Family

```sql
-- This will create proper product lines for each model family
-- We'll link them to the appropriate sub-categories

DO $$
DECLARE
  carrier_oem_id TEXT;
  subcat_water_cooled_chiller TEXT;
  subcat_commercial_ahu TEXT;
  subcat_standard_rtu TEXT;
  subcat_commercial_split TEXT;
  subcat_standard_wshp TEXT;
BEGIN
  -- Get Carrier OEM ID
  SELECT id INTO carrier_oem_id FROM oems WHERE name = 'Carrier' LIMIT 1;

  -- Get sub-category IDs
  SELECT esc.id INTO subcat_water_cooled_chiller
  FROM equipment_sub_categories esc
  JOIN equipment_categories ec ON esc.category_id = ec.id
  WHERE ec.oem_id = carrier_oem_id AND ec.slug = 'chillers' AND esc.slug = 'water-cooled';

  SELECT esc.id INTO subcat_commercial_ahu
  FROM equipment_sub_categories esc
  JOIN equipment_categories ec ON esc.category_id = ec.id
  WHERE ec.oem_id = carrier_oem_id AND ec.slug = 'ahus' AND esc.slug = 'commercial-ahus';

  SELECT esc.id INTO subcat_standard_rtu
  FROM equipment_sub_categories esc
  JOIN equipment_categories ec ON esc.category_id = ec.id
  WHERE ec.oem_id = carrier_oem_id AND ec.slug = 'rtus' AND esc.slug = 'standard-rtus';

  SELECT esc.id INTO subcat_commercial_split
  FROM equipment_sub_categories esc
  JOIN equipment_categories ec ON esc.category_id = ec.id
  WHERE ec.oem_id = carrier_oem_id AND ec.slug = 'split-condensers' AND esc.slug = 'commercial-split';

  SELECT esc.id INTO subcat_standard_wshp
  FROM equipment_sub_categories esc
  JOIN equipment_categories ec ON esc.category_id = ec.id
  WHERE ec.oem_id = carrier_oem_id AND ec.slug = 'wshp' AND esc.slug = 'standard-wshp';

  -- Create product lines for chillers (keep existing, add sub_category link)
  INSERT INTO product_lines (id, oem_id, name, slug, sub_category_id)
  VALUES 
    (gen_random_uuid()::text, carrier_oem_id, '19DV Series', '19dv-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '19MV Series', '19mv-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '19XR-XRV Series', '19xr-xrv-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '23XR-XRV Series', '23xr-xrv-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '30HXC-HXA Series', '30hxc-hxa-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '30RAP Series', '30rap-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '30RB Series', '30rb-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '30RC Series', '30rc-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '30XA-XW Series', '30xa-xw-series', subcat_water_cooled_chiller),
    (gen_random_uuid()::text, carrier_oem_id, '30XV Series', '30xv-series', subcat_water_cooled_chiller)
  ON CONFLICT (oem_id, slug) DO NOTHING;

  -- Create product lines for AHUs
  INSERT INTO product_lines (id, oem_id, name, slug, sub_category_id)
  VALUES 
    (gen_random_uuid()::text, carrier_oem_id, '39M Series', '39m-series', subcat_commercial_ahu)
  ON CONFLICT (oem_id, slug) DO NOTHING;

  -- Create product lines for RTUs
  INSERT INTO product_lines (id, oem_id, name, slug, sub_category_id)
  VALUES 
    (gen_random_uuid()::text, carrier_oem_id, '48A Series', '48a-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48FC Series', '48fc-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48FE Series', '48fe-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48GC Series', '48gc-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48GE Series', '48ge-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48HC Series', '48hc-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48K Series', '48k-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48LC Series', '48lc-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48P Series', '48p-series', subcat_standard_rtu),
    (gen_random_uuid()::text, carrier_oem_id, '48V Series', '48v-series', subcat_standard_rtu)
  ON CONFLICT (oem_id, slug) DO NOTHING;

  -- Create product lines for Split Condensers
  INSERT INTO product_lines (id, oem_id, name, slug, sub_category_id)
  VALUES 
    (gen_random_uuid()::text, carrier_oem_id, '38A Series', '38a-series', subcat_commercial_split)
  ON CONFLICT (oem_id, slug) DO NOTHING;

  -- Create product line for 50W (investigate if RTU or WSHP later)
  INSERT INTO product_lines (id, oem_id, name, slug, sub_category_id)
  VALUES 
    (gen_random_uuid()::text, carrier_oem_id, '50W Series', '50w-series', subcat_standard_wshp)
  ON CONFLICT (oem_id, slug) DO NOTHING;

END $$;
```

### Step 5: Recategorize Existing Models (Update product_line_id)

```sql
-- This is the critical step: move models to their correct product lines
-- We need to be VERY careful to preserve all foreign key relationships

DO $$
DECLARE
  carrier_oem_id TEXT;
  old_chillers_pl_id TEXT;
BEGIN
  -- Get Carrier OEM ID and old "Chillers" product line
  SELECT id INTO carrier_oem_id FROM oems WHERE name = 'Carrier' LIMIT 1;
  SELECT id INTO old_chillers_pl_id FROM product_lines WHERE oem_id = carrier_oem_id AND name = 'Chillers' LIMIT 1;

  -- Update 39M to AHU product line
  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '39m-series' LIMIT 1
  )
  WHERE m.model_number = '39M' AND m.product_line_id = old_chillers_pl_id;

  -- Update 38A to Split Condenser product line
  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '38a-series' LIMIT 1
  )
  WHERE m.model_number = '38A' AND m.product_line_id = old_chillers_pl_id;

  -- Update RTUs to their respective product lines AND fix model numbers
  -- 4850A → 48A
  UPDATE models m
  SET 
    model_number = '48A',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48a-series' LIMIT 1
    )
  WHERE m.model_number = '4850A' AND m.product_line_id = old_chillers_pl_id;

  -- 4850FC-GC → Need to split into 48FC and 48GC (complex - skip for now, handle manually)
  -- For now, just update to 48FC
  UPDATE models m
  SET 
    model_number = '48FC',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48fc-series' LIMIT 1
    )
  WHERE m.model_number = '4850FC-GC' AND m.product_line_id = old_chillers_pl_id;

  -- 4850FE-GE → 48FE (similar issue, handle 48GE separately later)
  UPDATE models m
  SET 
    model_number = '48FE',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48fe-series' LIMIT 1
    )
  WHERE m.model_number = '4850FE-GE' AND m.product_line_id = old_chillers_pl_id;

  -- 4850HC → 48HC
  UPDATE models m
  SET 
    model_number = '48HC',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48hc-series' LIMIT 1
    )
  WHERE m.model_number = '4850HC' AND m.product_line_id = old_chillers_pl_id;

  -- 4850K → 48K
  UPDATE models m
  SET 
    model_number = '48K',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48k-series' LIMIT 1
    )
  WHERE m.model_number = '4850K' AND m.product_line_id = old_chillers_pl_id;

  -- 4850LC → 48LC
  UPDATE models m
  SET 
    model_number = '48LC',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48lc-series' LIMIT 1
    )
  WHERE m.model_number = '4850LC' AND m.product_line_id = old_chillers_pl_id;

  -- 4850P → 48P
  UPDATE models m
  SET 
    model_number = '48P',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48p-series' LIMIT 1
    )
  WHERE m.model_number = '4850P' AND m.product_line_id = old_chillers_pl_id;

  -- 4850V → 48V
  UPDATE models m
  SET 
    model_number = '48V',
    product_line_id = (
      SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '48v-series' LIMIT 1
    )
  WHERE m.model_number = '4850V' AND m.product_line_id = old_chillers_pl_id;

  -- 50W → Keep as 50W, move to WSHP
  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '50w-series' LIMIT 1
  )
  WHERE m.model_number = '50W' AND m.product_line_id = old_chillers_pl_id;

  -- Update chiller models to their specific product lines
  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '19dv-series' LIMIT 1
  )
  WHERE m.model_number = '19DV' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '19mv-series' LIMIT 1
  )
  WHERE m.model_number = '19MV' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '19xr-xrv-series' LIMIT 1
  )
  WHERE m.model_number = '19XR-XRV' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '23xr-xrv-series' LIMIT 1
  )
  WHERE m.model_number = '23XR-XRV' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '30hxc-hxa-series' LIMIT 1
  )
  WHERE m.model_number = '30HXC-HXA' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '30rap-series' LIMIT 1
  )
  WHERE m.model_number = '30RAP' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '30rb-series' LIMIT 1
  )
  WHERE m.model_number = '30RB' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '30rc-series' LIMIT 1
  )
  WHERE m.model_number = '30RC' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '30xa-xw-series' LIMIT 1
  )
  WHERE m.model_number = '30XA-XW' AND m.product_line_id = old_chillers_pl_id;

  UPDATE models m
  SET product_line_id = (
    SELECT id FROM product_lines WHERE oem_id = carrier_oem_id AND slug = '30xv-series' LIMIT 1
  )
  WHERE m.model_number = '30XV' AND m.product_line_id = old_chillers_pl_id;

END $$;
```

### Step 6: Delete Old "Chillers" Product Line (If Empty)

```sql
-- Verify no models still reference old product line
SELECT COUNT(*) as remaining_models 
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
WHERE pl.name = 'Chillers' AND pl.oem_id = (SELECT id FROM oems WHERE name = 'Carrier');

-- If 0, safe to delete old product line
DELETE FROM product_lines 
WHERE name = 'Chillers' 
  AND oem_id = (SELECT id FROM oems WHERE name = 'Carrier')
  AND NOT EXISTS (
    SELECT 1 FROM models WHERE product_line_id = product_lines.id
  );
```

---

## ✅ VALIDATION QUERIES

### After Migration, Run These to Verify Success:

```sql
-- 1. Verify all equipment categories created
SELECT o.name as oem, ec.name as category, COUNT(esc.id) as subcategories
FROM equipment_categories ec
JOIN oems o ON ec.oem_id = o.id
LEFT JOIN equipment_sub_categories esc ON ec.id = esc.category_id
GROUP BY o.name, ec.name
ORDER BY o.name, ec.display_order;

-- 2. Verify all product lines have sub_category_id
SELECT 
  o.name as oem,
  pl.name as product_line,
  ec.name as category,
  esc.name as subcategory
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
LEFT JOIN equipment_sub_categories esc ON pl.sub_category_id = esc.id
LEFT JOIN equipment_categories ec ON esc.category_id = ec.id
ORDER BY o.name, ec.name, pl.name;

-- 3. Verify all models properly categorized
SELECT 
  o.name as oem,
  ec.name as category,
  esc.name as subcategory,
  m.model_number,
  COUNT(DISTINCT man.id) as manuals,
  COUNT(DISTINCT ms.id) as sections
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
JOIN equipment_sub_categories esc ON pl.sub_category_id = esc.id
JOIN equipment_categories ec ON esc.category_id = ec.id
LEFT JOIN manuals man ON m.id = man.model_id
LEFT JOIN manual_sections ms ON man.id = ms.manual_id
GROUP BY o.name, ec.name, esc.name, m.model_number
ORDER BY o.name, ec.name, m.model_number;

-- 4. Verify NO models still in old "Chillers" flat structure
SELECT COUNT(*) as orphaned_models
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
WHERE pl.name = 'Chillers' AND pl.sub_category_id IS NULL;
-- Should return 0

-- 5. Verify section count unchanged
SELECT COUNT(*) as total_sections FROM manual_sections;
-- Should still be 55,239

-- 6. Verify chat sessions unchanged
SELECT COUNT(*) as total_chats FROM chat_sessions;
-- Should still be 13

-- 7. Verify questions unchanged
SELECT COUNT(*) as total_questions FROM questions;
-- Should still be 29
```

---

## 🎯 SUCCESS CRITERIA

- ✅ Equipment taxonomy tables created
- ✅ Carrier: 6 categories, 10+ sub-categories
- ✅ Trane: 7 categories, 7+ sub-categories (structure only, no models yet)
- ✅ All 41 Carrier models recategorized correctly
- ✅ RTU model numbers fixed (4850A → 48A)
- ✅ All 55,239 manual sections preserved
- ✅ All 13 chat sessions preserved
- ✅ All 29 questions preserved
- ✅ No orphaned records
- ✅ No broken foreign keys
- ✅ Ready for Phase 2 (manual upload dashboard)

---

## 🚀 EXECUTION

Ready to execute migration in single transaction with rollback on error.
