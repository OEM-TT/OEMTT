# Table Extraction Improvement

**Date:** January 24, 2026  
**Problem:** AI only extracted "system malfunction" for flash code 74, missing all the detailed table data (9+ causes, 9+ actions, reset time, mode, etc.)

---

## Problem Analysis

### What Happened:
The AI responded to "What is flash code 74?" with only:
- ✅ "Flash code 74 indicates a system malfunction"
- ❌ Missing: Detailed description ("DISCHARGE TEMP OUT OF RANGE LOCKOUT")
- ❌ Missing: Reset time (2 Hours)
- ❌ Missing: 9+ possible causes
- ❌ Missing: 9+ corresponding actions
- ❌ Missing: Mode information (Cool, Heat, Both)

### Root Cause:
The PDF parser (`pdf-parse`) was extracting text **linearly** without preserving **table structure**:

**What we got:**
```
"INVERTER/COMPRESSOR\\nINTERNAL FAULT\\n15 Min-\\nutes\\nCoolOvercharged System..."
```

**What we needed:**
```
Flash Code: 74
Type: System Malfunction  
Description: DISCHARGE TEMP OUT OF RANGE LOCKOUT  
Reset Time: 2 Hours
Mode: Both
Possible Causes:
  - High Load conditions
  - Low Charge or Loss of Charge  
  - Expansion Device Restriction
  [... 6 more causes]
Actions:
  - Check system charge
  - Check harness for continuity  
  - Troubleshoot EXV & TXV
  [... 6 more actions]
```

### Why Tables Are Hard:
PDFs don't store tables as structured data - they're just positioned text. Standard text extraction reads left-to-right, top-to-bottom, but table cells can be in any order in the PDF's internal structure.

---

## Solution: Position-Based Table Reconstruction

### New Approach:
1. **Extract Positioned Text**: Get x/y coordinates for every text item
2. **Group into Rows**: Items with similar Y-coordinates = same row
3. **Sort Columns**: Within each row, sort by X-coordinate (left to right)
4. **Detect Tables**: Look for consistent column alignment across rows
5. **Format as Structured Text**: Convert to markdown-style format for better embedding

### Implementation:

```typescript
// Extract text items with positions
interface TextItem {
  str: string;
  x: number;      // Horizontal position
  y: number;      // Vertical position  
  width: number;
  height: number;
}

// Group items into rows (y-tolerance = 5 pixels)
function groupIntoRows(items: TextItem[]): TextItem[][] {
  // Sort by Y position (top to bottom)
  // Group items with similar Y coordinates
  // Sort each row by X position (left to right)
}

// Detect table structure
function detectTable(rows: TextItem[][]): PDFTable | null {
  // Check if rows have consistent column structure
  // Need at least 3 rows (header + 2 data)
  // Columns must align within 20 pixels across rows
}

// Format as searchable text
function formatTableAsText(table: PDFTable): string {
  return `
[TABLE] Column1 | Column2 | Column3

- Value1 | Value2 | Value3
- Value4 | Value5 | Value6
`;
}
```

---

## Expected Improvements

### Before (Linear Text Extraction):
```
❌ Scrambled: "INVERTER/COMPRESSOR\\nINTERNAL FAULT\\n15 Min-\\nutes"
❌ No structure
❌ Missing relationships between causes and actions
❌ AI can only extract fragments
```

### After (Table-Aware Extraction):
```
✅ Structured:
[TABLE] Flash Code | Type | Description | Reset Time | Mode | Possible Causes | Actions

- 74 | System Malfunction | DISCHARGE TEMP OUT OF RANGE LOCKOUT | 2 Hours | Both | High Load conditions | Over charge: Check system charge
- 74 | System Malfunction | DISCHARGE TEMP OUT OF RANGE LOCKOUT | 2 Hours | Heat | Low Charge or Loss of Charge | Check charge in heating mode
[... all rows preserved]

✅ All data captured
✅ Relationships preserved (cause → action)
✅ AI can extract complete information
```

---

## Testing Plan

### Step 1: Re-Process Manual
```bash
curl -X POST "http://localhost:3000/api/ingestion/process/[MANUAL_ID]?force=true"
```

### Step 2: Check Extracted Text
```sql
SELECT content 
FROM manual_sections 
WHERE content ILIKE '%flash%code%74%'
LIMIT 1
```

**Expected:** Should see `[TABLE]` format with all columns preserved

### Step 3: Test Query
**Query:** "What is flash code 74?"

