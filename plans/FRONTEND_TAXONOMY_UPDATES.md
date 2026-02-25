# Frontend Taxonomy Updates Plan
## Date: February 17, 2026
## Status: In Progress

---

## 🎯 OBJECTIVE

Update all frontend components and backend APIs to support the new equipment taxonomy structure:
- Equipment Categories (Chillers, RTUs, AHUs, etc.)
- Equipment Sub-Categories (Water-Cooled, Air-Cooled, etc.)
- Product Lines (now properly categorized)

---

## 📋 REQUIRED CHANGES

### 1. Backend API Updates

#### ✅ Database Schema (COMPLETE)
- Equipment taxonomy tables exist
- All models recategorized
- Foreign keys intact

#### 🔲 API Endpoints (TODO)
Need to add/update these endpoints:

**a) GET `/api/oems/:oemId/categories`**
```typescript
// Returns equipment categories for an OEM
Response: {
  categories: [
    {
      id: string,
      name: string,
      slug: string,
      description: string,
      icon: string,
      displayOrder: number,
      subCategoriesCount: number,
      modelsCount: number
    }
  ]
}
```

**b) GET `/api/oems/categories/:categoryId/sub-categories`**
```typescript
// Returns sub-categories for a category
Response: {
  subCategories: [
    {
      id: string,
      name: string,
      slug: string,
      description: string,
      displayOrder: number,
      productLinesCount: number,
      modelsCount: number
    }
  ]
}
```

**c) GET `/api/oems/sub-categories/:subCategoryId/product-lines`**
```typescript
// Returns product lines for a sub-category
Response: {
  productLines: [
    {
      id: string,
      name: string,
      category: string,
      description: string,
      modelsCount: number
    }
  ]
}
```

**d) UPDATE: `/api/oems/:oemId/product-lines`**
```typescript
// UPDATE to include category/sub-category info
Response: {
  productLines: [
    {
      id: string,
      name: string,
      category: string,
      description: string,
      subCategory: {        // ADD THIS
        id: string,
        name: string,
        slug: string,
        category: {
          id: string,
          name: string,
          slug: string
        }
      }
    }
  ]
}
```

**e) UPDATE: `/api/oems/product-lines/:productLineId/models`**
```typescript
// ALREADY EXISTS - just ensure it includes taxonomy info
Response: {
  models: [...],
  productLine: {
    id: string,
    name: string,
    category: string,        // Already exists
    subCategory: {           // ADD THIS
      id: string,
      name: string,
      category: {
        id: string,
        name: string
      }
    }
  }
}
```

**f) UPDATE: `/api/discovery/search`**
```typescript
// Ensure search results include full taxonomy
Response: {
  manuals: [
    {
      ...,
      model: {
        id: string,
        modelNumber: string,
        oem: string,
        productLine: string,
        category: string,           // ADD THIS
        subCategory: string         // ADD THIS
      }
    }
  ]
}
```

---

### 2. Frontend Component Updates

#### A) Search Screen (`app/(tabs)/search.tsx`)

**Current Display:**
- `{model.oem} • {model.productLine}`
- Example: "Carrier • Chillers"

**Updated Display:**
- `{model.oem} • {model.category} • {model.productLine}`
- Example: "Carrier • Rooftop Units • 48A Series"
- Or: "Carrier • Water-Cooled Chillers • 19XR-XRV Series"

**Changes Required:**
1. Update `renderResultsView()` - line 437:
   ```typescript
   <Text style={[styles.modelOem, { color: theme.colors.textSecondary }]}>
     {model.model.oem} • {model.model.category} • {model.model.productLine}
   </Text>
   ```

2. Update `renderModelManualsView()` - line 465:
   ```typescript
   <Text style={[styles.resultsSubtitle, { color: theme.colors.textSecondary }]}>
     {selectedModel.model.oem} • {selectedModel.model.category} • {selectedModel.model.productLine}
   </Text>
   ```

**Status**: ⏳ Pending backend API updates

---

#### B) Catalog Screen (`app/(modals)/catalog.tsx`)

**Current Flow:**
1. Industries → 2. Brands → 3. Product Lines → 4. Models

**Updated Flow:**
1. Industries → 2. Brands → **3. Categories** → **4. Sub-Categories** → 5. Product Lines → 6. Models

**Changes Required:**

1. **Add new view modes:**
   ```typescript
   type ViewMode = 'industries' | 'brands' | 'categories' | 'subCategories' | 'productLines' | 'models' | 'variants' | 'manuals';
   ```

2. **Add new state:**
   ```typescript
   const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
   const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
   const [categories, setCategories] = useState<Category[]>([]);
   const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
   ```

3. **Add new interfaces:**
   ```typescript
   interface Category {
     id: string;
     name: string;
     slug: string;
     description: string | null;
     icon: string | null;
     _count: {
       subCategories: number;
       models: number;
     };
   }

   interface SubCategory {
     id: string;
     name: string;
     slug: string;
     description: string | null;
     _count: {
       productLines: number;
       models: number;
     };
   }
   ```

