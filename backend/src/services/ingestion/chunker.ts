/**
 * Text Chunking Service
 * 
 * Intelligently chunks manual text for embedding and retrieval.
 * Strategy:
 * - Split by sections when possible (headers, topics)
 * - Target 500-1000 tokens per chunk
 * - Preserve page references
 * - Classify section types
 */

import { estimateTokens } from '@/config/openai';
import { PDFPage } from './pdfProcessor';

export type SectionType =
  | 'troubleshooting'
  | 'specifications'
  | 'wiring'
  | 'parts'
  | 'maintenance'
  | 'installation'
  | 'safety'
  | 'general';

export interface TextChunk {
  content: string;
  sectionTitle: string;
  sectionType: SectionType;
  pageReference: string; // "Pages 12-14" or "Page 5"
  pageNumbers: number[];
  metadata: {
    keywords: string[];
    modelNumbers: string[];
    partNumbers: string[];
  };
  tokenCount: number;
}

// Common section header patterns
const SECTION_PATTERNS = {
  troubleshooting: /troubleshoot|diagnostic|error|fault|problem|issue|repair/i,
  specifications: /specification|spec|rating|capacity|dimension|technical data/i,
  wiring: /wiring|electrical|circuit|diagram|schematic/i,
  parts: /parts? list|component|replacement|part number|service parts/i,
  maintenance: /maintenance|service|cleaning|filter|inspection|routine/i,
  installation: /install|setup|mounting|connection|piping/i,
  safety: /safety|warning|caution|danger|hazard/i,
};

/**
 * Classify section type based on title/content
 */
function classifySectionType(title: string, content: string): SectionType {
  const combined = `${title} ${content.substring(0, 200)}`.toLowerCase();

  for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(combined)) {
      return type as SectionType;
    }
  }

  return 'general';
}

/**
 * Extract model numbers from text (e.g., 25VNA8, 25VNA824)
 */
function extractModelNumbers(text: string): string[] {
  const patterns = [
    /\b[A-Z0-9]{5,12}\b/g,  // General alphanumeric models
    /\b\d{2}[A-Z]{2,4}\d{1,3}\b/g, // HVAC pattern like 25VNA8
  ];

  const matches = new Set<string>();

  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) {
      found.forEach(m => matches.add(m));
    }
  }

  return Array.from(matches).slice(0, 10); // Limit to 10 models
}

/**
 * Extract part numbers from text (various formats)
 */
function extractPartNumbers(text: string): string[] {
  const patterns = [
    /\b[A-Z]{2,4}[-]?\d{4,8}[-]?[A-Z0-9]{0,4}\b/g, // Format: ABC-12345-XY
    /\bP\/N[:\s]+([A-Z0-9-]+)/gi, // P/N: or PN:
  ];

  const matches = new Set<string>();

  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) {
      found.forEach(m => matches.add(m.replace(/^P\/N[:\s]+/i, '')));
    }
  }

  return Array.from(matches).slice(0, 20); // Limit to 20 parts
}

/**
 * Extract keywords from text (simple approach)
 */
function extractKeywords(text: string): string[] {
  // Common HVAC/technical keywords
  const technicalTerms = [
    'refrigerant', 'compressor', 'condenser', 'evaporator', 'coil',
    'fan', 'motor', 'capacitor', 'contactor', 'relay', 'sensor',
    'thermostat', 'valve', 'pressure', 'temperature', 'voltage',
    'current', 'circuit', 'wire', 'fuse', 'breaker',
  ];

  const lowerText = text.toLowerCase();
  const found = technicalTerms.filter(term => lowerText.includes(term));

  return found.slice(0, 10); // Limit to 10 keywords
}

/**
 * Detect and enrich table content with context
 * Tables are hard to embed because they lack natural language.
 * This adds descriptive context to make them searchable.
 */
