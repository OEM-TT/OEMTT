# Dashboard Delete & Edit Features

## Overview
Added comprehensive delete and edit functionality to the manuals management dashboard, including:
- Delete buttons for all taxonomy levels (categories, sub-categories, product lines, models, manuals)
- Confirmation dialogs before deletion
- Proper cleanup when deleting manuals (storage bucket + database)
- Model detail view modal with manual management
- In-place manual type editing

## Backend Changes

### 1. New Taxonomy Controller Functions (`backend/src/controllers/taxonomy.controller.ts`)

#### `getModelDetails()`
- Fetches a model with all its details including:
  - Product line, sub-category, category, OEM hierarchy
  - All associated manuals
- Used to populate the model detail modal

#### `deleteCategory()`
- Deletes an equipment category
- **Safety check**: Prevents deletion if category has sub-categories
- Returns error message if validation fails

#### `deleteSubCategory()`
- Deletes a sub-category
- **Safety check**: Prevents deletion if sub-category has product lines
- Returns error message if validation fails

#### `deleteProductLine()`
- Deletes a product line
- **Safety check**: Prevents deletion if product line has models
- Returns error message if validation fails

#### `deleteModel()`
- Deletes a model
- **Safety check**: Prevents deletion if model has manuals
- Returns error message: "Delete the manuals first"

### 2. New Manual Controller Functions (`backend/src/controllers/manuals.controller.ts`)

#### `updateManual()`
- Updates manual properties:
  - `manualType` (installation, service, parts, technical, etc.)
  - `title`
  - `revision`
- Used for in-place editing in the model detail modal

#### `deleteManual()`
- Comprehensive manual deletion:
  1. **Deletes PDF from Supabase storage bucket** (via `storagePath`)
  2. **Deletes manual record from database**
  3. **Cascades to delete all related sections and embeddings** (Prisma relationship)
- Handles storage errors gracefully (continues with DB deletion even if storage fails)

### 3. Route Updates

#### Taxonomy Routes (`backend/src/routes/taxonomy.routes.ts`)
```typescript
// New endpoints
GET    /api/taxonomy/models/:id      // Get model details
DELETE /api/taxonomy/categories/:id   // Delete category
DELETE /api/taxonomy/sub-categories/:id  // Delete sub-category
DELETE /api/taxonomy/product-lines/:id   // Delete product line
DELETE /api/taxonomy/models/:id       // Delete model
```

#### Manual Routes (`backend/src/routes/manuals.routes.ts`)
```typescript
// New endpoints
PATCH  /api/manuals/:id    // Update manual (type, title, revision)
DELETE /api/manuals/:id    // Delete manual (storage + DB)
```

## Frontend Changes

### 1. UI Updates (`backend/src/public/dashboard.html`)

#### Taxonomy Tree Enhancements
- **Delete buttons** added to each taxonomy level:
  - Categories
  - Sub-categories
  - Product lines
  - Models
- **Hover-activated delete icons** (red trash icon)
- **Click prevention** on delete buttons using `event.stopPropagation()`
- **Changed model click behavior**: Now opens model detail modal instead of selecting for upload

#### New Model Detail Modal
Shows comprehensive model information:
- **Model Info Card**:
  - Model number, OEM, category path
  - Status (Active/Discontinued badge)
  - Variants list
- **Manuals Section**:
  - List of all manuals with:
    - Title
    - **Editable manual type dropdown** (changes saved immediately)
    - Page count
    - Upload date
    - Delete button per manual
  - "Add Manual" button (selects model and switches to upload section)
  - Empty state when no manuals exist

### 2. JavaScript Functions

#### Delete Functions (with Confirmation)
```javascript
// All delete functions show confirmation dialogs
deleteCategoryConfirm(id, name)
deleteSubCategoryConfirm(id, name)
deleteProductLineConfirm(id, name)
deleteModelConfirm(id, modelNumber)
deleteManualConfirm(id, title)

// Generic delete handler
deleteNode(endpoint, id, typeName)
```

