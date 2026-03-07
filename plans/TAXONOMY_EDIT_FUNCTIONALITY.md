# Taxonomy Edit Functionality

## Overview
Added comprehensive edit functionality for all taxonomy items and manuals, allowing administrators to rename and update details directly from the dashboard.

## Features Implemented

### Editable Items
- ✏️ **OEMs** → Name, Website
- ✏️ **Categories** → Name
- ✏️ **Sub-Categories** → Name
- ✏️ **Product Lines** → Name
- ✏️ **Models** → Model Number
- ✏️ **Manuals** → Title, Revision

---

## Backend Changes

### New API Endpoints

**Taxonomy Updates:**
```
PATCH /api/taxonomy/oems/:id
Body: { name: string, website?: string }

PATCH /api/taxonomy/categories/:id
Body: { name: string, description?: string }

PATCH /api/taxonomy/sub-categories/:id
Body: { name: string, description?: string }

PATCH /api/taxonomy/product-lines/:id
Body: { name: string, description?: string }

PATCH /api/taxonomy/models/:id
Body: { modelNumber: string }
```

**Manual Updates** (Already existed, confirmed working):
```
PATCH /api/manuals/:id
Body: { title?: string, manualType?: string, revision?: string }
```

### Controller Functions Added

**`taxonomy.controller.ts`:**
- `updateOEM()` - Update OEM name and website with duplicate name validation
- `updateCategory()` - Update category name
- `updateSubCategory()` - Update sub-category name
- `updateProductLine()` - Update product line name
- `updateModel()` - Update model number

### Validation
- All update operations check for required fields (name/modelNumber)
- OEM updates check for duplicate names (case-insensitive, excluding current OEM)
- All operations validate that the item exists before updating

---

## Frontend Changes

### UI Additions

#### 1. **Edit Buttons in Taxonomy Tree**
Every taxonomy level now has a **pencil/edit icon** (gray) that appears on hover:

```
[OEM]           🏢 Carrier              ✏️ (edit)
  [Category]      📁 Chillers           ✏️ (edit) ➡️ (move) 🗑️ (delete)
    [Sub-Category]  📂 Water-Cooled    ✏️ (edit) ➡️ (move) 🗑️ (delete)
      [Product Line]  📚 30HXC          ✏️ (edit) ➡️ (move) 🗑️ (delete)
        [Model]        📦 30HXC080      ✏️ (edit) ➡️ (move) 🗑️ (delete)
```

#### 2. **Edit Button in Model Detail Modal**
Manual list now shows:
- ✏️ **Edit** (gray) - Edit title/revision
- ➡️ **Move** (blue) - Move to different model
- 🗑️ **Delete** (red) - Delete manual

#### 3. **Edit Modals**
Six new edit modals with color-coded save buttons:

| Modal | Fields | Save Button Color |
|-------|--------|-------------------|
| Edit OEM | Name, Website | Orange |
| Edit Category | Name | Purple |
| Edit Sub-Category | Name | Indigo |
| Edit Product Line | Name | Blue |
| Edit Model | Model Number | Green |
| Edit Manual | Title, Revision | Red |

All modals:
- Pre-populate current values
- Show clear, focused forms
- Validate required fields
- Show success/error alerts
- Auto-refresh tree after save

---

## JavaScript Functions Added

### Modal Openers
```javascript
showEditOEMModal(oemId, oemName)
showEditCategoryModal(categoryId, categoryName)
showEditSubCategoryModal(subCategoryId, subCategoryName)
showEditProductLineModal(productLineId, productLineName)
showEditModelModal(modelId, modelNumber)
showEditManualModal(manualId, manualTitle, manualRevision)
```

### Save Executors
```javascript
executeEditOEM()           // Updates OEM name/website, refreshes dropdowns
executeEditCategory()      // Updates category name
executeEditSubCategory()   // Updates sub-category name
executeEditProductLine()   // Updates product line name
executeEditModel()         // Updates model number
executeEditManual()        // Updates manual title/revision, refreshes model detail modal
```

---

## User Workflows

### Example 1: Edit an OEM Name

1. Hover over an OEM in the taxonomy tree
2. Click the **pencil (✏️) icon**
3. **Edit OEM Modal** opens with current name pre-filled
4. Edit the name (e.g., "Carrier" → "Carrier Corporation")
5. Optionally add/update website URL
6. Click **Save** (orange button)
7. Alert: "OEM updated successfully!"
8. Tree refreshes showing new name
9. OEM dropdowns (in Add Category, Move operations) also update

### Example 2: Edit a Model Number

1. Expand tree to find a model
2. Hover over the model → Click **pencil (✏️) icon**
3. **Edit Model Modal** opens
4. Update model number (e.g., "30HXC080" → "30HXC0080")
5. Click **Save** (green button)
6. Alert: "Model updated successfully!"
7. Tree refreshes showing new model number

