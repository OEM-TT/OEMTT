# Model Number Validation System

## Problem

Perplexity API can return similar but incorrect models when searching for manuals.

**Example Issue:**
- 🔍 **Searching for**: Carrier 50P3
- ❌ **Perplexity found**: Carrier 50HC manual
- 📊 **Why**: Similar model numbers (50P3 vs 50HC) confuse the search

**Additional Challenge:**
- ✅ **Correct PDF**: `48_50P-9T.pdf` (generic filename, but IS for 50P3)
- ❌ **Problem**: Filename doesn't contain "50P3", but the PDF content does!
- 💡 **Solution**: We need to READ the actual PDF content to verify

This is a **critical issue** because:
1. Users would get the wrong troubleshooting info
2. Flash codes, wiring, and specs differ between models
3. Could lead to equipment damage if wrong procedures are followed

## Solution: Content-Based Validation

### Layer 1: Lenient Perplexity Prompt

The prompt gives Perplexity **flexibility** to find relevant PDFs:

```
🎯 MODEL MATCH GUIDANCE:
- Find manuals for "50P3" model
- Filenames may vary (e.g., "48_50P-9T.pdf" might be correct)
- When in doubt, include it - we'll verify the PDF content
```

### Layer 2: PDF Content Validation (Primary Method)

**This is the most accurate validation!** We actually read the PDF to verify its content.

```typescript
async function validateModelMatch(
  title: string,
  url: string,
  targetModel: string
): Promise<{ isValid: boolean; reason?: string }>
```

#### Process:

**Step 1: Download First Page**
- Download first 500KB of PDF (usually contains title page)
- Use `pdfjs-dist` to extract text from page 1
- Get first 20 text items (title, model number, product info)

**Step 2: Check PDF Content**
```typescript
// PDF content: "CARRIER AQUAEDGE 50P3 CHILLER CONTROLS MANUAL..."
// Target: "50P3"
"50P3" found in PDF → ✅ ACCEPT

// PDF content: "CARRIER 50HC CHILLER INSTALLATION MANUAL..."
// Target: "50P3"
"50HC" found (different model) → ❌ REJECT
```

**Step 3: Fallback to Title/URL (if PDF extraction fails)**
- If we can't read the PDF, use title/URL validation
- More lenient: Only reject if we find conflicting models
- If uncertain, allow it (better to over-include than miss manuals)

#### Validation Logic:

1. **Try PDF Content First** (most accurate)
   - Extract text from first page
   - Look for target model number
   - Check for conflicting model numbers
   - Base decision on actual content, not filename

2. **Fallback to Title/URL** (if PDF fails)
   - Parse model patterns from title/URL
   - Only reject if obvious conflict found
   - Be lenient to avoid false negatives

### Layer 3: Detailed Logging

The system logs each validation step:

```
🔎 Checking: Controls Manual
🔍 Validating by reading PDF content...
📄 PDF Title Page: CARRIER AQUAEDGE 50P3 CHILLER CONTROLS MANUAL...
✅ Model "50P3" confirmed in PDF content
✅ PDF verified: 2.3 MB

---

🔎 Checking: Installation Manual  
🔍 Validating by reading PDF content...
📄 PDF Title Page: CARRIER 50HC CHILLER INSTALLATION...
❌ REJECTED: Installation Manual
   Reason: PDF content shows "50HC", not "50P3"
```

## Examples

### Example 1: Generic Filename, Correct Content ✅ (KEY USE CASE!)
```
Target: "50P3"
Title: "Controls Manual"
URL: shareddocs.com/.../48_50P-9T.pdf

Validation:
  Step 1: Download first 500KB
  Step 2: Extract text from page 1
  Step 3: PDF content = "CARRIER AQUAEDGE 50P3..."
  ✅ Found "50P3" in PDF content
  → ACCEPT
  
Why this works: Filename is generic ("48_50P-9T.pdf") but actual PDF 
content confirms it's for the 50P3 model!
```

### Example 2: Wrong Model in PDF ❌
```
Target: "50P3"
Title: "Installation Manual"
URL: shareddocs.com/.../50-series-install.pdf

Validation:
  Step 1: Download first 500KB
  Step 2: Extract text from page 1
  Step 3: PDF content = "CARRIER 50HC CHILLER..."
  ❌ Found "50HC" (conflicting model)
  → REJECT
  Reason: PDF content shows "50HC", not "50P3"
```