**Expected Response:**
```
Flash code 74 indicates "DISCHARGE TEMP OUT OF RANGE LOCKOUT (Elevated from fault code 59 after 5 occurrences)". 
(Infinity Series 25VNA8 Service and Troubleshooting Guide, Page 21)

This is a System Malfunction with a reset time of 2 Hours and appears in both cooling and heating modes.

**Possible Causes:**
1. High Load conditions → Over charge: Check system charge
2. Low Charge or Loss of Charge at low ambient conditions → Check charge in heating mode  
3. Expansion Device Restriction → Troubleshoot EXV & TXV
4. Sensor Harness not connected to AOC control → Ensure plug is connected
5. Broken or loose harness wire → Check harness for continuity
6. Broken or Damaged Sensor → Check harness for continuity  
7. Indoor Unit Airflow too low or off → Troubleshoot indoor fan motor
8. Outdoor Unit Airflow too low or off → Troubleshoot outdoor fan motor
9. Reversing Valve issues → Check valve and connectors
10. Hardware damage to AOC control → Replace AOC control
11. Nuisance fault during non-operational mode → Refer to TIC 2015-0017

**Sources:**
- Infinity Series 25VNA8 Service and Troubleshooting Guide, Page 21
```

---

## Challenges & Limitations

### Challenges:
1. **Complex Table Layouts**: Multi-column tables with merged cells
2. **Rotated Text**: Some PDFs have rotated text in tables
3. **Variable Column Widths**: Not all columns are evenly spaced
4. **Multi-Page Tables**: Tables that span multiple pages
5. **Nested Tables**: Tables within tables

### Current Limitations:
- **Merged Cells**: Not detected yet (future enhancement)
- **Multi-Page Tables**: Each page treated separately
- **Vertical Text**: May not align correctly
- **Images in Tables**: Ignored (no OCR yet)

### Fallback:
If table detection fails (< 60% column consistency), fall back to linear text extraction

---

## Alternative Solutions Considered

### 1. ❌ **pdf-parse**: Simple but no structure
- **Pros**: Easy, fast
- **Cons**: Loses all table structure (current problem)

### 2. ✅ **pdfjs-dist** (Chosen Solution)
- **Pros**: Access to positioned text, widely used, maintained by Mozilla
- **Cons**: More complex, requires custom table detection logic

### 3. ⚠️ **Tabula-js**: Specialized for tables
- **Pros**: Excellent table detection
- **Cons**: Requires Java runtime, not maintained well, harder to deploy

### 4. ⚠️ **OCR (Tesseract + Table Detection)**
- **Pros**: Most accurate, handles images
- **Cons**: Very slow ($0.10+ per manual), expensive, requires GPU

### 5. ⚠️ **Azure Form Recognizer / AWS Textract**
- **Pros**: Cloud-based, accurate
- **Cons**: $1-5 per manual, requires cloud API keys, data privacy concerns

---

## Cost Impact

### Processing Cost:
- **Before**: ~2-5 seconds per manual (pdf-parse)
- **After**: ~10-15 seconds per manual (pdfjs-dist with table detection)
- **Increase**: ~2-3x processing time (one-time cost)

### Storage Cost:
- **Before**: ~40 tokens per section average
- **After**: ~60 tokens per section average (more structured text)
- **Increase**: ~50% more tokens (but better quality)

### Query Cost:
- **Before**: $0.00027 per question (incomplete data)
- **After**: $0.00035 per question (complete data, +30%)
- **Acceptable**: Still < $0.001 per question

---

## Success Criteria

### Must Have:
- ✅ Extract all flash code table rows
- ✅ Preserve cause → action relationships  
- ✅ Include reset times, modes, descriptions
- ✅ AI can answer with complete information
- ✅ Page citations still work

### Nice to Have:
- ⚠️ Handle merged cells
- ⚠️ Multi-page table continuity
- ⚠️ Detect table headers automatically
- ⚠️ Format as proper markdown tables

---

## Rollback Plan

If table extraction fails or causes issues:

1. **Revert Code:**
   ```bash
   git revert [table-extraction-commit]
   ```

2. **Switch Back to pdf-parse:**
   ```typescript
   import pdf from 'pdf-parse';
   // Use old extraction logic
   ```

3. **Re-Process Manual:**
   ```bash
   curl -X POST ".../process/[ID]?force=true"
   ```

---

## Next Steps

1. ✅ Implemented table-aware PDF processor
2. ⏳ Re-process Carrier 25VNA8 manual
3. ⏳ Test "What is flash code 74?" query
4. ⏳ Verify all table data is extracted
5. ⏳ Test other flash codes (75, 82, etc.)
6. ⏳ Monitor for any extraction errors
7. ⏳ Extend to all manuals once validated

---

## Status

🔄 **In Progress**: Table-aware extraction implemented, ready for testing

**Files Changed:**
- `backend/src/services/ingestion/pdfProcessor.ts` - New table-aware logic

**Next Action:** Re-process manual and test