### Example 3: Edit a Manual Title

1. Click on a model to open Model Detail Modal
2. In the manuals list, hover over a manual
3. Click the **pencil (✏️) icon** (first button)
4. **Edit Manual Modal** opens
5. Update title and/or revision number
6. Click **Save** (red button)
7. Alert: "Manual updated successfully!"
8. Model Detail Modal refreshes showing updated info

---

## Button Order and Colors

All taxonomy items follow this consistent button order (left to right):
1. ✏️ **Edit** (gray) - Edit name/details
2. ➡️ **Move** (blue) - Move to different parent
3. 🗑️ **Delete** (red) - Delete item

OEMs only show:
- ✏️ **Edit** (gray) - No move/delete as they're top-level

Manuals in Model Detail Modal show:
- ✏️ **Edit** (gray) - Edit title/revision
- ➡️ **Move** (blue) - Move to different model
- 🗑️ **Delete** (red) - Delete manual

---

## Data Integrity

### Update Behavior
- **Names/Titles**: Updated in place, no cascading changes needed
- **Model Numbers**: Updated in models table only
- **OEM Names**: Updated in OEMs table, no foreign key impacts
- **Related Data**: All relationships (manuals, sections, embeddings, chat sessions) remain linked via IDs

### Validation
- Required fields must not be empty
- OEM names must be unique (case-insensitive)
- No duplicate name checks for other taxonomy levels (intentionally allows duplicates across different parents)

---

## Testing Checklist

### OEM Editing
- [ ] Edit OEM name only
- [ ] Edit OEM name + website
- [ ] Try to set duplicate OEM name (should show error)
- [ ] Try to set empty OEM name (should show alert)
- [ ] Verify updated OEM appears in "Add Category" dropdown
- [ ] Verify updated OEM appears in move operation dropdowns

### Category/Sub-Category/Product Line Editing
- [ ] Edit category name
- [ ] Edit sub-category name
- [ ] Edit product line name
- [ ] Verify tree refreshes after each edit
- [ ] Verify names update in place without breaking tree structure

### Model Editing
- [ ] Edit model number
- [ ] Verify model appears in new position if sort order changes
- [ ] Verify associated manuals remain linked
- [ ] Verify frontend search still finds the model

### Manual Editing
- [ ] Edit manual title only
- [ ] Edit manual revision only
- [ ] Edit both title and revision
- [ ] Verify manual shows updated info in Model Detail Modal
- [ ] Verify manual still opens correctly in PDF viewer
- [ ] Verify chat history references still work

### UI/UX
- [ ] Edit buttons appear on hover
- [ ] Edit buttons don't interfere with tree expand/collapse
- [ ] Modals pre-populate with current values
- [ ] Success alerts show for all edit operations
- [ ] Error alerts show for validation failures
- [ ] Tree refreshes automatically after edits
- [ ] All modals close properly after save or cancel

---

## Notes

### Current Limitations
1. **No edit history**: No audit trail of name changes (consider adding later)
2. **No bulk edit**: Must edit items one at a time
3. **No undo**: Edits are permanent (can only edit again to revert)
4. **Limited validation**: Only checks for empty required fields and OEM name duplicates

### Future Enhancements
1. Add edit history/audit log for all changes
2. Add bulk rename operations
3. Add "undo" or edit history viewer
4. Add more validation (character limits, special characters, etc.)
5. Add inline editing (click to edit, no modal)
6. Add keyboard shortcuts (e.g., E for edit)
7. Add ability to edit descriptions for categories/sub-categories/product lines
8. Add ability to edit OEM logo URLs and documentation portals

### Production Considerations
- All taxonomy endpoints are currently public (for dashboard access)
- In production, add authentication middleware
- Consider adding rate limiting for update operations
- Add logging for all edit operations for audit trail
- Add webhooks/notifications for large-scale taxonomy changes
- Consider adding approval workflow for edits (especially OEM/model changes)

---

## API Response Format

All update endpoints return:
```json
{
  "success": true,
  "message": "Item updated successfully",
  "oem": { /* updated item */ },
  "category": { /* or whatever was updated */ }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Summary

The dashboard now provides full **CRUD + Move + Edit** operations for the entire taxonomy:

✅ **Create**: OEMs, Categories, Sub-Categories, Product Lines, Models, Manuals  
✅ **Read**: Full taxonomy tree, model details  
✅ **Update**: OEMs, Categories, Sub-Categories, Product Lines, Models, Manuals (NEW)  
✅ **Delete**: Categories, Sub-Categories, Product Lines, Models, Manuals  
✅ **Move**: Categories, Sub-Categories, Product Lines, Models, Manuals  

Administrators now have complete control over the equipment taxonomy structure, including the ability to correct typos, update model numbers, rename categories, and edit manual titles without needing direct database access.