4. **Add new handlers:**
   ```typescript
   const handleOEMPress = async (oem: OEM) => {
     setSelectedOEM(oem);
     setViewMode('categories');  // Changed from 'productLines'
     // Load categories
   };

   const handleCategoryPress = async (category: Category) => {
     setSelectedCategory(category);
     setViewMode('subCategories');
     // Load sub-categories
   };

   const handleSubCategoryPress = async (subCategory: SubCategory) => {
     setSelectedSubCategory(subCategory);
     setViewMode('productLines');
     // Load product lines for this sub-category
   };
   ```

5. **Update breadcrumb:**
   ```typescript
   const getBreadcrumb = () => {
     const parts: string[] = [];
     if (selectedIndustry) parts.push(selectedIndustry);
     if (selectedOEM) parts.push(selectedOEM.name);
     if (selectedCategory) parts.push(selectedCategory.name);        // ADD
     if (selectedSubCategory) parts.push(selectedSubCategory.name);  // ADD
     if (selectedProductLine) parts.push(selectedProductLine.name);
     if (selectedModel) parts.push(selectedModel.modelNumber);
     if (selectedVariant) parts.push(selectedVariant.name);
     return parts.join(' > ');
   };
   ```

6. **Add render views:**
   ```typescript
   if (viewMode === 'categories') {
     return renderCategories();
   }

   if (viewMode === 'subCategories') {
     return renderSubCategories();
   }
   ```

**Status**: ⏳ Pending (requires backend API endpoints)

---

#### C) Chat Screen (`app/(modals)/unit-chat.tsx`)

**Current**: Already displays model info in header
**Update Required**: Ensure taxonomy info is shown if available

**Changes:**
- Update model info display to include category
- Example: "Carrier 48A • Rooftop Units"

**Location**: Header area where model is displayed

**Status**: ⏳ Check after backend updates

---

#### D) PDF Viewer (`app/(modals)/pdf-viewer.tsx`)

**Current**: Displays model info in header
**Update Required**: Include category in model display

**Status**: ⏳ Check after backend updates

---

### 3. Backend Controller Updates

#### Files to Update:
1. `backend/src/controllers/oems.controller.ts`
   - Add `getCategories()`
   - Add `getSubCategories()`
   - Add `getProductLinesBySubCategory()`
   - Update `getProductLines()` to include sub-category data
   - Update `getModelsByProductLine()` to include taxonomy

2. `backend/src/controllers/discovery.controller.ts`
   - Update `search()` to include category/sub-category in results

3. `backend/src/routes/oems.routes.ts`
   - Add routes for categories and sub-categories

---

## 📦 TYPE DEFINITIONS

### Shared Types (Frontend & Backend)

```typescript
// backend/src/types/taxonomy.ts
export interface EquipmentCategory {
  id: string;
  oemId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentSubCategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductLineWithTaxonomy {
  id: string;
  name: string;
  category: string;
  description: string | null;
  subCategory: {
    id: string;
    name: string;
    slug: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;
}

export interface ModelWithTaxonomy {
  id: string;
  modelNumber: string;
  oem: string;
  productLine: string;
  category: string;
  subCategory: string;
}
```

---

## 🚀 IMPLEMENTATION ORDER

### Phase 1: Backend API Updates ⏳
1. ✅ Create new API endpoints for categories
2. ✅ Create new API endpoints for sub-categories  
3. ✅ Update existing endpoints to include taxonomy
4. ✅ Test all endpoints with Postman/Thunder Client

### Phase 2: Frontend Updates ⏳
1. ✅ Update Search screen to display category
2. ✅ Update Catalog screen with new flow
3. ✅ Update Chat screen model display
4. ✅ Update PDF viewer model display
5. ✅ Test end-to-end user flows

### Phase 3: Testing & Validation ⏳
1. ✅ Test search with recategorized models
2. ✅ Test catalog browsing through new hierarchy
3. ✅ Test chat with different equipment types
4. ✅ Verify all displays show correct taxonomy

---

## 📝 NOTES

- **Backward Compatibility**: Old clients will still work (taxonomy fields are additive)
- **Performance**: New endpoints use optimized queries with COUNT aggregations
- **UI/UX**: New hierarchy makes browsing more intuitive (group by equipment type)
- **Scalability**: Ready for adding more OEMs (Trane, York, etc.) with their own taxonomies

---

## ✅ SUCCESS CRITERIA

- [x] Phase 1 database migration complete
- [ ] All backend APIs return taxonomy data
- [ ] Search results show equipment category
- [ ] Catalog allows browsing by category/sub-category
- [ ] Chat displays full equipment taxonomy
- [ ] PDF viewer shows equipment type
- [ ] All existing functionality preserved
- [ ] No broken links or missing data

---

**Current Status**: Phase 1 Complete ✅ | Phase 2 In Progress ⏳
