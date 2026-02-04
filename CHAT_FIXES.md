# Chat UI Fixes

## 🐛 **Issues Fixed**

### 1. **Duplicate Key Error**
**Problem:** React warning "Encountered two children with the same key"
- Message IDs were colliding between loaded history and new messages
- IDs like `user-${msg.id}` could duplicate

**Solution:**
- Added unique prefixes and timestamps to all message IDs:
  - New messages: `user-${timestamp}` and `ai-${timestamp}`
  - History messages: `history-user-${msg.id}-${counter}` and `history-ai-${msg.id}-${counter}`
  - System messages: `system-welcome-${timestamp}`
  - Warning messages: `warning-${timestamp}-${random}`

### 2. **Too Many Table Sources**
**Problem:** Sources section showing every table entry (10+ items)
- Example: `[TABLE] cause system damage`, `[TABLE] 8733834009`, etc.
- Cluttered the UI and wasn't helpful
- User only wanted the main page reference

**Solution:**
- Created `formatSources()` helper function that:
  - **Filters out table entries** (anything with `[TABLE]` in the title)
  - **Deduplicates page references** for the same manual
  - **Limits to 3 page refs per manual** (max)
  - **Limits to 3 manuals total** (max)
  - Groups sources by manual title

## ✅ **Result**

### Before Sources Display:
```
📖 Sources:
• [TABLE] cause system damage., | damage., Page 7
• [TABLE] 8733834009, Pages 32-34
• Introduction, Page 1
• [TABLE] cause system damage., | damage., Page 7
• [TABLE] Aquazone™, Page 1
• [TABLE] • | | GENERAL WORK AREA, Page 2
• [TABLE] • | | ADDITIONAL CONTROLS OPTIONS WIRING, Page 1
• [TABLE] MERV 13 (L x H) |, Page 7
... (10+ more)
```

### After Sources Display:
```
📖 **Sources:**
• 50W - 50WC-1SI, Page 1
• Introduction, Page 1
```

## 🎯 **What Changed**

### Files Modified:
- `app/(modals)/unit-chat.tsx`

### Key Changes:
1. **Added `formatSources()` helper**:
   - Filters out table entries
   - Deduplicates pages
   - Limits output to 3 manuals, 3 pages each
   
2. **Fixed all message IDs**:
   - Unique prefixes for different message types
   - Timestamp-based IDs for new messages
   - Counter-based IDs for history messages
   - Random suffix for warning messages

3. **Applied to both locations**:
   - `loadPreviousChat()` - When loading history
   - `onComplete()` - When receiving new responses

## 🧪 **Testing**

1. ✅ No more "duplicate key" React warnings
2. ✅ Sources are clean and concise (1-3 entries max)
3. ✅ Same experience whether viewing live response or loaded history
4. ✅ Markdown still renders properly with sources
5. ✅ Streaming still works smoothly

---

**Result:** Clean, professional chat UI with clear source attribution and no React warnings! 🎉
