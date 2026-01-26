# Perplexity Auto-Ingestion System

**Goal**: Automatically discover, download, and process manuals on-demand when users search for models we don't have.

---

## 🎯 **System Overview**

```
User searches "Carrier 19XR" 
    ↓
Check Database
    ↓
┌─────────────┐
│ Found?      │
│ YES → Show │ ← 99% of requests (no API cost)
│ NO  → ↓    │
└─────────────┘
    ↓
Perplexity API Search
(domain: shareddocs.com, etc.)
    ↓
5-Layer Verification
    ↓
Download PDF → Supabase Bucket
    ↓
Process (chunk, embed, store)
    ↓
Return to User
    ↓
Next search = instant (from DB)
```

---

## ✅ **COMPLETED**

### **1. Perplexity Service (`backend/src/services/discovery/perplexity.ts`)**
- [x] API integration with Perplexity
- [x] Smart prompt that enforces direct-download PDFs only
- [x] Domain whitelist (shareddocs.com, carrier.com, etc.)
- [x] 5-layer verification system:
  - [x] Domain check
  - [x] HEAD request for Content-Type
  - [x] Content-Length validation (0.01MB - 100MB)
  - [x] Partial download test (first 10KB)
  - [x] PDF magic bytes verification (%PDF)
- [x] Error handling for captchas, 403s, 404s, timeouts
- [x] `findManualPDF(oem, modelNumber)` function
- [x] `verifyPDF(url)` function

---

## ✅ **COMPLETED** (Continued)

### **2. Auto-Ingestion Orchestrator**
- [x] Create `backend/src/services/discovery/autoIngest.ts`
- [x] Function: `discoverAndIngestManual(oem, modelNumber)`
  - [x] Check if manual exists in DB
  - [x] If not found → call Perplexity
  - [x] Download PDF from web URL
  - [x] Upload to Supabase bucket
  - [x] Create database record (oem, model, manual)
  - [x] **IMPROVED**: Extract product line from manual title (e.g., "AquaEdge" from "AquaEdge 19XR Service Manual")
  - [x] Trigger ingestion pipeline (extract, chunk, embed, store)
  - [x] Return manual info to user

### **3. Discovery API Endpoints & Search**
- [x] Create `backend/src/controllers/discovery.controller.ts`
- [x] Create `backend/src/routes/discovery.routes.ts`
- [x] Endpoint: `POST /api/discovery/manual`
  - [x] Validate OEM and model number
  - [x] Call auto-ingestion orchestrator
  - [x] Return manual or error
- [x] Endpoint: `GET /api/discovery/search?oem=Carrier&model=19XR`
  - [x] **TIER 1**: Standard search (OEM + Model)
  - [x] **TIER 2**: Expanded search (Product Line, Title, Variants)
  - [x] **TIER 3**: Perplexity discovery if not found
  - [x] Return source: 'database' or 'discovery'
- [x] **IMPROVED**: Multi-field search
  - [x] Search by model number
  - [x] Search by product line name (e.g., "AquaEdge")
  - [x] Search by manual title
  - [x] Search by model variants
  - [x] OEM parameter now optional (can search by model alone)
- [x] Endpoint: `GET /api/discovery/status/:manualId`
  - [x] Return processing status

## 🚧 **IN PROGRESS**

### **4. Frontend Integration**
- [ ] Update search UI to show "Searching for manual..." state
- [ ] Show "We just added this manual!" message on first discovery
- [ ] Display progress: "Downloading → Processing → Ready"
- [ ] Add "Request Manual" button for failed searches

---

## 📋 **TODO - Priority Order**

### **Phase 1: Core Functionality** (CURRENT)
1. [x] Build auto-ingestion orchestrator ✅
2. [x] Create discovery API endpoint ✅
3. [ ] **NEXT**: Add Perplexity API key to `.env`
4. [ ] Test with real Perplexity API key
5. [ ] Verify end-to-end flow with 1 manual (e.g., AquaEdge 19XR)

### **Phase 2: Error Handling & UX**
5. [ ] Add manual discovery to existing search flow
6. [ ] Implement retry logic for failed downloads
7. [ ] Add admin dashboard to see discovery requests
8. [ ] Queue system for multiple concurrent discoveries

