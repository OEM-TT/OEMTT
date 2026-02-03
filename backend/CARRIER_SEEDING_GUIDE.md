# Carrier Manual Bulk Seeding Guide

This guide explains how to seed the database with all Carrier manuals from the `/OEMTT/CARRIER/` folder.

## Overview

**What you have:**
- 📁 79 PDFs across 22 model folders
- 💾 912MB of manual data
- 🏢 All Carrier OEM equipment

**What the script does:**
1. ✅ **Backs up** existing database to `/backend/backups/backup-{timestamp}.json`
2. ✅ **Cleans** database (removes old manuals, sections, models - but keeps users, questions, saved units)
3. ✅ **Processes** all 79 PDFs:
   - Uploads to Supabase storage (`manuals` bucket)
   - Extracts text and tables
   - Creates intelligent chunks (1000 chars, 200 overlap)
   - Generates embeddings for vector search
   - Creates database records (OEM → ProductLine → Model → Manual → ManualSections)
4. ✅ **Handles errors** with retries and detailed logging
5. ✅ **Shows progress** with real-time stats

## Before You Run

### 1. Check Your Environment

Ensure these are set in `.env.development`:
```bash
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

### 2. Verify Supabase Bucket

The script uploads to the `manuals` bucket. Make sure it exists:
```bash
# You can check this in the Supabase dashboard
# Storage → Buckets → "manuals" should exist
```

### 3. Estimate Time

**Expected duration: ~2-3 hours** for 79 PDFs
- PDF upload: ~10s per PDF
- Text extraction: ~20s per PDF  
- Embedding generation: ~30s per PDF
- Batch processing: 5 PDFs at a time

**Cost estimate (OpenAI):**
- ~15,000 embeddings (assuming avg 200 chunks/PDF)
- text-embedding-3-small: $0.00002 per 1K tokens
- Estimated cost: **~$1-2** for all embeddings

## Running the Seed Script

### Option 1: Full Seed (Recommended)

```bash
cd backend
npm run seed:carrier
```

This will:
- Back up your data (safe!)
- Clean the database
- Process all 79 PDFs
- Show progress in real-time

### Option 2: Manual Run with tsx

```bash
cd backend
tsx scripts/seed-carrier-manuals.ts
```

## What to Expect

### Console Output

```
╔════════════════════════════════════════╗
║  CARRIER MANUAL BULK SEEDING SCRIPT    ║
╚════════════════════════════════════════╝

📦 Step 1: Backing up existing data...
✅ Backup saved to: /backend/backups/backup-2026-02-02T22-30-15-123Z.json
   - Manuals: 15
   - Models: 21
   - Sections: 7234

🧹 Step 2: Cleaning database...
   - Deleted 7234 manual sections
   - Deleted 15 manuals
   - Deleted 21 models
   - Deleted 17 product lines
✅ Database cleaned successfully

🏢 Step 3: Ensuring Carrier OEM setup...
   - Carrier OEM exists
   - Created Chillers product line

🔍 Step 4: Scanning PDFs...
✅ Found 79 PDFs across 22 model folders
   - Total size: 912.00 MB

⚙️  Step 5: Processing 79 PDFs (batch size: 5)...

🔄 Processing batch 1/16

📄 Processing: 19XR-XRV/19XR-CLT-14SS.pdf
   ✓ Created model: 19XR-XRV
   - Uploading to Supabase...
   ✓ Uploaded to storage
   ✓ Created manual record (controls)
   - Extracting content...
   ✓ Extracted 245823 characters, 12 tables
   - Chunking content...
   ✓ Created 203 chunks
   - Processed chunks 1-10/203
   - Processed chunks 11-20/203
   ...
✅ Completed: 19XR-XRV/19XR-CLT-14SS.pdf
   Progress: 1/79 (1.3%)
```

### Final Summary

```
=================================
📊 SEEDING COMPLETE
=================================
Total PDFs: 79
Processed: 79
Failed: 0
Total Chunks: 15,428
Total Size: 912.00 MB
Duration: 142.3 minutes
Avg Time/PDF: 108.1s

✅ Seeding completed successfully!
```

## After Seeding

### Verify the Data

1. **Check the database:**
```bash
# Connect to your database and run:
SELECT COUNT(*) FROM manuals;           -- Should be 79
SELECT COUNT(*) FROM models;            -- Should be 22
SELECT COUNT(*) FROM manual_sections;   -- Should be ~15,000+
```

2. **Test the search:**
   - Open the app
   - Search for "19XR"
   - You should see multiple manuals

3. **Test the chat:**
   - Select a unit
   - Ask a question about it
   - The AI should have access to the manual content

## Configuration Options

You can modify these in the script if needed:

```typescript
const BATCH_SIZE = 5;           // PDFs processed concurrently (increase if you have good bandwidth)
const MAX_RETRIES = 3;          // Retry failed PDFs this many times
const chunkBatchSize = 10;      // Chunks processed concurrently for embeddings
```

## Troubleshooting

### "Upload failed: Bucket not found"
- Create the `manuals` bucket in Supabase dashboard
- Make sure it's public or has proper RLS policies

### "Insufficient text extracted from PDF"
- Some PDFs may be image-based and need OCR
- The script will skip these and log them as failed

### "Rate limit exceeded" (OpenAI)
- The script has built-in retry logic
- Reduce `chunkBatchSize` to slow down embedding generation

### "Out of memory"
- Reduce `BATCH_SIZE` from 5 to 2 or 3
- Process PDFs in smaller groups

## Restoring from Backup

If something goes wrong:

```typescript
// Create a restore script or manually:
const backup = require('./backups/backup-{timestamp}.json');

// Restore models
for (const model of backup.data.models) {
  await prisma.model.create({ data: model });
}

// Restore manuals
for (const manual of backup.data.manuals) {
  await prisma.manual.create({ data: manual });
}

// Note: Sections with embeddings would need special handling
```

## Next Steps

After seeding:

1. **Test thoroughly** - Try searching for different models
2. **Monitor performance** - Check if vector search is fast enough
3. **Add more OEMs** - You can create similar scripts for other manufacturers
4. **Update embeddings** - If you change the embedding model, you'll need to regenerate

## Questions?

- Check the logs in the console
- Review the backup file to see what was deleted
- Check Supabase storage to verify uploads
- Use Prisma Studio to inspect the database: `npm run db:studio`