**Confirmation Dialog Messages:**
- **Category**: "Are you sure? This will only work if the category has no sub-categories."
- **Sub-Category**: "Are you sure? This will only work if the sub-category has no product lines."
- **Product Line**: "Are you sure? This will only work if the product line has models."
- **Model**: "Are you sure? This will only work if the model has no manuals. Delete the manuals first."
- **Manual**: "Are you sure? This will permanently delete: The PDF file from storage, All manual sections, All embeddings. This action cannot be undone."

#### Model Detail Functions
```javascript
showModelDetail(modelId)              // Fetches and displays model details
selectModelForUpload(...)             // Helper to switch to upload section
updateManualType(manualId, newType)   // Saves manual type change
```

## Safety Features

### 1. Confirmation Dialogs
- **All deletes require user confirmation**
- **Clear warning messages** about what will be deleted
- **Cascade warnings** (e.g., "Delete sub-categories first")

### 2. Server-Side Validation
- **Referential integrity checks** before deletion
- **Clear error messages** when deletion is blocked
- **Graceful error handling** (storage errors don't prevent DB cleanup)

### 3. Visual Feedback
- **Hover states** show delete buttons only when needed
- **Loading states** during async operations
- **Success/error alerts** after operations
- **Immediate UI refresh** after successful deletion

## User Workflow Examples

### Delete a Model
1. User hovers over model in taxonomy tree
2. Red trash icon appears
3. User clicks trash icon
4. Confirmation dialog: "Delete model? Only works if no manuals."
5. If model has manuals → Server returns error → User sees error message
6. If model has no manuals → Model deleted → Tree refreshes → Success message

### Edit Manual Type
1. User clicks on a model
2. Model detail modal opens showing all manuals
3. User clicks manual type dropdown (currently "Installation")
4. User selects "Service Manual"
5. Change immediately saved to database
6. No page refresh needed

### Delete a Manual
1. User opens model detail modal
2. User clicks trash icon next to a manual
3. Confirmation dialog: "Delete manual? Will delete PDF, sections, embeddings. Cannot be undone."
4. User confirms
5. Backend:
   - Deletes PDF from `manuals` storage bucket
   - Deletes manual record from `manuals` table
   - Prisma cascades deletion to `manual_sections` table
6. Model detail modal refreshes to show updated manual count

## Database Cascade Behavior

When a manual is deleted:
```
Manual (deleted)
  └─> Manual Sections (cascade deleted by Prisma)
       └─> Question references (set to null)
       └─> Vector embeddings (deleted with sections)
```

When a model is deleted (only if no manuals):
```
Model (deleted)
  ├─> Units (cannot delete if units exist)
  └─> Chat Sessions (cannot delete if sessions exist)
```

## Storage Cleanup

Manual deletion properly cleans up:
1. **Supabase Storage**: PDF file at `storagePath` (e.g., `Carrier/30HXC/manual.pdf`)
2. **PostgreSQL Database**: `manuals` table record
3. **Vector Database**: `manual_sections` table records (via cascade)
4. **Embeddings**: Vector embeddings stored in `manual_sections.embedding` field

## Testing Checklist

- [ ] Delete category with sub-categories (should fail)
- [ ] Delete empty category (should succeed)
- [ ] Delete sub-category with product lines (should fail)
- [ ] Delete empty sub-category (should succeed)
- [ ] Delete product line with models (should fail)
- [ ] Delete empty product line (should succeed)
- [ ] Delete model with manuals (should fail)
- [ ] Delete empty model (should succeed)
- [ ] Delete manual (should succeed and clean up storage)
- [ ] Change manual type in model detail modal (should save)
- [ ] Click model in tree (should open detail modal)
- [ ] Add manual from model detail modal (should select model and switch to upload)
- [ ] Verify PDF deleted from Supabase storage bucket after manual deletion
- [ ] Verify manual sections deleted from database after manual deletion

## Notes

- All delete endpoints are currently **public** (no auth) for dashboard use
- In production, add authentication middleware to protect these endpoints
- Storage deletion errors are logged but don't prevent database cleanup
- Model detail modal automatically closes after deleting a model
- Taxonomy tree refreshes after any successful delete operation