### **Phase 3: Optimization**
9. [ ] Cache Perplexity results (avoid duplicate searches)
10. [ ] Rate limiting (max 10 discoveries per user per day)
11. [ ] Background processing queue (don't block user)
12. [ ] Analytics: Track discovery success rate

### **Phase 4: Scale & Polish**
13. [ ] Batch discovery (user uploads list of models)
14. [ ] Community validation (let users confirm accuracy)
15. [ ] Manual suggestion system (users submit URLs)
16. [ ] Auto-update check (re-check URLs monthly for new revisions)

---

## 💰 **Cost Analysis**

### **Perplexity API Pricing**
- **Model**: `sonar` (fast web search)
- **Cost**: ~$1 per 1,000 requests
- **Only charged**: When manual NOT in database

### **Example Scenario**
- **1,000 users** search across **50 unique models**
- **First search per model**: 50 Perplexity calls = **$0.05**
- **Remaining searches**: Database only = **$0.00**
- **Total**: $0.05 for 1,000 searches

### **At Scale (10,000 users)**
- Assume 500 unique models requested
- Perplexity cost: **$0.50**
- Database cost: **$0.00**
- Total for 10,000 searches: **$0.50**

**ROI**: After first request, each manual is free forever.

---

## 🔐 **Security & Legal**

### **Domain Whitelist**
Only allow direct downloads from:
- ✅ shareddocs.com (Carrier/UTC official)
- ✅ carrier.com/commercial/literature
- ✅ lennox.com/support
- ✅ trane.com/commercial/literature
- ✅ york.com/support
- ✅ daikin.com/us/support
- ✅ rheem.com/support
- ✅ goodman.com/support

### **What We Block**
- ❌ Third-party sites (ManualsLib, ScribD, etc.)
- ❌ Sites with captchas
- ❌ Login-required pages
- ❌ JavaScript-gated downloads
- ❌ Pirated content

### **Legal Compliance**
- Only OEM-authorized sources
- Respect robots.txt
- Rate-limit requests
- Store source attribution
- Allow takedown requests

---

## 🧪 **Testing Plan**

### **Unit Tests**
- [ ] Test Perplexity prompt with various OEMs
- [ ] Test PDF verification with valid/invalid URLs
- [ ] Test domain whitelist validation
- [ ] Test error handling (403, 404, timeout)

### **Integration Tests**
- [ ] End-to-end: Search → Perplexity → Download → Process
- [ ] Test with real shareddocs.com URL
- [ ] Test with blocked domain (should fail)
- [ ] Test with captcha site (should fail)

### **Load Tests**
- [ ] 10 concurrent discovery requests
- [ ] 100 searches across 10 models
- [ ] Verify no duplicate Perplexity calls

---

## 📊 **Success Metrics**

### **Key Metrics to Track**
1. **Discovery Success Rate**: % of Perplexity searches that find valid PDFs
2. **Download Success Rate**: % of found PDFs that download successfully
3. **Processing Success Rate**: % of downloaded PDFs that process without errors
4. **Cache Hit Rate**: % of searches that hit database (vs Perplexity)
5. **Average Discovery Time**: Time from search → manual ready

### **Target Goals**
- Discovery success rate: **>70%** (OEMs like Carrier)
- Download success rate: **>95%**
- Processing success rate: **>90%**
- Cache hit rate: **>95%** (after initial seeding)
- Average discovery time: **<30 seconds**

---

## 🚀 **Next Steps (Immediate)**

1. ✅ Create this plan document
2. → Build `autoIngest.ts` orchestrator
3. → Create `/api/manuals/discover` endpoint
4. → Test with Perplexity API key
5. → Integrate with frontend search

---

## 🔮 **Future Enhancements**

### **Phase 5: AI-Powered Improvements**
- Use GPT-4 to validate manual relevance before processing
- Auto-extract model variants from manual (e.g., "19XR-0500" → "19XR series")
- OCR for scanned PDFs
- Auto-translate manuals to multiple languages

### **Phase 6: Community Features**
- User-submitted manual URLs (with verification)
- Vote on manual quality/usefulness
- Report outdated or incorrect manuals
- "Most Requested Manuals" leaderboard

---

**Last Updated**: 2026-01-25  
**Status**: Phase 1 - Core Functionality (In Progress)  
**Owner**: Backend Team
