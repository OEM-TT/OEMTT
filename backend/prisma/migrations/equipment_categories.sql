-- Equipment Categories Migration
-- Date: 2026-02-17
-- Purpose: Add equipment taxonomy for better organization and scalability

-- ============================================
-- 1. CREATE EQUIPMENT CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,        -- "Chillers", "AHUs", "RTUs", etc.
  slug VARCHAR(100) NOT NULL UNIQUE,        -- "chillers", "ahus", "rtus"
  description TEXT,
  icon_name VARCHAR(50),                    -- For UI (ionicons name)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for sorting/display
CREATE INDEX idx_equipment_categories_sort ON equipment_categories(sort_order);

-- ============================================
-- 2. CREATE EQUIPMENT SUB-CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS equipment_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,              -- "Air-Cooled", "Water-Cooled", etc.
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Indexes
CREATE INDEX idx_equipment_sub_categories_category ON equipment_sub_categories(category_id);
CREATE INDEX idx_equipment_sub_categories_sort ON equipment_sub_categories(category_id, sort_order);

-- ============================================
-- 3. ALTER MODELS TABLE
-- ============================================
ALTER TABLE models 
  ADD COLUMN IF NOT EXISTS equipment_category_id UUID REFERENCES equipment_categories(id),
  ADD COLUMN IF NOT EXISTS equipment_sub_category_id UUID REFERENCES equipment_sub_categories(id);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_models_equipment_category ON models(equipment_category_id);
CREATE INDEX IF NOT EXISTS idx_models_equipment_sub_category ON models(equipment_sub_category_id);

-- ============================================
-- 4. SEED EQUIPMENT CATEGORIES
-- ============================================

-- Main equipment categories (scalable beyond HVAC)
INSERT INTO equipment_categories (name, slug, description, icon_name, sort_order) VALUES
  ('Chillers', 'chillers', 'Water chillers for commercial and industrial cooling', 'snow-outline', 10),
  ('Rooftop Units', 'rtus', 'Packaged rooftop HVAC units', 'home-outline', 20),
  ('Air Handling Units', 'ahus', 'Central air handlers and makeup air units', 'albums-outline', 30),
  ('DOAS', 'doas', 'Dedicated Outdoor Air Systems', 'cloud-outline', 40),
  ('Split Systems', 'split-systems', 'Split condensing units and air handlers', 'git-branch-outline', 50),
  ('Heat Pumps', 'heat-pumps', 'Air source and water source heat pumps', 'thermometer-outline', 60),
  ('Water Source Heat Pumps', 'wshp', 'Water-to-air and water-to-water heat pumps', 'water-outline', 70),
  ('Variable Frequency Drives', 'vfds', 'Motor speed controllers and inverters', 'speedometer-outline', 80),
  ('Controls & Sensors', 'controls', 'Building automation and control systems', 'options-outline', 90),
  ('Condensers', 'condensers', 'Outdoor condensing units', 'cube-outline', 100),
  ('Boilers', 'boilers', 'Commercial and industrial boilers', 'flame-outline', 110),
  ('Furnaces', 'furnaces', 'Gas and electric heating furnaces', 'bonfire-outline', 120),
  ('Fans & Blowers', 'fans-blowers', 'Ventilation fans and air movers', 'aperture-outline', 130),
  ('Pumps', 'pumps', 'Hydronic and process pumps', 'swap-vertical-outline', 140),
  ('Compressors', 'compressors', 'Standalone compressor units', 'battery-charging-outline', 150)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. SEED SUB-CATEGORIES
-- ============================================

-- Chillers sub-categories
INSERT INTO equipment_sub_categories (category_id, name, slug, sort_order)
SELECT id, 'Air-Cooled', 'air-cooled', 10 FROM equipment_categories WHERE slug = 'chillers'
UNION ALL
SELECT id, 'Water-Cooled', 'water-cooled', 20 FROM equipment_categories WHERE slug = 'chillers'
UNION ALL
SELECT id, 'Modular', 'modular', 30 FROM equipment_categories WHERE slug = 'chillers'
UNION ALL
SELECT id, 'Screw', 'screw', 40 FROM equipment_categories WHERE slug = 'chillers'
UNION ALL
SELECT id, 'Centrifugal', 'centrifugal', 50 FROM equipment_categories WHERE slug = 'chillers'
UNION ALL
SELECT id, 'Scroll', 'scroll', 60 FROM equipment_categories WHERE slug = 'chillers'
ON CONFLICT (category_id, slug) DO NOTHING;

