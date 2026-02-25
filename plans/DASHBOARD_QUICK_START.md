# Dashboard Quick Start Guide
## Get started with the new Manuals Management Dashboard in 2 minutes

---

## 🚀 START THE DASHBOARD

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

### 2. Open Dashboard
Open your browser to: **http://localhost:3000/dashboard**

### 3. Navigate to Manuals Tab
Click the **"Manuals"** tab in the navigation bar

---

## 🎯 QUICK WALKTHROUGH

### View Taxonomy Tree
1. The tree loads automatically
2. Click **"HVAC"** to expand
3. Click **"Carrier"** to expand
4. Continue expanding to see categories, sub-categories, product lines, and models
5. Each model shows how many manuals it has (e.g., "3 manuals")

### Add a New Category
1. Click **"Add Category"** button (purple)
2. Select an OEM from dropdown (e.g., "Carrier")
3. Enter name: `"Test Category"`
4. Click **"Create Category"**
5. Tree refreshes → you should see your new category!

### Upload a Manual
1. **Select a model** by clicking on it in the tree
   - Example: Click on "19DV" under Carrier → Chillers → 19DV Series
   - The "Selected Model" box will show the full path
2. **Choose manual type** from dropdown
   - Options: Installation, Service, Parts, Technical, etc.
3. **Upload PDF**
   - Drag-and-drop a PDF file, OR
   - Click the upload area to browse for a file
4. Click **"Upload & Process"**
5. Watch the progress bar:
   - Uploading... (10%)
   - Extracting text... (30%)
   - Processing... (50-100%)
   - Complete! (100%)
6. Tree refreshes with updated manual count

---

## ✅ VERIFY IT WORKED

### Check Database
```sql
-- See your new manual
SELECT id, title, manual_type, page_count 
FROM manuals 
ORDER BY created_at DESC 
LIMIT 1;

-- See generated sections
SELECT COUNT(*) 
FROM manual_sections 
WHERE manual_id = 'your-manual-id';

-- Check embeddings
SELECT 
  section_title,
  array_length(embedding, 1) as dimensions
FROM manual_sections 
WHERE manual_id = 'your-manual-id'
LIMIT 3;
```

### Test in Mobile App
1. Open the app
2. Search for the model you uploaded to
3. Open chat for that model
4. Ask a question about the manual
5. AI should retrieve relevant sections!

---

## 🐛 COMMON ISSUES

### "Failed to load taxonomy"
- **Fix**: Make sure backend is running
- **Check**: `http://localhost:3000/api/taxonomy/tree` returns JSON

### Upload button disabled
- **Fix**: You need to:
  1. Select a model in the tree (click on it)
  2. Upload a PDF file
  - Both must be done for button to enable

### Progress stuck at 30%
- **Fix**: Check backend console logs
- **Possible**: OpenAI API key issue or rate limit
- **Check**: `GET /api/manuals/:id/status` for error details

---

## 📚 MORE INFO

See **`MANUALS_DASHBOARD_COMPLETE.md`** for:
- Complete API documentation
- Detailed architecture
- Full testing guide
- Troubleshooting tips
- Performance considerations

---

**Happy uploading! 🎉**
