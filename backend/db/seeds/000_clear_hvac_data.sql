-- Clear existing HVAC test data
-- Run this BEFORE running 001_hvac_data.sql if you need to reset

-- Delete in reverse order to respect foreign key constraints
DELETE FROM manuals WHERE model_id IN (
  SELECT m.id FROM models m
  JOIN product_lines pl ON m.product_line_id = pl.id
  JOIN oems o ON pl.oem_id = o.id
  WHERE o.vertical = 'HVAC'
);

DELETE FROM models WHERE product_line_id IN (
  SELECT pl.id FROM product_lines pl
  JOIN oems o ON pl.oem_id = o.id
  WHERE o.vertical = 'HVAC'
);

DELETE FROM product_lines WHERE oem_id IN (
  SELECT id FROM oems WHERE vertical = 'HVAC'
);

DELETE FROM oems WHERE vertical = 'HVAC';

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM oems WHERE vertical = 'HVAC') as oems_count,
  (SELECT COUNT(*) FROM product_lines WHERE oem_id IN (SELECT id FROM oems WHERE vertical = 'HVAC')) as product_lines_count,
  (SELECT COUNT(*) FROM models WHERE product_line_id IN (SELECT pl.id FROM product_lines pl JOIN oems o ON pl.oem_id = o.id WHERE o.vertical = 'HVAC')) as models_count,
  (SELECT COUNT(*) FROM manuals WHERE model_id IN (SELECT m.id FROM models m JOIN product_lines pl ON m.product_line_id = pl.id JOIN oems o ON pl.oem_id = o.id WHERE o.vertical = 'HVAC')) as manuals_count;

-- All counts should be 0
