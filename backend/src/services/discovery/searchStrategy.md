# Manual Search Strategy Analysis

## Current Issues

### **Problem 1: Too Restrictive**
```typescript
// Current search requires BOTH oem AND model to match
where: {
  model: {
    modelNumber: { contains: "19XR", mode: 'insensitive' },
    productLine: {
      oem: { name: { contains: "Carrier", mode: 'insensitive' } }
    }
  }
}
```

**Issues**:
- User searches "19XR" without OEM → Won't find anything
- User searches "Carrier" without model → Won't find anything
- Model variants (19XR-0500, 19XR-1000) → Might not match "19XR"

---

## Recommended Search Strategy

### **Tier 1: Exact Match** (Fastest, Highest Confidence)
```sql
WHERE 
  LOWER(model.modelNumber) = LOWER('19XR')
  AND LOWER(oem.name) = LOWER('Carrier')
```

### **Tier 2: Partial Match** (Good for variants)
```sql
WHERE 
  model.modelNumber ILIKE '%19XR%'
  AND oem.name ILIKE '%Carrier%'
```

### **Tier 3: Flexible Match** (If Tier 1 & 2 fail)
```sql
-- Option A: Model-only search
WHERE model.modelNumber ILIKE '%19XR%'

-- Option B: Model variants search
WHERE model.variants @> ARRAY['19XR']  -- Check if 19XR is in variants array
```

### **Tier 4: Fuzzy Search** (Last resort before Perplexity)
```sql
-- Use PostgreSQL similarity
WHERE similarity(model.modelNumber, '19XR') > 0.3
ORDER BY similarity(model.modelNumber, '19XR') DESC
```

---

## Examples

### **Example 1: User searches "Carrier 19XR"**
✅ **Tier 1**: Exact match → Found instantly
- OEM: "Carrier" → Matches "Carrier"
- Model: "19XR" → Matches "19XR"

### **Example 2: User searches "19XR-0500"**
❌ **Tier 1**: No exact match  
✅ **Tier 2**: Partial match → Found
- Model: "19XR-0500" contains "19XR"
- Or model.variants includes "19XR-0500"

### **Example 3: User searches just "19XR"**
❌ **Tier 1**: OEM missing  
✅ **Tier 3**: Model-only search → Found (may return multiple OEMs)
- Shows: Carrier 19XR, Trane 19XR (if both exist)

### **Example 4: User searches "19xr" (lowercase)**
✅ **Works**: All queries use `mode: 'insensitive'` or `ILIKE`

### **Example 5: User searches "AquaEdge"**
❌ **Current**: Wouldn't find "19XR" (stored in modelNumber)  
✅ **Improved**: Search model.productLine.name or manual.title too
- ProductLine: "AquaEdge" → Found

---

## Storage Best Practices

### **When Storing Manuals from Perplexity**
```typescript
// BAD: Generic storage
model: {
  modelNumber: "19XR"  // Too generic
}

// GOOD: Rich storage
model: {
  modelNumber: "19XR",              // Primary identifier
  variants: ["19XR-0500", "19XR-1000", "19XR-1500"],  // All known variants
}
productLine: {
  name: "AquaEdge"                  // Product family
}
manual: {
  title: "AquaEdge 19XR Service Manual"  // Full descriptive title
}
```

### **When Perplexity Finds "AquaEdge 19XR"**
```typescript
// Extract:
OEM: "Carrier"                       ← From source domain or title
ProductLine: "AquaEdge"              ← Extract from title
ModelNumber: "19XR"                  ← Extract base model
Variants: []                         ← Can be populated later

// This way, user can search:
// - "Carrier 19XR" ✅
// - "19XR" ✅
// - "AquaEdge 19XR" ✅
// - "AquaEdge" ✅
// - "Carrier AquaEdge" ✅
```

---

## Implementation Priority

### **Phase 1: Must Have** (Before Testing)
1. ✅ Case-insensitive search
2. ✅ Partial match (contains)
3. ⚠️ Make OEM optional (search by model alone)
4. ⚠️ Extract ProductLine from Perplexity title

### **Phase 2: Should Have**
5. Search by manual title too (not just model number)
6. Handle model variants array
7. Fuzzy matching for typos

### **Phase 3: Nice to Have**
8. Full-text search across all fields
9. Search by serial number pattern
10. Synonym handling (e.g., "Carrier" = "United Technologies")
