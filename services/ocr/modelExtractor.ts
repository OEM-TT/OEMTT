/**
 * Model number extraction from OCR / barcode text.
 *
 * Edge cases handled:
 *  - Multiple fields on a serial plate (MODEL, SERIAL, VOLT, BTU, etc.)
 *  - OEM-specific model number formats and prefixes
 *  - Noisy OCR output (line breaks, stray characters, low-contrast plates)
 *  - Barcode payloads that encode full model numbers vs partial strings
 *  - Ambiguous tokens that look like both serial and model numbers
 *  - Plate text that is ALL-CAPS, mixed-case, or has OCR artifacts (0 vs O, 1 vs I)
 */

// ─── Known field labels that precede a model number ──────────────────────────
const MODEL_LABEL_PATTERNS = [
  /\bMODEL\s*(?:NO\.?|NUMBER|#|NUM)?\s*[:\-]?\s*/i,
  /\bM\s*\/\s*N\s*[:\-]?\s*/i,         // M/N:
  /\bMOD\.?\s*[:\-]?\s*/i,
  /\bMODEL\s*[:\-]?\s*/i,
  /\bPRODUCT\s*(?:NO\.?|NUMBER|CODE)?\s*[:\-]?\s*/i,
  /\bPART\s*(?:NO\.?|NUMBER)?\s*[:\-]?\s*/i,
  /\bCAT\.?\s*(?:NO\.?)?\s*[:\-]?\s*/i,
];

// ─── Labels to SKIP (these tokens are NOT model numbers) ─────────────────────
const NON_MODEL_LABELS = [
  /\bSERIAL\s*(?:NO\.?|NUMBER|#)?\b/i,
  /\bS\s*\/\s*N\b/i,
  /\bMFG\.?\s*DATE\b/i,
  /\bVOLT(?:AGE)?\b/i,
  /\bAMPS?\b/i,
  /\bPHASE\b/i,
  /\bHZ\b/i,
  /\bBTU\b/i,
  /\bEER\b/i,
  /\bSEER\b/i,
  /\bREFRIGERANT\b/i,
  /\bMIN\.?\s*CIRCUIT\b/i,
  /\bMAX\.?\s*FUSE\b/i,
  /\bINPUT\b/i,
  /\bOUTPUT\b/i,
  /\bWEIGHT\b/i,
  /\bMANUFACTURED\b/i,
  /\bWARRANTY\b/i,
];

// ─── OEM-specific model number regex patterns ─────────────────────────────────
// These are ordered from most-specific to least-specific.
const OEM_MODEL_PATTERNS: { oem: string; pattern: RegExp }[] = [
  // Carrier / Bryant / Payne  – e.g. 24ACC636A003, 25VNA8048A003
  { oem: 'Carrier', pattern: /\b[0-9]{2}[A-Z]{2,4}[0-9]{3,6}[A-Z][0-9]{3}\b/ },
  // Trane / American Standard – e.g. 4TTR3036E1000AA, XR15-024-230
  { oem: 'Trane', pattern: /\b[0-9][A-Z]{2,3}[A-Z0-9]{6,14}\b/ },
  // Lennox – e.g. XC21-036-230, 14ACX-030-230, SL28XCV-036
  { oem: 'Lennox', pattern: /\b[A-Z]{2,4}[0-9]{2,4}[A-Z]{0,3}[-][0-9]{3}(?:[-][0-9]{3})?\b/ },
  // Rheem / Ruud – e.g. RA16AZ036, RPRL-030JAZ
  { oem: 'Rheem', pattern: /\b[A-Z]{2,4}[0-9]{2}[A-Z]{2}[0-9]{3}\b/ },
  // York / Johnson Controls – e.g. YXV20B48S21S
  { oem: 'York', pattern: /\b[A-Z]{3}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{2}[A-Z]\b/ },
  // Daikin – e.g. DX13SA036
  { oem: 'Daikin', pattern: /\bDX[0-9]{2}[A-Z]{2}[0-9]{3}\b/ },
  // Mitsubishi – e.g. MSZ-GL15NA, MXZ-4C36NA
  { oem: 'Mitsubishi', pattern: /\bM[SUX][FPZ][-][A-Z]{2}[0-9]{2}[A-Z]{2}\b/ },
  // Goodman / Amana – e.g. GSX160241, ASXC160361
  { oem: 'Goodman', pattern: /\b[A-Z]{2,5}[0-9]{6,9}\b/ },
  // Heil / Tempstar / Comfortmaker / Inter City (ICP)
  { oem: 'Heil', pattern: /\b[A-Z]{2,3}[0-9]{3,4}[A-Z]{3}[0-9]{2,3}\b/ },
  // Generic: alphanumeric 6–20 chars with at least 2 letters and 3 digits
  { oem: '', pattern: /\b(?=[A-Z0-9-]{6,20}$)(?=[^-]*[A-Z]{2,})(?=[^-]*[0-9]{3,})[A-Z0-9-]{6,20}\b/ },
];

// ─── OEM brand name detection ─────────────────────────────────────────────────
const OEM_BRAND_KEYWORDS: { keywords: string[]; oem: string }[] = [
  { keywords: ['CARRIER', 'BRYANT', 'PAYNE'], oem: 'Carrier' },
  { keywords: ['TRANE', 'AMERICAN STANDARD', 'AMERISTAR'], oem: 'Trane' },
  { keywords: ['LENNOX', 'DUCANE', 'ARMSTRONG'], oem: 'Lennox' },
  { keywords: ['RHEEM', 'RUUD', 'WEATHERKING'], oem: 'Rheem' },
  { keywords: ['YORK', 'LUXAIRE', 'COLEMAN HVAC', 'FRASER'], oem: 'York' },
  { keywords: ['DAIKIN', 'GOODMAN', 'AMANA'], oem: 'Goodman' },
  { keywords: ['MITSUBISHI', 'MSZ', 'MXZ'], oem: 'Mitsubishi' },
  { keywords: ['HEIL', 'TEMPSTAR', 'COMFORTMAKER', 'ARCOAIRE', 'KEEPRITE'], oem: 'Heil' },
  { keywords: ['BOSCH', 'CLIMATE MASTER'], oem: 'Bosch' },
  { keywords: ['FUJITSU', 'HALCYON'], oem: 'Fujitsu' },
];

export interface ExtractedModel {
  modelNumber: string;
  confidence: 'high' | 'medium' | 'low';
  detectedOem?: string;
  method: 'label-match' | 'oem-pattern' | 'generic-pattern' | 'barcode';
  rawText?: string;         // The full raw text block for debugging
  alternates?: string[];    // Other plausible candidates
}

// ─── Normalize OCR artifacts ──────────────────────────────────────────────────
function normalizeOcrText(raw: string): string {
  return (
    raw
      // Common OCR confusions in HVAC model numbers
      .replace(/\bO\b(?=[0-9])/g, '0')   // standalone O before digit → 0
      .replace(/(?<=[0-9])O\b/g, '0')    // digit then standalone O → 0
      .replace(/\bI\b(?=[0-9])/g, '1')   // standalone I before digit → 1
      // Normalize separators
      .replace(/[–—]/g, '-')             // em/en dashes → hyphen
      // Remove null bytes / control chars
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
      .trim()
  );
}

// ─── Detect OEM from raw text ─────────────────────────────────────────────────
export function detectOemFromText(text: string): string | undefined {
  const upper = text.toUpperCase();
  for (const { keywords, oem } of OEM_BRAND_KEYWORDS) {
    if (keywords.some((kw) => upper.includes(kw))) {
      return oem;
    }
  }
  return undefined;
}

// ─── Extract model number from a label-delimited plate ───────────────────────
function extractByLabel(text: string): string | null {
  for (const labelPattern of MODEL_LABEL_PATTERNS) {
    const regex = new RegExp(labelPattern.source + '([A-Z0-9][A-Z0-9\\-\\./ ]{3,25})', 'im');
    const match = text.match(regex);
    if (match?.[1]) {
      // Trim trailing whitespace/punctuation and take first token if spaced
      const candidate = match[1].trim().split(/\s{2,}/)[0].replace(/[,;]+$/, '');
      if (candidate.length >= 4) return candidate;
    }
  }
  return null;
}

// ─── Extract model number using OEM patterns ─────────────────────────────────
function extractByPattern(
  text: string,
  preferredOem?: string
): { model: string; oem: string } | null {
  const upper = text.toUpperCase();

  // Try preferred OEM first
  if (preferredOem) {
    const oemEntry = OEM_MODEL_PATTERNS.find(
      (e) => e.oem.toUpperCase() === preferredOem.toUpperCase()
    );
    if (oemEntry) {
      const match = upper.match(oemEntry.pattern);
      if (match) return { model: match[0], oem: oemEntry.oem };
    }
  }

  // Try all OEM patterns
  for (const { oem, pattern } of OEM_MODEL_PATTERNS) {
    const match = upper.match(pattern);
    if (match) return { model: match[0], oem };
  }

  return null;
}

// ─── Collect ALL plausible candidates in the text ────────────────────────────
function collectCandidates(text: string): string[] {
  const upper = text.toUpperCase();
  const candidates: string[] = [];

  for (const { pattern } of OEM_MODEL_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, 'g');
    const matches = upper.match(globalPattern) ?? [];
    candidates.push(...matches);
  }

  // De-duplicate and filter out known non-model tokens
  return [...new Set(candidates)].filter(
    (c) => !NON_MODEL_LABELS.some((skip) => skip.test(c))
  );
}

// ─── Main extraction function ─────────────────────────────────────────────────
export function extractModelNumber(
  rawText: string,
  preferredOem?: string
): ExtractedModel | null {
  if (!rawText?.trim()) return null;

  const normalized = normalizeOcrText(rawText);
  const detectedOem = preferredOem || detectOemFromText(normalized);

  // 1. Label match (highest confidence — explicit "Model:" field on plate)
  const byLabel = extractByLabel(normalized);
  if (byLabel) {
    // Verify it doesn't accidentally match a serial/non-model label
    const isNonModel = NON_MODEL_LABELS.some((p) => p.test(byLabel));
    if (!isNonModel) {
      const alternates = collectCandidates(normalized).filter((c) => c !== byLabel);
      return {
        modelNumber: byLabel,
        confidence: 'high',
        detectedOem,
        method: 'label-match',
        rawText,
        alternates,
      };
    }
  }

  // 2. OEM pattern match
  const byPattern = extractByPattern(normalized, detectedOem);
  if (byPattern) {
    const alternates = collectCandidates(normalized).filter((c) => c !== byPattern.model);
    return {
      modelNumber: byPattern.model,
      confidence: byPattern.oem ? 'medium' : 'low',
      detectedOem: byPattern.oem || detectedOem,
      method: 'oem-pattern',
      rawText,
      alternates,
    };
  }

  // 3. Generic fallback — return all candidates, let user pick
  const candidates = collectCandidates(normalized);
  if (candidates.length > 0) {
    return {
      modelNumber: candidates[0],
      confidence: 'low',
      detectedOem,
      method: 'generic-pattern',
      rawText,
      alternates: candidates.slice(1),
    };
  }

  return null;
}

// ─── Extract from barcode payload ────────────────────────────────────────────
/**
 * Barcode payloads from HVAC equipment can be:
 *  - Raw model number (most common)
 *  - GS1-128 encoded strings with Application Identifiers like (01)...(21)...
 *  - URL-encoded deep links (newer connected equipment)
 *  - Proprietary formats that embed both model AND serial
 */
export function extractModelFromBarcode(barcodeData: string): ExtractedModel | null {
  if (!barcodeData?.trim()) return null;

  const data = barcodeData.trim();

  // GS1-128 / GS1-DataMatrix: Application Identifier (01) = GTIN, (21) = serial
  // Some manufacturers use AI (240) for "Additional Item ID" = model number
  const gs1ModelMatch =
    data.match(/\(240\)([A-Z0-9-]{4,25})/) ||
    data.match(/\(91\)([A-Z0-9-]{4,25})/); // proprietary AI
  if (gs1ModelMatch) {
    return {
      modelNumber: gs1ModelMatch[1],
      confidence: 'high',
      method: 'barcode',
      rawText: data,
    };
  }

  // URL format: ?model=XXX or /model/XXX
  const urlMatch = data.match(/[?&\/]model[=\/]([A-Z0-9-]{4,25})/i);
  if (urlMatch) {
    return {
      modelNumber: urlMatch[1].toUpperCase(),
      confidence: 'high',
      method: 'barcode',
      rawText: data,
    };
  }

  // Compound format: MODEL|SERIAL or MODEL_SERIAL or MODEL/SERIAL
  const compoundMatch = data.match(/^([A-Z0-9-]{4,25})[|_\/]([A-Z0-9-]{4,25})$/i);
  if (compoundMatch) {
    // Heuristic: model numbers tend to have more letters; serial numbers more digits
    const [, part1, part2] = compoundMatch;
    const letters1 = (part1.match(/[A-Z]/gi) ?? []).length;
    const letters2 = (part2.match(/[A-Z]/gi) ?? []).length;
    const modelPart = letters1 >= letters2 ? part1 : part2;
    return {
      modelNumber: modelPart.toUpperCase(),
      confidence: 'medium',
      method: 'barcode',
      rawText: data,
      alternates: [letters1 >= letters2 ? part2 : part1],
    };
  }

  // Plain barcode that looks like a model number
  const plain = extractModelNumber(data);
  if (plain) return { ...plain, method: 'barcode' };

  // Last resort: use the raw value if it's a plausible model length
  if (/^[A-Z0-9][A-Z0-9-]{3,24}$/i.test(data)) {
    return {
      modelNumber: data.toUpperCase(),
      confidence: 'low',
      method: 'barcode',
      rawText: data,
    };
  }

  return null;
}
