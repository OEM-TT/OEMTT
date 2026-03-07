# Taxonomy Move Operations & OEM Creation

## Overview
Added comprehensive functionality to move taxonomy items between parents and create new OEMs directly from the dashboard.

## Features Implemented

### 1. **Move Operations**
Users can now move items throughout the taxonomy hierarchy:

- **Move Categories** → Between OEMs
- **Move Sub-Categories** → Between Categories (across OEMs)
- **Move Product Lines** → Between Sub-Categories (across categories/OEMs)
- **Move Models** → Between Product Lines (across sub-categories/categories/OEMs)
- **Move Manuals** → Between Models (across product lines/sub-categories/categories/OEMs)

### 2. **OEM Creation**
- Add new OEMs directly from the dashboard
- Simple form with name (required) and description (optional)
- Button appears in the Quick Actions section (top of the list)
- OEMs are added to the HVAC industry

---

## Backend Changes

### New API Endpoints

#### Taxonomy Routes (`/api/taxonomy`)

**Create OEM:**
```
POST /oems
Body: { name: string, description?: string }
```

**Move Operations:**
```
PATCH /categories/:id/move
Body: { oemId: string }

PATCH /sub-categories/:id/move
Body: { categoryId: string }

PATCH /product-lines/:id/move
Body: { subCategoryId: string }

PATCH /models/:id/move
Body: { productLineId: string }
```

#### Manual Routes (`/api/manuals`)

**Move Manual:**
```
PATCH /:id/move
Body: { modelId: string }
```

### Controllers Updated

**`taxonomy.controller.ts`** - Added:
- `createOEM()` - Create new OEM manufacturer
- `moveCategory()` - Move category to different OEM
- `moveSubCategory()` - Move sub-category to different category
- `moveProductLine()` - Move product line to different sub-category
- `moveModel()` - Move model to different product line

**`manuals.controller.ts`** - Added:
- `moveManual()` - Move manual to different model

### Validation
All move operations include:
- Existence checks for source item
- Existence checks for destination parent
- Proper database updates with foreign key relationships maintained

---

## Frontend Changes

### Dashboard UI (`dashboard.html`)

#### 1. **Add OEM Button**
- Orange button in Quick Actions section (first button)
- Opens modal for creating new OEMs
- Modal shows "Adding to industry: HVAC"

#### 2. **Move Buttons**
Added blue "arrow-right" icons next to delete buttons for:
- Categories
- Sub-Categories
- Product Lines
- Models
- Manuals

Buttons appear on hover with tooltips indicating the destination type.

#### 3. **Move Modals**
Five new modals with cascading dropdowns:

**Move Category Modal:**
- Select destination OEM

**Move Sub-Category Modal:**
- Select destination OEM → Category

**Move Product Line Modal:**
- Select destination OEM → Category → Sub-Category

**Move Model Modal:**
- Select destination OEM → Category → Sub-Category → Product Line

**Move Manual Modal:**
- Select destination OEM → Category → Sub-Category → Product Line → Model

All modals:
- Show the item being moved
- Highlight current location with "(current)"
- Cascade-load child options as parents are selected
- Show confirmation alerts on success

#### 4. **Add OEM Modal**
Simple form with:
- Name (required)
- Description (optional)
- Validation for required fields

---

## JavaScript Functions Added

### OEM Creation
```javascript
showAddOEMModal()      // Opens the add OEM modal
createOEM()            // Submits new OEM to backend
```

### Move Modal Openers
```javascript
showMoveCategoryModal(categoryId, categoryName, currentOemId)
showMoveSubCategoryModal(subCategoryId, subCategoryName, currentCategoryId, currentOemId)
showMoveProductLineModal(productLineId, productLineName, currentSubCategoryId, currentCategoryId, currentOemId)
showMoveModelModal(modelId, modelNumber, currentProductLineId, currentSubCategoryId, currentCategoryId, currentOemId)
showMoveManualModal(manualId, manualTitle, currentModelId, currentOem, currentCategory, currentSubCategory, currentProductLine)
```

### Cascade Selectors
```javascript
loadOEMsForSelect(selectId, currentOemId)
loadCategoriesForOEM(oemId, selectId)
loadSubCategoriesForCategory(categoryId, selectId)
loadProductLinesForSubCategory(subCategoryId, selectId)
loadModelsForProductLine(productLineId, selectId)
fetchTaxonomyData()  // Helper to fetch full tree
```

### Move Executors
```javascript
executeMoveCategory()      // Moves category to new OEM
executeMoveSubCategory()   // Moves sub-category to new category
executeMoveProductLine()   // Moves product line to new sub-category
executeMoveModel()         // Moves model to new product line
executeMoveManual()        // Moves manual to new model
```