function enrichTableContent(text: string, pageNumber: number): string {
  const lines = text.split('\n');
  let enrichedText = text;

  // Detect flash code / error code tables
  const flashCodePattern = /\b(flash|error|fault|diagnostic|trouble)\s*code/i;
  if (flashCodePattern.test(text)) {
    // Look for numeric codes in the text
    const codePattern = /\b(\d{1,3})\b/g;
    const codes = new Set<string>();
    let match;
    while ((match = codePattern.exec(text)) !== null) {
      const code = match[1];
      // Only consider codes that look like error codes (1-999)
      if (parseInt(code) > 0 && parseInt(code) < 1000) {
        codes.add(code);
      }
    }

    if (codes.size > 0) {
      const codeList = Array.from(codes).join(', ');
      const contextHeader = `\n[TABLE CONTEXT: This section contains flash code and error code definitions. Codes present: ${codeList}. Each code has associated actions, causes, and reset information.]\n\n`;
      enrichedText = contextHeader + text;
    }
  }

  // Detect specification tables
  const specPattern = /\b(specification|rating|capacity|voltage|amperage|pressure|temperature)/i;
  if (specPattern.test(text)) {
    const contextHeader = `\n[TABLE CONTEXT: This section contains technical specifications, ratings, and operational parameters for the unit.]\n\n`;
    enrichedText = contextHeader + text;
  }

  // Detect parts tables
  const partsPattern = /\b(part\s*number|component|replacement|service\s*parts)/i;
  if (partsPattern.test(text)) {
    const contextHeader = `\n[TABLE CONTEXT: This section contains parts information including part numbers, descriptions, and replacement details.]\n\n`;
    enrichedText = contextHeader + text;
  }

  // Detect wiring/electrical tables
  const wiringPattern = /\b(wire|terminal|connection|circuit|schematic)/i;
  if (wiringPattern.test(text)) {
    const contextHeader = `\n[TABLE CONTEXT: This section contains wiring and electrical connection information including terminals, wire colors, and circuit details.]\n\n`;
    enrichedText = contextHeader + text;
  }

  return enrichedText;
}

/**
 * Detect section headers in text
 */
function detectSectionHeaders(text: string): Array<{ title: string; index: number }> {
  const lines = text.split('\n');
  const headers: Array<{ title: string; index: number }> = [];

  let currentIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect headers: ALL CAPS, short line, or numbered sections
    if (
      (trimmed.length > 3 && trimmed.length < 80 && trimmed === trimmed.toUpperCase()) ||
      /^\d+\.\d*\s+[A-Z]/.test(trimmed) || // 1.1 Section
      /^[A-Z][A-Z\s]{10,50}$/.test(trimmed) // Title Case Headers
    ) {
      headers.push({
        title: trimmed,
        index: currentIndex,
      });
    }

    currentIndex += line.length + 1; // +1 for newline
  }

  return headers;
}

/**
 * Split text at [TABLE] boundaries when multiple tables exist
 */
function splitByTableBoundaries(text: string, targetTokens: number): string[] {
  const chunks: string[] = [];
  const parts = text.split(/(\[TABLE\])/); // Split but keep the delimiter

  let currentChunk = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '[TABLE]') {
      // Start of a new table
      if (currentChunk.trim()) {
        // Save previous chunk (non-table content before this table)
        chunks.push(currentChunk.trim());
      }
      // Start new chunk with [TABLE] marker
      currentChunk = '[TABLE]';
    } else {
      currentChunk += part;
    }
  }

  // Push the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Split text into chunks by sections
 */
function splitBySection(text: string, targetTokens: number = 750): string[] {
  // CRITICAL: Don't split INDIVIDUAL tables! But if there are MULTIPLE tables, split them.
  if (text.includes('[TABLE]')) {
    const tableCount = (text.match(/\[TABLE\]/g) || []).length;

    if (tableCount > 1) {
      // Multiple tables - split at each [TABLE] boundary
      console.log(`   📊 Splitting section with ${tableCount} tables`);
      return splitByTableBoundaries(text, targetTokens);
    }

    // Single table - keep it together if not too large
    const tokens = estimateTokens(text);
    if (tokens <= targetTokens * 2) {
      return [text];
    }
  }

  const chunks: string[] = [];
  const headers = detectSectionHeaders(text);

  if (headers.length === 0) {
    // No headers found, split by paragraphs
    return splitByParagraph(text, targetTokens);
  }

  // Split at header boundaries
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i < headers.length - 1 ? headers[i + 1].index : text.length;
    const section = text.substring(start, end).trim();

    const tokens = estimateTokens(section);

    if (tokens <= targetTokens * 1.5) {
      // Section is small enough
      chunks.push(section);
    } else {
      // Section too large, split further
      const subChunks = splitByParagraph(section, targetTokens);
      chunks.push(...subChunks);
    }
  }

  return chunks;
}

