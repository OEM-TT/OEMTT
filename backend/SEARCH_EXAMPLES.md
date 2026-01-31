# 🔍 Improved Manual Search - Examples

## How It Works Now

### **Step 1: User Searches**
```
GET /api/discovery/search?oem=Carrier&model=19XR
```

### **Step 2: Database Search (Multi-Tier)**

```
┌─────────────────────────────────────────────────┐
│ TIER 1: Standard Search                         │
│ ✓ Model number contains "19XR"                  │
│ ✓ OEM name contains "Carrier"                   │
└─────────────────────────────────────────────────┘
         │
         ├─→ Found? → Return instantly (no Perplexity)
         │
         ↓ Not found?
┌─────────────────────────────────────────────────┐
│ TIER 2: Expanded Search                         │
│ ✓ Model number OR product line OR manual title  │
│ ✓ Check model variants array                    │
│ ✓ OEM name match                                │
└─────────────────────────────────────────────────┘
         │
         ├─→ Found? → Return (still no Perplexity)
         │
         ↓ Still not found?
┌─────────────────────────────────────────────────┐
│ TIER 3: Perplexity Discovery                    │
│ → Search web for direct PDF                     │
│ → Download, process, store                      │
│ → Extract product line from title               │
└─────────────────────────────────────────────────┘
```

---

## Search Examples

### **Example 1: Basic Search**
```bash
GET /api/discovery/search?oem=Carrier&model=19XR
```

**Database Query**:
```sql
WHERE 
  model.modelNumber ILIKE '%19XR%'
  AND oem.name ILIKE '%Carrier%'
  AND status = 'active'
```

**Result**: ✅ Found "AquaEdge 19XR Service Manual"

**Stored As**:
```json
{
  "oem": "Carrier",
  "productLine": "AquaEdge",  ← Extracted from title
  "modelNumber": "19XR",
  "title": "AquaEdge 19XR Service Manual"
}
```

---

### **Example 2: Model-Only Search**
```bash
GET /api/discovery/search?model=25VNA8
```
(No OEM provided)

**Database Query**:
```sql
WHERE 
  model.modelNumber ILIKE '%25VNA8%'
  AND status = 'active'
```

**Result**: ✅ Found "Infinity Series 25VNA8 Service and Troubleshooting Guide"

**May Return Multiple**:
- Carrier 25VNA8
- Bryant 25VNA8 (if exists - same OEM family)

---

### **Example 3: Product Line Search**
```bash
GET /api/discovery/search?oem=Carrier&model=AquaEdge
```

**Tier 1**: ❌ No model "AquaEdge" found  
**Tier 2**: ✅ Found in expanded search

**Database Query**:
```sql
WHERE 
  (model.modelNumber ILIKE '%AquaEdge%'  -- Check model
   OR productLine.name ILIKE '%AquaEdge%'  -- Check product line ✓
   OR manual.title ILIKE '%AquaEdge%')  -- Check title
  AND oem.name ILIKE '%Carrier%'
```

**Result**: ✅ Found all AquaEdge models (19XR, 19DV, 23XRV, etc.)

---

### **Example 4: Model Variant Search**
```bash
GET /api/discovery/search?oem=Carrier&model=19XR-0500
```

**Tier 1**: ❌ No exact "19XR-0500" modelNumber  
**Tier 2**: ✅ Found via:
1. Partial match (`19XR-0500` contains `19XR`)
2. OR variants array (`WHERE '19XR-0500' = ANY(model.variants)`)

**Stored Variants**:
```json
{
  "modelNumber": "19XR",
  "variants": ["19XR-0500", "19XR-1000", "19XR-1500"]
}
```

**Result**: ✅ Found "AquaEdge 19XR Service Manual" (covers all 19XR variants)

---

### **Example 5: Title Search**
```bash
GET /api/discovery/search?oem=Carrier&model=Infinity
```

**Tier 2**: ✅ Found via manual title

**Database Query**:
```sql
WHERE 
  manual.title ILIKE '%Infinity%'
  AND oem.name ILIKE '%Carrier%'
```

**Result**: ✅ Found "Infinity Series 25VNA8 Service and Troubleshooting Guide"

---

### **Example 6: Case Insensitive**
```bash
GET /api/discovery/search?oem=carrier&model=19xr
```

**All Queries Use**: `mode: 'insensitive'` or `ILIKE`

**Result**: ✅ Found (same as "Carrier 19XR")

---

### **Example 7: Not Found Anywhere**
```bash
GET /api/discovery/search?oem=FakeOEM&model=FAKE999
```

**Tier 1**: ❌ Not found  
**Tier 2**: ❌ Not found  
**Tier 3**: Perplexity search → ❌ No direct PDF found

**Result**:
```json
{
  "success": false,
  "source": "discovery",
  "message": "Manual not found in database or online",
  "error": "No direct-download PDF found from authorized sources"
}
```

---

## Storage Strategy

### **When Perplexity Discovers "AquaEdge 19XR Service Manual"**

```typescript
// BEFORE (Old approach)
{
  oem: "Carrier",
  productLine: "General",  // ← Too generic!
  modelNumber: "19XR",
  title: "AquaEdge 19XR Service Manual"
}

// AFTER (New approach)
{
  oem: "Carrier",
  productLine: "AquaEdge",  // ← Extracted from title ✓
  modelNumber: "19XR",
  title: "AquaEdge 19XR Service Manual"
}
```

**Now Users Can Search**:
- ✅ "Carrier 19XR"
- ✅ "19XR"
- ✅ "AquaEdge 19XR"
- ✅ "AquaEdge"
- ✅ "Carrier AquaEdge"

**Before**: Only "Carrier 19XR" or "19XR" would work

---

## Performance

| Search Type | Speed | Perplexity Cost |
|------------|-------|-----------------|
| **Tier 1** (Exact) | ~50ms | $0.00 |
| **Tier 2** (Expanded) | ~100ms | $0.00 |
| **Tier 3** (Perplexity) | ~30-60s | ~$0.004 |

**Cache Hit Rate**: Expected >95% after initial seeding

---

## Testing Checklist

- [ ] Search with OEM + Model → Finds existing
- [ ] Search with Model only → Finds existing
- [ ] Search with lowercase → Finds existing
- [ ] Search with Product Line name → Finds existing
- [ ] Search with Model variant → Finds existing
- [ ] Search with non-existent → Triggers Perplexity
- [ ] Perplexity result → Extracts product line correctly
- [ ] Second search for same manual → Cache hit (instant)

---

**Key Improvement**: We now search across **4 fields** instead of just 1:
1. ✅ model.modelNumber
2. ✅ model.productLine.name (NEW)
3. ✅ manual.title (NEW)
4. ✅ model.variants (NEW)

**Result**: **Much higher database hit rate** → Fewer Perplexity calls → Lower costs → Faster responses