---

## User Workflow Examples

### Example 1: Move a Model to a Different Product Line

1. Navigate to **Manuals Management** page
2. Expand the taxonomy tree to find the model
3. Hover over the model → Click the blue arrow icon
4. **Move Model Modal** opens:
   - Current location is pre-loaded
   - Select destination OEM (dropdown)
   - Select destination Category (cascades from OEM)
   - Select destination Sub-Category (cascades from Category)
   - Select destination Product Line (cascades from Sub-Category)
5. Click **Move**
6. Confirmation alert: "Model moved successfully!"
7. Tree refreshes with model in new location

### Example 2: Create a New OEM

1. Navigate to **Manuals Management** page
2. In the **Quick Actions** section, click **Add OEM** (first button, orange)
3. **Add OEM Modal** opens:
   - Shows "Adding to industry: HVAC"
   - Enter OEM name (e.g., "Rheem", "York", "Lennox")
   - Optionally add description
4. Click **Create OEM**
5. Confirmation alert: "OEM 'Rheem' created successfully!"
6. Tree refreshes showing new OEM under HVAC industry

### Example 3: Move a Manual to a Different Model

1. Navigate to **Manuals Management** page
2. Expand tree → Click on a Model
3. **Model Detail Modal** opens showing all manuals
4. Click the blue arrow icon next to a manual
5. **Move Manual Modal** opens:
   - Full cascade: OEM → Category → Sub-Category → Product Line → Model
6. Select all destination levels
7. Click **Move**
8. Confirmation alert: "Manual moved successfully!"
9. Both modals close, tree refreshes

---

## Database Impact

### Tables Updated

**`o_e_ms`:**
- New records created via `createOEM()`

**`equipment_categories`:**
- `oem_id` updated via `moveCategory()`

**`equipment_sub_categories`:**
- `category_id` updated via `moveSubCategory()`

**`product_lines`:**
- `sub_category_id` updated via `moveProductLine()`
- `category` field also updated (denormalized)

**`models`:**
- `product_line_id` updated via `moveModel()`

**`manuals`:**
- `model_id` updated via `moveManual()`

### Data Integrity
- All foreign keys remain valid after moves
- Related data (sections, embeddings, chat sessions) stay linked to original IDs
- No cascading deletes triggered by moves

---

## Testing Checklist

### OEM Creation
- [ ] Create OEM with name only
- [ ] Create OEM with name + description
- [ ] Verify new OEM appears in taxonomy tree
- [ ] Verify new OEM appears in all move modal dropdowns
- [ ] Try to create OEM without name (should show alert)
- [ ] Try to create duplicate OEM name (should fail with error)

### Move Operations
- [ ] Move category between OEMs
- [ ] Move sub-category between categories (same OEM)
- [ ] Move sub-category between categories (different OEM)
- [ ] Move product line between sub-categories
- [ ] Move model between product lines
- [ ] Move manual between models
- [ ] Verify cascade dropdowns populate correctly
- [ ] Verify current location is marked in dropdowns
- [ ] Verify tree refreshes after each move
- [ ] Verify model detail modal closes after manual move

### Edge Cases
- [ ] Try to move without selecting destination (should show alert)
- [ ] Move item back to its original location (should work)
- [ ] Move multiple items in sequence
- [ ] Refresh page after move (should persist)
- [ ] Verify frontend search still finds moved items
- [ ] Verify chat history references still work after moves

---

## Notes

### Current Limitations
1. **No bulk moves**: Each item must be moved individually
2. **No move history**: No audit trail of moves (consider adding later)
3. **No undo**: Moves are permanent (can only move back manually)

### Future Enhancements
1. Add bulk move/reorganization tools
2. Add move history/audit log
3. Add "Move All" options (e.g., move all models in a product line)
4. Add drag-and-drop move interface
5. Add OEM editing (description, metadata)
6. Add OEM deletion (with validation for empty OEMs only)

### Production Considerations
- All taxonomy endpoints are currently public (for dashboard access)
- In production, add authentication middleware
- Consider rate limiting for move operations
- Add logging for all move operations for audit trail
- Add webhooks/notifications for large-scale taxonomy changes

---

## Summary

The dashboard now provides full CRUD + Move operations for the entire taxonomy:

✅ **Create**: OEMs, Categories, Sub-Categories, Product Lines, Models, Manuals  
✅ **Read**: Full taxonomy tree, model details  
✅ **Update**: Manual types  
✅ **Delete**: Categories, Sub-Categories, Product Lines, Models, Manuals  
✅ **Move**: Categories, Sub-Categories, Product Lines, Models, Manuals (NEW)

This gives administrators complete control over the equipment taxonomy structure without needing direct database access.
