-- OEM TechTalk - HVAC Test Data Seed
-- Real manufacturers, product lines, and models
-- Run this after migrations are complete

-- =====================================================
-- 1. OEMs (Manufacturers)
-- =====================================================

INSERT INTO oems (id, name, vertical, website, logo_url, status, created_at, updated_at) VALUES
(gen_random_uuid(), 'Carrier', 'HVAC', 'https://www.carrier.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'Trane', 'HVAC', 'https://www.trane.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'Lennox', 'HVAC', 'https://www.lennox.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'Rheem', 'HVAC', 'https://www.rheem.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'American Standard', 'HVAC', 'https://www.americanstandardair.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'York', 'HVAC', 'https://www.york.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'Goodman', 'HVAC', 'https://www.goodmanmfg.com', NULL, 'active', NOW(), NOW()),
(gen_random_uuid(), 'Bryant', 'HVAC', 'https://www.bryant.com', NULL, 'active', NOW(), NOW());

-- =====================================================
-- 2. Product Lines
-- =====================================================

-- Carrier Product Lines
INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Infinity Series',
  'Heat Pump',
  'Premium variable-speed heat pumps with Greenspeed intelligence',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Carrier';

INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Performance Series',
  'Air Conditioner',
  'Mid-tier single and two-stage air conditioners',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Carrier';

INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Comfort Series',
  'Furnace',
  'Gas furnaces with standard and modulating options',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Carrier';

-- Trane Product Lines
INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'XV Series',
  'Heat Pump',
  'Variable-speed heat pumps with TruComfort technology',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Trane';

INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'XR Series',
  'Air Conditioner',
  'Single-stage and two-stage air conditioners',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Trane';

-- Lennox Product Lines
INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Signature Series',
  'Heat Pump',
  'SunSource solar-ready heat pumps',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Lennox';

INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Elite Series',
  'Furnace',
  'Modulating gas furnaces with variable capacity',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Lennox';

-- Rheem Product Lines
INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Prestige Series',
  'Heat Pump',
  'Communicating variable-speed heat pumps',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Rheem';

INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Classic Plus Series',
  'Air Conditioner',
  'Standard efficiency air conditioners',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'Rheem';

-- American Standard Product Lines
INSERT INTO product_lines (id, oem_id, name, category, description, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  oems.id,
  'Platinum Series',
  'Heat Pump',
  'Premium variable-speed heat pumps',
  NOW(),
  NOW()
FROM oems WHERE oems.name = 'American Standard';

-- =====================================================
-- 3. Models
-- =====================================================

-- Carrier Infinity Heat Pumps
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  '25VNA8',
  ARRAY['25VNA848A003', '25VNA860A003', '25VNA824A003'],
  ARRAY[2018, 2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 20, "hspf": 10, "stages": "variable", "refrigerant": "R-410A", "tonnage": [2, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Carrier' AND pl.name = 'Infinity Series';

INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  '25VNA0',
  ARRAY['25VNA048A003', '25VNA060A003', '25VNA036A003'],
  ARRAY[2020, 2021, 2022, 2023, 2024],
  '{"seer": 19, "hspf": 9.5, "stages": "variable", "refrigerant": "R-410A", "tonnage": [2, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Carrier' AND pl.name = 'Infinity Series';

-- Carrier Performance Air Conditioners
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  '24ACC6',
  ARRAY['24ACC636A003', '24ACC648A003', '24ACC660A003'],
  ARRAY[2017, 2018, 2019, 2020, 2021, 2022, 2023],
  '{"seer": 16, "stages": 2, "refrigerant": "R-410A", "tonnage": [2, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Carrier' AND pl.name = 'Performance Series';

-- Carrier Comfort Furnaces
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  '59MN7',
  ARRAY['59MN7A060V17', '59MN7A080V17', '59MN7A100V20'],
  ARRAY[2019, 2020, 2021, 2022, 2023, 2024],
  '{"afue": 96, "btu": [60000, 80000, 100000], "stages": "modulating", "fuel": "natural_gas"}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Carrier' AND pl.name = 'Comfort Series';

-- Trane XV Series Heat Pumps
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'XV20i',
  ARRAY['4TWV0024A1000B', '4TWV0030A1000B', '4TWV0036A1000B', '4TWV0048A1000B'],
  ARRAY[2018, 2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 21, "hspf": 10, "stages": "variable", "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 4]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Trane' AND pl.name = 'XV Series';

INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'XV18',
  ARRAY['4TWV8024A1000A', '4TWV8030A1000A', '4TWV8036A1000A'],
  ARRAY[2017, 2018, 2019, 2020, 2021, 2022, 2023],
  '{"seer": 18, "hspf": 9.5, "stages": 2, "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Trane' AND pl.name = 'XV Series';

-- Trane XR Series Air Conditioners
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'XR17',
  ARRAY['4TTR7024A1000A', '4TTR7030A1000A', '4TTR7036A1000A', '4TTR7048A1000A'],
  ARRAY[2018, 2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 17, "stages": 2, "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Trane' AND pl.name = 'XR Series';

-- Lennox Signature Heat Pumps
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'XP25',
  ARRAY['XP25-024-230', 'XP25-030-230', 'XP25-036-230', 'XP25-048-230'],
  ARRAY[2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 23, "hspf": 10.2, "stages": "variable", "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Lennox' AND pl.name = 'Signature Series';

INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'XP21',
  ARRAY['XP21-024-230', 'XP21-036-230', 'XP21-048-230'],
  ARRAY[2017, 2018, 2019, 2020, 2021, 2022, 2023],
  '{"seer": 21, "hspf": 10, "stages": 2, "refrigerant": "R-410A", "tonnage": [2, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Lennox' AND pl.name = 'Signature Series';

-- Lennox Elite Furnaces
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'EL296V',
  ARRAY['EL296V060XE36B', 'EL296V080XE36B', 'EL296V100XE48B'],
  ARRAY[2018, 2019, 2020, 2021, 2022, 2023, 2024],
  '{"afue": 96, "btu": [60000, 80000, 100000, 120000], "stages": 2, "fuel": "natural_gas"}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Lennox' AND pl.name = 'Elite Series';

-- Rheem Prestige Heat Pumps
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'RP20',
  ARRAY['RP2024AJ1NA', 'RP2030AJ1NA', 'RP2036AJ1NA', 'RP2042AJ1NA'],
  ARRAY[2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 20, "hspf": 10, "stages": "variable", "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 3.5, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Rheem' AND pl.name = 'Prestige Series';

-- Rheem Classic Plus Air Conditioners
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'RA14',
  ARRAY['RA1424AJ1NA', 'RA1430AJ1NA', 'RA1436AJ1NA', 'RA1448AJ1NA'],
  ARRAY[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 14, "stages": 1, "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Rheem' AND pl.name = 'Classic Plus Series';

-- American Standard Platinum Heat Pumps
INSERT INTO models (id, product_line_id, model_number, variants, years_active, specifications, discontinued, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pl.id,
  'Platinum 20',
  ARRAY['4A7A0024A1000B', '4A7A0030A1000B', '4A7A0036A1000B', '4A7A0048A1000B'],
  ARRAY[2018, 2019, 2020, 2021, 2022, 2023, 2024],
  '{"seer": 20, "hspf": 10, "stages": "variable", "refrigerant": "R-410A", "tonnage": [2, 2.5, 3, 4, 5]}'::jsonb,
  FALSE,
  NOW(),
  NOW()
FROM product_lines pl
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'American Standard' AND pl.name = 'Platinum Series';

-- =====================================================
-- 4. Manuals (Metadata Only - PDFs to be added later)
-- =====================================================

-- Carrier 25VNA8 Manuals
INSERT INTO manuals (id, model_id, manual_type, title, revision, publish_date, source_type, status, confidence_score, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'service',
  'Infinity Series 25VNA8 Service and Troubleshooting Guide',
  'Rev. 04/2023',
  '2023-04-15'::date,
  'oem',
  'pending',
  1.00,
  NOW(),
  NOW()
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Carrier' AND m.model_number = '25VNA8';

INSERT INTO manuals (id, model_id, manual_type, title, revision, publish_date, source_type, status, confidence_score, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'install',
  'Infinity Series 25VNA8 Installation Instructions',
  'Rev. 03/2023',
  '2023-03-10'::date,
  'oem',
  'pending',
  1.00,
  NOW(),
  NOW()
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Carrier' AND m.model_number = '25VNA8';

-- Trane XV20i Manuals
INSERT INTO manuals (id, model_id, manual_type, title, revision, publish_date, source_type, status, confidence_score, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'service',
  'XV20i TruComfort Variable Speed Heat Pump Service Manual',
  'BAS-SVN028A-EN',
  '2022-11-20'::date,
  'oem',
  'pending',
  1.00,
  NOW(),
  NOW()
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Trane' AND m.model_number = 'XV20i';

-- Lennox XP25 Manuals
INSERT INTO manuals (id, model_id, manual_type, title, revision, publish_date, source_type, status, confidence_score, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'service',
  'XP25 Heat Pump Service Manual',
  '210779-02',
  '2023-06-01'::date,
  'oem',
  'pending',
  1.00,
  NOW(),
  NOW()
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Lennox' AND m.model_number = 'XP25';

-- Rheem RP20 Manuals
INSERT INTO manuals (id, model_id, manual_type, title, revision, publish_date, source_type, status, confidence_score, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'service',
  'Prestige Series RP20 Service Manual',
  'RHPRESRP20-01',
  '2023-01-15'::date,
  'oem',
  'pending',
  1.00,
  NOW(),
  NOW()
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'Rheem' AND m.model_number = 'RP20';

-- American Standard Platinum 20 Manuals
INSERT INTO manuals (id, model_id, manual_type, title, revision, publish_date, source_type, status, confidence_score, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'service',
  'Platinum 20 Heat Pump Service and Troubleshooting Manual',
  'BAS-SVN029A-EN',
  '2022-12-10'::date,
  'oem',
  'pending',
  1.00,
  NOW(),
  NOW()
FROM models m
JOIN product_lines pl ON m.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE o.name = 'American Standard' AND m.model_number = 'Platinum 20';

-- =====================================================
-- Summary
-- =====================================================
-- This seed adds:
-- - 8 major HVAC OEMs
-- - 10 product lines
-- - 15 popular models (2018-2024)
-- - 6 service manual records (metadata only)
--
-- Next steps:
-- 1. Add PDF files to Supabase Storage
-- 2. Update manual records with file_url and storage_path
-- 3. Run PDF ingestion to extract text and create embeddings
-- =====================================================
