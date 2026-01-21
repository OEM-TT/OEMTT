# Database Seed Instructions

## Running the HVAC Data Seed

This seed adds **real HVAC manufacturers, models, and manual metadata** to your database.

### What's Included:
- **8 Major OEMs**: Carrier, Trane, Lennox, Rheem, American Standard, York, Goodman, Bryant
- **10 Product Lines**: Heat pumps, air conditioners, and furnaces
- **15 Real Models**: Current 2018-2024 models with actual model numbers
- **6 Manual Records**: Metadata for service and installation manuals

### Option 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project: https://yoggiqlslhutwjhuhqda.supabase.co
2. Navigate to **SQL Editor**
3. Copy the contents of `001_hvac_data.sql`
4. Paste and run the script
5. Verify data:
   ```sql
   SELECT COUNT(*) FROM oems;       -- Should return 8
   SELECT COUNT(*) FROM models;     -- Should return 15
   SELECT COUNT(*) FROM manuals;    -- Should return 6
   ```

### Option 2: Using psql Command Line

```bash
cd backend/db/seeds
psql "postgresql://postgres:F6fwRMq5lvZM4xmG@db.yoggiqlslhutwjhuhqda.supabase.co:5432/postgres?sslmode=require" -f 001_hvac_data.sql
```

### Option 3: Using Prisma Migrate (Future)

When ready, convert this to a Prisma migration for version control.

---

## Finding Service Manual PDFs

Service manuals for these models can be found at the following sources:

### Official OEM Documentation Portals

1. **Carrier**: https://www.shareddocs.com/hvac/docs/
   - Requires dealer account but some docs are public
   - Models: 25VNA8, 25VNA0, 24ACC6, 59MN7

2. **Trane**: https://www.trane.com/residential/en/resources/literature-library/
   - Search by model number
   - Models: XV20i, XV18, XR17

3. **Lennox**: https://www.lennoxpros.com/literature
   - Requires dealer login for service manuals
   - Models: XP25, XP21, EL296V

4. **Rheem**: https://www.rheem.com/resources/literature-library/
   - Filter by product type
   - Models: RP20, RA14

5. **American Standard**: https://www.americanstandardair.com/for-your-home/resources/product-literature/
   - Affiliated with Trane (similar docs)
   - Models: Platinum 20

### Alternative Sources

- **HVAC-Talk.com**: Community forums often share links to manuals
- **ManualsLib**: https://www.manualslib.com/ - User-uploaded manuals
- **Distributors**: HVAC distributors like Ferguson, Baker, or Johnstone often provide PDFs to customers

### Sample PDFs for Testing (No Account Required)

For immediate testing, you can use these sample HVAC PDFs:

1. **Generic Heat Pump Manual** (for testing):
   - https://www.energy.gov/sites/default/files/2023-07/heat-pump-installation-guide.pdf

2. **EPA Refrigerant Transition Guide** (good for troubleshooting section testing):
   - https://www.epa.gov/section608/stationary-refrigeration

3. **AHRI Standards** (technical specifications):
   - https://www.ahrinet.org/search-standards

---

## Adding PDFs to the Database

Once you have PDFs:

### 1. Upload to Supabase Storage

```bash
# Using Supabase CLI
supabase storage create manuals

# Upload file
supabase storage upload manuals/carrier-25vna8-service.pdf ./path/to/pdf
```

### 2. Update Manual Record

```sql
UPDATE manuals 
SET 
  file_url = 'https://yoggiqlslhutwjhuhqda.supabase.co/storage/v1/object/public/manuals/carrier-25vna8-service.pdf',
  storage_path = 'manuals/carrier-25vna8-service.pdf',
  file_hash = 'sha256-hash-here',
  page_count = 142,
  status = 'active'
WHERE title LIKE '%25VNA8%' AND manual_type = 'service';
```

### 3. Trigger Ingestion (Phase 2)

Once the PDF processing pipeline is built, trigger ingestion:

```bash
curl -X POST http://localhost:3000/api/discovery/ingest-manual \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"manualId": "uuid-here"}'
```

---

## Verify Data

After running the seed, test the API endpoints:

```bash
# Get all OEMs
curl http://localhost:3000/api/oems

# Search for Carrier models
curl http://localhost:3000/api/models/search?q=25VNA8

# Get a specific model's manuals
curl http://localhost:3000/api/models/{model-id}/manuals
```

---

## Notes

- **Legality**: Only use publicly available or properly licensed service manuals
- **Copyright**: OEM service manuals are typically copyrighted. Use for development/testing only.
- **Production**: For production, establish partnerships with OEMs for official documentation access
- **Updates**: Service manuals are frequently revised. Check for updates quarterly.
