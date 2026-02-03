# Carrier Manual Bulk Seeding - Summary

**Date:** February 3, 2026  
**Status:** ✅ Complete

## Overview
Successfully ingested 68 Carrier manuals from local folder into the database with full processing, chunking, and embedding generation.

---

## Results

### Database
- **68 manuals** ingested and active
- **68 unique PDFs** in storage
- **~44,500 total sections** created
- **Average: 654.8 sections per manual**
- **Range: 135 - 2,529 sections**
- **All manuals status: "active"**

### Storage
- All PDFs organized in `carrier/` folder structure
- 12 old orphaned PDFs cleaned up
- 38 duplicate manual records removed

---

## Key Improvements Made

### 1. Token Limit Protection
**Problem:** Some large tables/sections exceeded OpenAI's 8192 token embedding limit, causing failures.

**Solution:** Added intelligent splitting in `chunker.ts`:
- Hard limit: 8000 tokens per chunk (leaves 192 token buffer)
- Detects oversized chunks at final creation stage
- Splits by `[REF:]` markers for tables (preserves structure)
- Falls back to paragraph splitting for non-tables
- Only truncates as absolute last resort
- **Preserves existing table functionality completely**

**Code Changes:**
```typescript
// Added constant
const MAX_EMBEDDING_TOKENS = 8000;

// Added intelligent splitting in chunkPDFPages()
if (chunkTokens > MAX_EMBEDDING_TOKENS) {
  // Split by REF markers (tables) or paragraphs
  // Process each sub-chunk
  // Last resort: truncate if still too large
}
```

### 2. Database Cleanup
- Fixed 45 manuals stuck in "processing" status → "active"
- Removed 38 duplicate records (kept best copy of each)
- Ensured 1:1 mapping (68 files → 68 database records)

### 3. Storage Cleanup
- Removed 12 old PDFs from root storage folder
- All files now in proper `carrier/` folder structure

---

## Source Data
- **Location:** `/Users/brentpurks/Desktop/OEMTT/CARRIER`
- **Total:** 68 PDFs across 21 model folders
- **Size:** ~912 MB

### Model Distribution
- 30XA-XW, 30XV, 30RC, 30RB, 30RAP, 30HXC-HXA
- 23XR-XRV, 19XR-XRV, 19MV, 19DV
- 38A, 39M
- 4850A, 4850V, 4850LC, 4850HC, 4850K, 4850P
- 4850W, 4850FE-GE, 4850FC-GC

---

## Scripts Created

### Primary Seeding Script
**File:** `backend/scripts/seed-carrier-manuals.ts`
- Handles full pipeline: backup → cleanup → upload → process → chunk → embed → store
- Includes retry logic for transient failures
- Logs progress and errors comprehensively

**Usage:**
```bash
cd backend
npm run seed:carrier
```

### Supporting Documentation
- `backend/CARRIER_SEEDING_GUIDE.md` - Full instructions for running the seed script

---

## Technical Details

### Processing Pipeline
1. **Backup:** Create JSON backup of existing data
2. **Cleanup:** Delete all existing Carrier-related records
3. **Upload:** Upload PDFs to Supabase storage (carrier/ folder)
4. **Process:** Extract text and tables using pdf-parse
5. **Chunk:** Create semantically meaningful sections (500-1000 tokens target)
6. **Embed:** Generate vector embeddings using OpenAI text-embedding-3-small
7. **Store:** Save sections and embeddings to PostgreSQL with pgvector

### Embedding Strategy
- **Model:** text-embedding-3-small (OpenAI)
- **Dimensions:** 1536
- **Batch Size:** 10 chunks processed concurrently
- **Hard Limit:** 8000 tokens per chunk (enforced in chunker.ts)
- **Retry Logic:** 3 retries with exponential backoff

### Database Schema
```
OEM (Carrier)
  └─ ProductLine (e.g., "30XV", "19XR")
      └─ Model (e.g., "30XV-2T")
          └─ Manual (e.g., "30XV-2T.pdf")
              └─ ManualSection (chunks with embeddings)
```

---

## Known Edge Cases Handled

1. **Large Tables:** Tables > 8000 tokens split intelligently by REF markers or paragraphs
2. **Duplicate Processing:** Seed script can be re-run safely (cleans before seeding)
3. **Transient Failures:** Automatic retry with exponential backoff
4. **Token Estimation:** Conservative estimates (1 token ≈ 4 chars) to avoid limit errors

---

## Future Considerations

### If You Need to Re-Process
1. The seed script automatically backs up data before cleanup
2. Backups stored in: `backend/backups/backup-YYYY-MM-DDTHH-mm-ss-mmmZ.json`
3. To restore: Use Prisma/Supabase to import the JSON backup

### If You Add More Manuals
1. Add PDFs to `/Users/brentpurks/Desktop/OEMTT/CARRIER/[model-folder]/`
2. Run `npm run seed:carrier` (it will clean and re-seed all)
3. Or create a new script for incremental ingestion

### Performance Tuning
- Current: 10 concurrent embeddings
- Can increase if rate limits allow
- Monitor OpenAI API costs during large ingestions

---

## Success Metrics

✅ **100% Upload Success** - All 68 PDFs uploaded to storage  
✅ **100% Processing Success** - All manuals chunked and embedded  
✅ **Zero Duplicates** - Clean 1:1 file-to-record mapping  
✅ **All Active** - No manuals stuck in processing state  
✅ **Token Compliance** - No chunks exceed embedding model limits  
✅ **Data Integrity** - All manuals have healthy section counts  

---

## Contact & Support

For issues or questions about the seeding process, refer to:
- **Seed Script:** `backend/scripts/seed-carrier-manuals.ts`
- **Chunker Logic:** `backend/src/services/ingestion/chunker.ts`
- **PDF Processor:** `backend/src/services/ingestion/pdfProcessor.ts`
- **Embeddings:** `backend/src/services/ingestion/embeddings.ts`

---

**Last Updated:** February 3, 2026  
**Status:** Production Ready ✅
