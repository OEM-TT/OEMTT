-- Update the Carrier 25VNA8 manual record with PDF metadata
-- Run this AFTER uploading the PDF to Supabase Storage

-- Manual ID: 020d9bde-d46a-4a33-b06c-fb0cd135a8d4

-- Update the manual record with file information
UPDATE manuals
SET 
  source_url = 'https://yoggiqlslhutwjhuhqda.supabase.co/storage/v1/object/public/manuals/carrier-25vna8-service.pdf',
  storage_path = 'manuals/carrier-25vna8-service.pdf',
  page_count = 43,
  file_hash = 'sha256-placeholder', -- Will be calculated later
  status = 'active',
  updated_at = NOW()
WHERE id = '020d9bde-d46a-4a33-b06c-fb0cd135a8d4';

-- Verify the update
SELECT 
  m.title,
  m.manual_type,
  m.status,
  m.source_url,
  m.storage_path,
  m.page_count,
  mo.model_number,
  o.name as oem_name
FROM manuals m
JOIN models mo ON m.model_id = mo.id
JOIN product_lines pl ON mo.product_line_id = pl.id
JOIN oems o ON pl.oem_id = o.id
WHERE m.id = '020d9bde-d46a-4a33-b06c-fb0cd135a8d4';
