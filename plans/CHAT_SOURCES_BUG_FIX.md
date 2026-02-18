# Chat Sources Bug Fix
## Date: February 17, 2026
## Issue: Page links and Perplexity sources not clickable in chat

---

## 🐛 PROBLEM

**User Report:**
- Clicking page links in chat shows error: "Could not determine which manual this page belongs to."
- Perplexity web sources aren't clickable
- Works fine after closing and reopening chat

---

## 🔍 ROOT CAUSE - TWO SEPARATE BUGS!

### Bug #1: Manual Page Links (FIXED IN THIS FILE)
The backend was **missing the `manualId` field** when sending sources in the SSE `complete` event.

### Bug #2: Perplexity Web URLs (SEE WEB_SOURCES_CLICKABLE_FIX.md)
The backend was **not sending `sources` at all** for Perplexity responses.

### Backend Code (Before):
```typescript
sources: context.relevantSections.map(s => ({
  title: s.manualTitle,
  section: s.sectionTitle,
  page: s.pageReference,
  type: s.sectionType,
  // ❌ manualId was MISSING!
}))
```

### Frontend Code:
```typescript
const sourceForPage = sources?.find(s =>
  s.pageReference?.includes(`Page ${pageNumber}`) ||
  s.pageReference?.includes(`${pageNumber}`)
);
const manualId = sourceForPage?.manualId || sources?.[0]?.manualId;
// ❌ manualId was undefined, causing the error alert
```

### Why It Worked After Reopening:
When the chat is reopened, messages are loaded from the database via `getChatSession()`, which includes the full source data with `manualId` (from the `answerSources` JSON field in the database).

---

## ✅ SOLUTION

### 1. Added `manualId` to Backend SSE Response
**File**: `backend/src/controllers/chat.controller.ts`

```typescript
sources: context.relevantSections.map(s => ({
  title: s.manualTitle,
  section: s.sectionTitle,
  page: s.pageReference,
  type: s.sectionType,
  manualId: s.manualId,  // ✅ ADDED - needed for frontend to open PDF
}))
```

### 2. Updated TypeScript Interface
**File**: `services/api/chat.service.ts`

```typescript
export interface ChatSource {
  title?: string;
  section?: string;
  page?: string;
  pageReference?: string;  // ✅ ADDED - used in frontend
  type?: string;
  manualId?: string;  // Already existed
}
```

---

## 🧪 TESTING

### How to Test:
1. **Restart backend server** (important - code changes need to reload):
   ```bash
   cd backend
   npm run dev
   ```

2. **Test Manual Page Sources**:
   - Open chat for a unit
   - Ask a question (e.g., "What are the startup procedures?")
   - Wait for AI response with sources
   - Click a page number link (e.g., "Page 30")
   - **Expected**: PDF viewer opens to that page ✅
   - **Before**: Error "Could not determine which manual this page belongs to." ❌

3. **Test Perplexity Web Sources**:
   - Ask a question that triggers Perplexity (e.g., "Is this model still in production?")
   - Wait for response with web sources
   - Click a URL link
   - **Expected**: Browser opens to the URL ✅

4. **Verify No Regression**:
   - Close chat and reopen
   - Verify links still work ✅
   - Check chat history loads correctly ✅

---

## 📝 FILES CHANGED

1. ✅ `backend/src/controllers/chat.controller.ts` - Added `manualId` to sources
2. ✅ `services/api/chat.service.ts` - Added `pageReference` to interface

---

## 🎯 EXPECTED BEHAVIOR

### Before Fix:
```
User clicks "Page 30"
  ↓
Frontend: Looks for manualId in sources
  ↓
manualId is undefined (not sent from backend)
  ↓
Alert: "Could not determine which manual this page belongs to." ❌
```

### After Fix:
```
User clicks "Page 30"
  ↓
Frontend: Looks for manualId in sources
  ↓
manualId is found (sent from backend)
  ↓
PDF viewer opens to Page 30 ✅
```

---

## 🔄 DEPLOYMENT

### Backend:
```bash
cd backend
npm run dev  # For local testing
# OR for production:
npm run build
# Deploy to production server
```

### Frontend:
- No changes needed to frontend code
- Just restart Expo app to ensure fresh connection:
```bash
npx expo start --clear
```

---

## ✅ SUCCESS CRITERIA

- [x] Backend sends `manualId` in sources
- [x] TypeScript interface includes `pageReference`
- [x] No linter errors
- [ ] User tests and confirms links work (pending)
- [ ] No regression when reopening chat (pending)

---

## 🐛 RELATED ISSUE: Perplexity Sources

**Note**: Perplexity web sources should already be working because they parse URLs directly from the content string, not from a separate `sources` prop. If they're still not clickable, it might be a different issue (possibly React Native event handling during streaming).

**If Perplexity sources still don't work:**
1. Check console logs for any JavaScript errors
2. Verify the URL regex pattern matches correctly
3. Test with a fresh chat session after backend restart

---

## 💡 LESSONS LEARNED

1. **Always include IDs in API responses** when the frontend needs to perform actions
2. **Test streaming vs. reloaded data separately** - they follow different code paths
3. **SSE events should match database schema** for consistency
4. **Optional TypeScript fields** can hide bugs - use strict typing

---

**Status**: ✅ **FIXED & READY FOR TESTING**

Restart your backend and test it out!