-- RTUs sub-categories (by size/application)
INSERT INTO equipment_sub_categories (category_id, name, slug, sort_order)
SELECT id, 'Light Commercial', 'light-commercial', 10 FROM equipment_categories WHERE slug = 'rtus'
UNION ALL
SELECT id, 'Commercial', 'commercial', 20 FROM equipment_categories WHERE slug = 'rtus'
UNION ALL
SELECT id, 'Industrial', 'industrial', 30 FROM equipment_categories WHERE slug = 'rtus'
UNION ALL
SELECT id, 'High Efficiency', 'high-efficiency', 40 FROM equipment_categories WHERE slug = 'rtus'
ON CONFLICT (category_id, slug) DO NOTHING;

-- VFDs sub-categories (by power range)
INSERT INTO equipment_sub_categories (category_id, name, slug, sort_order)
SELECT id, 'Low Voltage', 'low-voltage', 10 FROM equipment_categories WHERE slug = 'vfds'
UNION ALL
SELECT id, 'Medium Voltage', 'medium-voltage', 20 FROM equipment_categories WHERE slug = 'vfds'
UNION ALL
SELECT id, 'Micro Drives', 'micro-drives', 30 FROM equipment_categories WHERE slug = 'vfds'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Split Systems sub-categories
INSERT INTO equipment_sub_categories (category_id, name, slug, sort_order)
SELECT id, 'Residential', 'residential', 10 FROM equipment_categories WHERE slug = 'split-systems'
UNION ALL
SELECT id, 'Light Commercial', 'light-commercial', 20 FROM equipment_categories WHERE slug = 'split-systems'
UNION ALL
SELECT id, 'Commercial', 'commercial', 30 FROM equipment_categories WHERE slug = 'split-systems'
UNION ALL
SELECT id, 'Mini-Split', 'mini-split', 40 FROM equipment_categories WHERE slug = 'split-systems'
UNION ALL
SELECT id, 'VRF', 'vrf', 50 FROM equipment_categories WHERE slug = 'split-systems'
ON CONFLICT (category_id, slug) DO NOTHING;

-- ============================================
-- 6. MIGRATE EXISTING DATA
-- ============================================

-- Update existing Carrier chiller models
UPDATE models m
SET equipment_category_id = ec.id,
    equipment_sub_category_id = (
      CASE 
        WHEN m.model_number LIKE '30%' THEN (
          SELECT id FROM equipment_sub_categories 
          WHERE category_id = ec.id AND slug = 'water-cooled' LIMIT 1
        )
        WHEN m.model_number LIKE '19%' OR m.model_number LIKE '23%' THEN (
          SELECT id FROM equipment_sub_categories 
          WHERE category_id = ec.id AND slug = 'centrifugal' LIMIT 1
        )
        ELSE NULL
      END
    )
FROM equipment_categories ec
WHERE ec.slug = 'chillers'
  AND EXISTS (
    SELECT 1 FROM product_lines pl
    WHERE pl.id = m.product_line_id
    AND pl.name ILIKE '%chiller%'
  );

-- ============================================
-- 7. UPDATE UPDATED_AT TRIGGER
-- ============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to new tables
CREATE TRIGGER update_equipment_categories_updated_at BEFORE UPDATE ON equipment_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_sub_categories_updated_at BEFORE UPDATE ON equipment_sub_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check categories created
-- SELECT * FROM equipment_categories ORDER BY sort_order;

-- Check sub-categories
-- SELECT ec.name as category, esc.name as sub_category, esc.sort_order
-- FROM equipment_sub_categories esc
-- JOIN equipment_categories ec ON ec.id = esc.category_id
-- ORDER BY ec.sort_order, esc.sort_order;

-- Check models updated
-- SELECT COUNT(*) FROM models WHERE equipment_category_id IS NOT NULL;
