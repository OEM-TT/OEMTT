# Self-Contained Search Flow

## Overview
The Search tab is now a **complete, self-contained discovery experience**. Users can search for models, view results, browse manuals, and preview PDFs without ever leaving the Search screen.

---

## User Flow

### 1. **Search Form** (Default View)
   - Select manufacturer (Carrier auto-selected)
   - Enter model number
   - Tap "Find Product" → triggers discovery search
   - Shows progressive loading messages
   - **Popular Searches**: Tap a chip → auto-fills and searches
   - **Quick Actions**: Browse OEMs (catalog) or Scan Serial Plate (coming soon)

### 2. **Results View** (After Search)
   - Shows all matching **models** (grouped)
   - Each model card shows:
     - Model number
     - OEM + Product line
     - Number of manuals available
   - Tap a model → view its manuals
   - Back button → returns to search form

### 3. **Model Manuals View**
   - Shows all manuals for the selected model
   - Each manual card shows:
     - Manual title
     - Type (e.g., CONTROLS, SERVICE, INSTALLATION)
     - Page count
   - Tap a manual → opens PDF viewer
   - Back button → returns to results view

### 4. **PDF Viewer**
   - Preview the manual
   - Tap "Save Manual" → navigates to add-unit screen to save to library
   - Back button → returns to model-manuals view

---

## Key Features

### ✅ No Navigation Required
- Users complete the entire search → discover → preview flow in one screen
- Only leaves the Search tab when saving a manual to the library

### ✅ Multi-Step Discovery
1. **Search form** → select OEM + model
2. **Results** → grouped by model (if multiple matches)
3. **Manuals** → view all manuals for a model
4. **PDF viewer** → preview before saving

### ✅ Smart Back Navigation
- Model-manuals → Results → Search form
- Preserves search results when going back

### ✅ Progressive Loading
- Shows informative messages during discovery:
  - "Searching database..."
  - "Manual not found, searching online..."
  - "Downloading manual..."
  - "Processing PDF..."
  - "Generating AI embeddings..."

### ✅ Popular Searches Integration
- Real-time data from last 30 days
- One tap → auto-fills and searches
- Shows search count for each popular item

---

## Technical Details

### View State Management
```typescript
type ViewState = 'search' | 'results' | 'model-manuals';
```

### Data Flow
```typescript
// 1. Search → Discovery API
const results = await discoveryService.search(modelNumber, oemName);

// 2. Group manuals by model
const modelGroups: Record<string, any[]> = {};
results.manuals.forEach(manual => {
  modelGroups[manual.model.modelNumber].push(manual);
});

// 3. User selects model → filter manuals
const modelManuals = results.manuals.filter(m => 
  m.model.modelNumber === selectedModel.modelNumber
);

// 4. User selects manual → navigate to PDF viewer
router.push('/(modals)/pdf-viewer', { ... });
```

### Progressive Loading Messages
```typescript
const loadingMessages = [
  'Searching database...',
  'Manual not found, searching online...',
  'Downloading manual (this may take 30-60 seconds)...',
  'Processing PDF and extracting text...',
  'Analyzing content and creating searchable sections...',
  'Almost done, generating AI embeddings...',
];
```

---

## Comparison: Old vs New Flow

### ❌ Old Flow (Multi-Screen)
1. Search tab → enter model number
2. **Navigate to** add-unit screen
3. Select manufacturer on add-unit
4. Trigger search
5. View results on add-unit
6. Select manual
7. **Navigate to** PDF viewer
8. Save

### ✅ New Flow (Self-Contained)
1. Search tab → select manufacturer + model
2. View results (same screen)
3. View manuals for model (same screen)
4. **Navigate to** PDF viewer
5. Save

**Result**: Reduced navigation by 2 screen transitions, cleaner UX!

---

## Edge Cases Handled

### Multiple Models Found
- Groups manuals by model number
- Shows results view with model cards
- User selects which model to explore

### Single Model Found
- Still shows results view for consistency
- User can see all available manuals

### Discovery (New Manual Found)
- Shows success alert with discovery message
- Processes manual in background (30-60s)
- Returns results once complete

### No Results
- Shows "No Results" alert
- Returns to search form
- User can try different OEM or model

---

## Files Modified
- `app/(tabs)/search.tsx` - Complete rewrite with 3 view states
  - Added form with OEM selector + model input
  - Added results view (grouped models)
  - Added model-manuals view
  - Integrated discovery service
  - Progressive loading UI

## Dependencies
- `discoveryService.search()` - Backend discovery API
- `oemsService.getAll()` - Fetch manufacturers
- `discoveryService.getPopularSearches()` - Real-time popular searches
- PDF viewer modal - For manual preview

---

## Future Enhancements (Optional)
- [ ] Add filters (manual type, date, etc.)
- [ ] Add search history within Search tab
- [ ] Add "Save All Manuals" button in model-manuals view
- [ ] Add manual comparison (side-by-side view)
- [ ] Cache results for faster back navigation
- [ ] Add search suggestions as user types