### Example 3: PDF Extraction Fails, Title is Clear ✅
```
Target: "19XR"
Title: "Carrier 19XR Service Manual"
URL: shareddocs.com/.../manual.pdf

Validation:
  Step 1: Try to download PDF → TIMEOUT
  Step 2: Fallback to title/URL validation
  Step 3: Title contains "19XR"
  ✅ No conflicting models in title
  → ACCEPT
```

### Example 4: PDF Extraction Fails, No Info ✅
```
Target: "23XR"
Title: "Service Manual"
URL: shareddocs.com/.../sm-001.pdf

Validation:
  Step 1: Try to download PDF → FAILED
  Step 2: Fallback to title/URL validation
  Step 3: No model numbers in title/URL
  ⚠️ Could not verify, but no conflicts found
  → ACCEPT (lenient fallback)
```

## Testing

To test the content-based validation:

```bash
# Test with model that has generic filenames
curl http://localhost:3000/api/discovery/search?oem=Carrier&model=50P3

# Test with common models that might conflict
curl http://localhost:3000/api/discovery/search?oem=Carrier&model=19XR
```

Watch logs for the validation process:
```
🔎 Checking: Controls Manual
🔍 Validating by reading PDF content...
📄 PDF Title Page: CARRIER AQUAEDGE 50P3...
✅ Model "50P3" confirmed in PDF content
✅ PDF verified: 2.3 MB
```

Or rejection:
```
🔎 Checking: Installation Manual
🔍 Validating by reading PDF content...
📄 PDF Title Page: CARRIER 50HC...
❌ REJECTED: Installation Manual
   Reason: PDF content shows "50HC", not "50P3"
```

## Edge Cases Handled

| Scenario | Filename | PDF Content | Result | Reason |
|----------|----------|-------------|--------|--------|
| Generic filename | `48_50P-9T.pdf` | "50P3 Manual" | ✅ Accept | PDF content confirms |
| Wrong model | `50-series.pdf` | "50HC Manual" | ❌ Reject | PDF shows wrong model |
| Multi-model PDF | `series.pdf` | "19XR and 23XR" | ✅ Accept | 19XR present, 23XR not conflicting |
| PDF read fails | `manual.pdf` | [Can't read] | ⚠️ Lenient | Fallback to title/URL |
| Clear title | `50P3-controls.pdf` | [Can't read] | ✅ Accept | Title matches |
| Conflicting title | `50HC.pdf` | [Can't read] | ❌ Reject | Title conflicts |

## Advantages of Content-Based Validation

✅ **Handles Generic Filenames**: `48_50P-9T.pdf` is validated by reading its content

✅ **Most Accurate**: Reads actual PDF text, not just metadata

✅ **Catches Misnamed Files**: A file named "50P3.pdf" but containing 50HC content is rejected

✅ **Lenient Fallback**: If PDF can't be read, uses title/URL validation

⚠️ **Slightly Slower**: Downloads 500KB per PDF to validate (worth it for accuracy!)

## Performance

- **PDF Download**: 500KB per manual (~1-2 seconds)
- **Text Extraction**: Fast (<100ms once downloaded)
- **Total Overhead**: ~1-3 seconds per manual validation
- **Benefit**: Eliminates wrong manuals, saves hours of user confusion

## Future Improvements

1. **Cache PDF Title Pages**: Store first page text to avoid re-downloading
2. **Parallel Validation**: Validate multiple PDFs concurrently
3. **Smart Timeout**: If Perplexity returns 5 manuals, only validate top 3
4. **User Feedback**: Let users report wrong manuals to improve AI prompt
5. **OCR Fallback**: If text extraction fails, try OCR on title page image

## Code Location

- **PDF Extraction**: `backend/src/services/discovery/perplexity.ts` → `extractPDFTitlePage()`
- **Validation Function**: `backend/src/services/discovery/perplexity.ts` → `validateModelMatch()`
- **Lenient Prompt**: `backend/src/services/discovery/perplexity.ts` → `findAllManuals()`
- **Model Extraction**: `backend/src/utils/modelNumber.ts` → `extractBaseModel()`
