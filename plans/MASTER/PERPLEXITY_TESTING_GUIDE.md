# Perplexity Auto-Ingestion Testing Guide

## 🚀 **Quick Start**

### **1. Get Perplexity API Key**
1. Go to https://www.perplexity.ai/settings/api
2. Create new API key
3. Copy the key

### **2. Add to Environment**
```bash
# Edit backend/.env.development
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx
```

### **3. Restart Backend**
```bash
cd backend
npm run dev
```

---

## 🧪 **Test Cases**

### **Test 1: Manual Already in Database**
Should return existing manual instantly (no Perplexity call)

```bash
curl -X GET "http://localhost:3000/api/discovery/search?oem=Carrier&model=25VNA8" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**:
```json
{
  "success": true,
  "source": "database",
  "manuals": [
    {
      "id": "...",
      "title": "Infinity Series 25VNA8 Service and Troubleshooting Guide",
      "type": "service",
      "pageCount": 60,
      "sectionsCount": 123
    }
  ]
}
```

---

### **Test 2: Manual NOT in Database (Auto-Discovery)**
Should trigger Perplexity search → download → process

```bash
curl -X GET "http://localhost:3000/api/discovery/search?oem=Carrier&model=19XR" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected** (30-60 seconds):
```json
{
  "success": true,
  "source": "discovery",
  "message": "🎉 We just added this manual to our database!",
  "manual": {
    "id": "...",
    "title": "AquaEdge 19XR Service Manual",
    "pageCount": 150,
    "sectionsCreated": 85
  }
}
```

**Backend Logs Should Show**:
```
============================================================
🤖 AUTO-INGEST: Carrier 19XR
============================================================

📋 Step 1: Checking database...
⚠️  Manual not found in database

🔍 Step 2: Searching with Perplexity...
   → Testing shareddocs.com...
✅ Found manual: AquaEdge 19XR Service Manual
   Source: shareddocs.com
   URL: https://www.shareddocs.com/hvac/docs/.../19xr.pdf

📥 Step 3: Downloading PDF...
   → Testing HEAD request...
   ✅ PDF verified: 12.5 MB, directly downloadable
✅ Downloaded: 12.50 MB

☁️  Step 4: Uploading to Supabase...
✅ Uploaded to: carrier-19xr-1706123456789.pdf

💾 Step 5: Creating database records...
✅ Manual record created: abc123...

⚙️  Step 6: Processing PDF...
   Extracting text...
   Chunking...
   Embedding (85 chunks)...
✅ Processing complete:
   Pages: 150
   Sections: 85
   Avg tokens/section: 650

🎉 AUTO-INGEST COMPLETE!
============================================================
```

---

### **Test 3: Manual Not Found Anywhere**
Should fail gracefully

```bash
curl -X GET "http://localhost:3000/api/discovery/search?oem=Carrier&model=FAKEMODEL999" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**:
```json
{
  "success": false,
  "source": "discovery",
  "message": "Manual not found in database or online",
  "error": "No direct-download PDF found from authorized sources"
}
```

---

### **Test 4: Direct Discovery (Force Discovery)**
Bypasses database check, directly triggers Perplexity

```bash
curl -X POST "http://localhost:3000/api/discovery/manual" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oem": "Carrier",
    "modelNumber": "30XA"
  }'
```

**Use cases**:
- Admin wants to re-ingest a manual with better version
- User knows manual exists but isn't in DB
- Force refresh of outdated manual

---

## 📊 **Monitoring**

### **Check Processing Status**
```bash
curl -X GET "http://localhost:3000/api/discovery/status/MANUAL_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "id": "...",
  "status": "active",  // or "processing", "error"
  "title": "AquaEdge 19XR Service Manual",
  "pageCount": 150,
  "sectionsProcessed": 85,
  "sourceUrl": "https://www.shareddocs.com/...",
  "createdAt": "2026-01-25T..."
}
```

---

## 🔍 **Debugging**

### **Check if Perplexity Key Works**
```bash
# Quick test (using curl)
curl -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [
      {
        "role": "user",
        "content": "Find the direct PDF link for Carrier AquaEdge 19XR service manual on shareddocs.com"
      }
    ]
  }'
```

### **Common Errors**

| Error | Cause | Fix |
|-------|-------|-----|
| `PERPLEXITY_API_KEY is not set` | Missing env var | Add key to `.env.development` |
| `Perplexity could not find a valid manual` | Manual not on whitelisted domains | Try different model or add domain |
| `PDF verification failed` | URL has captcha/login | Perplexity found wrong source |
| `Supabase upload failed` | Bucket permissions | Ensure 'manuals' bucket exists and is public |
| `Processing failed` | PDF corrupted or too large | Check PDF manually |

---

## 🎯 **Success Criteria**

- [x] Database check completes in <100ms
- [x] Perplexity search completes in <10s
- [x] PDF download completes in <30s
- [x] PDF processing completes in <60s
- [x] Total end-to-end: <90s for new manual
- [x] Second search for same manual: <100ms (database hit)

---

## 🔐 **Rate Limits**

### **Perplexity**
- Free tier: 50 requests/day
- Paid tier: Unlimited
- Our rate: ~1 request per unique model
- Est. cost: $0.001 per request

### **OpenAI (Embeddings)**
- Limited by your OpenAI account
- ~85 embedding calls per manual
- Est. cost: $0.003 per manual

**Total cost per new manual**: ~$0.004

---

## 📈 **Optimization Tips**

1. **Pre-seed popular models** to avoid Perplexity calls
2. **Cache Perplexity results** for 30 days (in case user searches again)
3. **Batch processing** for multiple models (if user uploads list)
4. **Background jobs** to process async (don't block user)
5. **CDN for PDFs** to speed up downloads

---

**Last Updated**: 2026-01-25  
**Next Test**: AquaEdge 19XR (user requested)