/**
 * Split table content by [REF:] markers to keep each reference item together
 */
function splitByTableReferences(text: string, targetTokens: number = 750): string[] {
  const chunks: string[] = [];
  const refMarkerPattern = /\[REF: [^\]]+\]/g;
  const markers: Array<{ marker: string; index: number }> = [];

  let match;
  while ((match = refMarkerPattern.exec(text)) !== null) {
    markers.push({ marker: match[0], index: match.index });
  }

  if (markers.length === 0) {
    // No markers, just return as-is
    return [text];
  }

  // Extract table header (everything before first REF marker)
  const tableHeader = text.substring(0, markers[0].index).trim();

  // Split by reference markers
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i < markers.length - 1 ? markers[i + 1].index : text.length;
    const refSection = text.substring(start, end).trim();

    // Include table header with each reference section for context
    const chunkWithHeader = tableHeader + '\n\n' + refSection;
    chunks.push(chunkWithHeader);
  }

  return chunks;
}

/**
 * Split text by paragraphs/sentences
 */
function splitByParagraph(text: string, targetTokens: number = 750): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const combined = currentChunk + '\n\n' + para;
    const tokens = estimateTokens(combined);

    if (tokens <= targetTokens * 1.5) {
      currentChunk = combined.trim();
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = para;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Chunk PDF pages into semantically meaningful sections
 * 
 * @param pages - Array of PDF pages with text
 * @param targetTokens - Target tokens per chunk (default: 750)
 * @returns Array of text chunks with metadata
 */
export function chunkPDFPages(pages: PDFPage[], targetTokens: number = 750): TextChunk[] {
  const chunks: TextChunk[] = [];

  // Combine pages into sections
  let currentSection = '';
  let currentPages: number[] = [];
  let sectionTitle = 'Introduction';

  for (const page of pages) {
    // Enrich table content with searchable context
    const enrichedText = enrichTableContent(page.text, page.pageNumber);
    currentSection += enrichedText + '\n\n';
    currentPages.push(page.pageNumber);

    // Check if we have enough tokens for a chunk
    const tokens = estimateTokens(currentSection);

    if (tokens >= targetTokens * 0.8) {
      // Split this section into chunks
      const textChunks = splitBySection(currentSection, targetTokens);

      for (const textChunk of textChunks) {
        const chunkTokens = estimateTokens(textChunk);

        // Extract title from first line or use existing
        const firstLine = textChunk.split('\n')[0].trim();
        const title = firstLine.length > 5 && firstLine.length < 100
          ? firstLine
          : sectionTitle;

        chunks.push({
          content: textChunk,
          sectionTitle: title,
          sectionType: classifySectionType(title, textChunk),
          pageReference: currentPages.length === 1
            ? `Page ${currentPages[0]}`
            : `Pages ${currentPages[0]}-${currentPages[currentPages.length - 1]}`,
          pageNumbers: [...currentPages],
          metadata: {
            keywords: extractKeywords(textChunk),
            modelNumbers: extractModelNumbers(textChunk),
            partNumbers: extractPartNumbers(textChunk),
          },
          tokenCount: chunkTokens,
        });

        // Update section title if we found a header
        if (title !== sectionTitle) {
          sectionTitle = title;
        }
      }

      // Reset for next section
      currentSection = '';
      currentPages = [];
    }
  }

  // Handle remaining content
  if (currentSection.trim()) {
    const textChunks = splitBySection(currentSection, targetTokens);

    for (const textChunk of textChunks) {
      chunks.push({
        content: textChunk,
        sectionTitle,
        sectionType: classifySectionType(sectionTitle, textChunk),
        pageReference: currentPages.length === 1
          ? `Page ${currentPages[0]}`
          : `Pages ${currentPages[0]}-${currentPages[currentPages.length - 1]}`,
        pageNumbers: [...currentPages],
        metadata: {
          keywords: extractKeywords(textChunk),
          modelNumbers: extractModelNumbers(textChunk),
          partNumbers: extractPartNumbers(textChunk),
        },
        tokenCount: estimateTokens(textChunk),
      });
    }
  }

  console.log(`✂️  Created ${chunks.length} chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)} tokens/chunk)`);

  return chunks;
}
