# 🚀 Quick Start: Add Test Data to OEM TechTalk

## ✅ What You'll Get

After running the seed script, your app will have:
- **8 Real HVAC Manufacturers**: Carrier, Trane, Lennox, Rheem, American Standard, York, Goodman, Bryant
- **10 Product Lines**: Heat pumps, air conditioners, and furnaces
- **15 Real Models**: Current models (2018-2024) with actual model numbers
- **6 Service Manuals**: Metadata ready for PDF attachment

---

## 🎯 Run the Seed (Choose ONE method)

### Option 1: Supabase SQL Editor (Easiest - 2 minutes)

1. **Open Supabase Dashboard**:
   - Go to: https://app.supabase.com/project/yoggiqlslhutwjhuhqda
   - Navigate to **SQL Editor** in the left sidebar

2. **Copy & Paste**:
   - Open `/backend/db/seeds/001_hvac_data.sql`
   - Copy all contents (Cmd+A, Cmd+C)
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Cmd+Enter)

3. **Verify**:
   ```sql
   SELECT COUNT(*) FROM oems;       -- Should return 8
   SELECT COUNT(*) FROM models;     -- Should return 15
   SELECT COUNT(*) FROM manuals;    -- Should return 6
   ```

### Option 2: Command Line (psql)

```bash
cd /Users/brentpurks/Desktop/OEMTT/OEMTechTalk/backend/db/seeds

psql "postgresql://postgres:F6fwRMq5lvZM4xmG@db.yoggiqlslhutwjhuhqda.supabase.co:5432/postgres?sslmode=require" -f 001_hvac_data.sql
```

---

## ✨ Test Your Data

After seeding, test the API:

```bash
# 1. Get all OEMs
curl http://localhost:3000/api/oems

# 2. Search for a Carrier model
curl "http://localhost:3000/api/models/search?q=25VNA8"

# 3. Get Trane models
curl "http://localhost:3000/api/models/search?q=XV20i"
```

---

## 📱 Test in the App

1. **Open the App**: Make sure Expo is running (`cd /Users/brentpurks/Desktop/OEMTT/OEMTechTalk && npx expo start`)
2. **Navigate to Library**: The "Add New Unit" button should now work!
3. **Search for Models**:
   - Try searching: `25VNA8` (Carrier heat pump)
   - Try searching: `XV20i` (Trane heat pump)
   - Try searching: `XP25` (Lennox heat pump)
4. **Add a Unit**: Select a model and create your first saved unit!

---

## 📋 What's in the Data

### OEMs (8 manufacturers)
- Carrier
- Trane
- Lennox
- Rheem
- American Standard
- York
- Goodman
- Bryant

### Models (15 real current models)

**Carrier:**
- 25VNA8 (Infinity Heat Pump - 20 SEER)
- 25VNA0 (Infinity Heat Pump - 19 SEER)
- 24ACC6 (Performance AC - 16 SEER)
- 59MN7 (Comfort Furnace - 96% AFUE)

**Trane:**
- XV20i (Variable Speed Heat Pump - 21 SEER)
- XV18 (Two-Stage Heat Pump - 18 SEER)
- XR17 (Two-Stage AC - 17 SEER)

**Lennox:**
- XP25 (Signature Heat Pump - 23 SEER!)
- XP21 (Signature Heat Pump - 21 SEER)
- EL296V (Elite Furnace - 96% AFUE)

**Rheem:**
- RP20 (Prestige Heat Pump - 20 SEER)
- RA14 (Classic Plus AC - 14 SEER)

**American Standard:**
- Platinum 20 (Variable Speed Heat Pump - 20 SEER)

---

## 🎬 Next Steps

### 1. Find Service Manual PDFs

See `backend/db/seeds/README.md` for links to:
- Official OEM documentation portals
- Community manual sources
- Sample PDFs for testing

### 2. Upload PDFs to Supabase Storage

```bash
# Create storage bucket (if not exists)
supabase storage create manuals

# Upload a PDF
supabase storage upload manuals/carrier-25vna8-service.pdf ./path/to/pdf
```

### 3. Link PDFs to Manual Records

```sql
UPDATE manuals 
SET 
  file_url = 'https://yoggiqlslhutwjhuhqda.supabase.co/storage/v1/object/public/manuals/carrier-25vna8-service.pdf',
  storage_path = 'manuals/carrier-25vna8-service.pdf',
  status = 'active'
WHERE title LIKE '%25VNA8%' AND manual_type = 'service';
```

---

## 🐛 Troubleshooting

**"Relation does not exist"**: Make sure your Prisma migrations have run first.

```bash
cd backend
npx prisma migrate deploy
```

**"Duplicate key error"**: The seed has already been run. To reset:

```sql
DELETE FROM manuals;
DELETE FROM models;
DELETE FROM product_lines;
DELETE FROM oems WHERE vertical = 'HVAC';
```

Then re-run the seed.

---

## 🎉 You're Done!

Your app now has **real HVAC data** to work with. The "Add Unit" flow should now work end-to-end!

**Ready for Phase 2:** Manual Discovery & PDF Processing
