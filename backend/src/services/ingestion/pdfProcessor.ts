/**
 * PDF Processing Service (Table-Aware)
 * 
 * Extracts text content from PDF files with table structure preservation.
 * Uses pdfjs-dist for positioned text extraction and table reconstruction.
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; // Use legacy build for Node.js
import { supabase } from '@/config/supabase';

// In Node.js, we don't need to set a worker

export interface PDFPage {
  pageNumber: number;
  text: string;
  rawText: string;
  tables?: PDFTable[]; // Detected tables
}

export interface PDFTable {
  rows: string[][];
  pageNumber: number;
  position: { x: number; y: number; width: number; height: number };
}

export interface PDFProcessResult {
  pages: PDFPage[];
  metadata: {
    totalPages: number;
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Download PDF from Supabase Storage
 */
async function downloadPDF(storagePath: string): Promise<Buffer> {
  console.log(`📥 Downloading PDF from storage: ${storagePath}`);

  // Remove 'manuals/' prefix if present since we're already using .from('manuals')
  const filename = storagePath.replace(/^manuals\//, '');

  const { data, error } = await supabase.storage
    .from('manuals')
    .download(filename);

  if (error || !data) {
    console.error('❌ Storage download error:', error);
    throw new Error(`Failed to download PDF: ${error?.message || JSON.stringify(error) || 'No data'}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extract positioned text items from a PDF page
 */
async function extractPositionedText(page: any, pageNum?: number): Promise<TextItem[]> {
  const textContent = await page.getTextContent();
  const items: TextItem[] = [];

  // DEBUG: Log raw item count for problematic pages
  if (pageNum && pageNum >= 33 && pageNum <= 43) {
    console.log(`   🔍 DEBUG Page ${pageNum}: Raw textContent has ${textContent.items.length} items`);
    if (textContent.items.length > 0 && textContent.items.length < 10) {
      // Show actual content if very few items
      console.log(`   🔍 DEBUG Page ${pageNum}: Items = ${JSON.stringify(textContent.items.map((i: any) => i.str).slice(0, 5))}`);
    }
  }

  for (const item of textContent.items) {
    if ('str' in item && 'transform' in item) {
      // transform[4] = x position, transform[5] = y position
      const x = item.transform[4];
      const y = item.transform[5];
      const width = item.width;
      const height = item.height;

      items.push({
        str: item.str.trim(),
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
      });
    }
  }

  return items;
}

/**
 * Group text items into rows based on vertical position
 */
function groupIntoRows(items: TextItem[], yTolerance: number = 5): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y position (top to bottom)
  const sorted = [...items].sort((a, b) => b.y - a.y);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];

    // If Y position is within tolerance, it's the same row
    if (Math.abs(item.y - currentY) <= yTolerance) {
      currentRow.push(item);
    } else {
      // Sort row items by X position (left to right)
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
      currentRow = [item];
      currentY = item.y;
    }
  }

  // Add last row
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Check if a row looks like a table header
 */
function isHeaderRow(row: TextItem[]): boolean {
  if (row.length < 2) return false; // Headers have multiple columns

  // Header indicators: All caps, short text, common header words
  const text = row.map(item => item.str.trim()).join(' ');
  const hasHeaderWords = /(reference|description|status|condition|code|led|color|type|action|cause)/i.test(text);
  const hasShortCells = row.every(item => item.str.trim().length < 30);
  const hasMultipleCaps = (text.match(/[A-Z]/g) || []).length / text.length > 0.3;

  return (hasHeaderWords && hasShortCells) || hasMultipleCaps;
}

/**
 * Detect multiple tables on a page by finding table boundaries
 */
function detectTables(rows: TextItem[][], pageNum: number): PDFTable[] {
  const tables: PDFTable[] = [];

  // Find table boundaries (header rows)
  const tableGroups: TextItem[][][] = [];
  let currentGroup: TextItem[][] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if this is blank
    const isBlank = row.length === 0 || row.every(item => item.str.trim() === '');

    if (isBlank) {
      // Blank rows separate tables
      if (currentGroup.length > 0) {
        tableGroups.push([...currentGroup]);
        currentGroup = [];
      }
      continue;
    }

    // Check if this looks like a new table header (after we already have rows)
    const looksLikeHeader = isHeaderRow(row);

    if (looksLikeHeader && currentGroup.length > 3) {
      // This looks like a new table starting - end current group
      tableGroups.push([...currentGroup]);
      currentGroup = [row]; // Start new group with this header
    } else {
      currentGroup.push(row);
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    tableGroups.push(currentGroup);
  }

  console.log(`   📊 Detected ${tableGroups.length} potential table(s) on page ${pageNum}`);

  // Try to detect a table in each group
  for (const group of tableGroups) {
    const table = detectTable(group);
    if (table) {
      table.pageNumber = pageNum;
      tables.push(table);
    }
  }

  return tables;
}

/**
 * Detect if rows form a table structure
 */
function detectTable(rows: TextItem[][]): PDFTable | null {
  if (rows.length < 2) return null; // Relaxed: need at least header + 1 data row

  // Check if rows have consistent column structure
  const firstRowXPositions = rows[0].map(item => item.x);
  let consistentColumns = 0;

  for (let i = 1; i < Math.min(rows.length, 10); i++) { // Check more rows (10 vs 5)
    const rowXPositions = rows[i].map(item => item.x);
    let matches = 0;

    for (const x of firstRowXPositions) {
      if (rowXPositions.some(rx => Math.abs(rx - x) < 30)) { // More tolerance (30 vs 20)
        matches++;
      }
    }

    if (matches >= firstRowXPositions.length * 0.5) { // Relaxed: 50% vs 60%
      consistentColumns++;
    }
  }

  // Relaxed: at least 1 row with consistent columns (vs 2)
  if (consistentColumns >= 1) {
    // Build table rows
    const tableRows: string[][] = [];

    for (const row of rows) {
      const rowData: string[] = row.map(item => item.str);
      tableRows.push(rowData);
    }

    // Calculate bounding box
    const allItems = rows.flat();
    const minX = Math.min(...allItems.map(i => i.x));
    const maxX = Math.max(...allItems.map(i => i.x + i.width));
    const minY = Math.min(...allItems.map(i => i.y));
    const maxY = Math.max(...allItems.map(i => i.y + i.height));

    return {
      rows: tableRows,
      pageNumber: 0, // Set later
      position: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  }

  return null;
}

/**
 * Format table as markdown-style text for embedding
 */
/**
 * Format table with reference markers for multi-row clarity
 * Universal approach: detects reference columns automatically
 */
function formatTableAsText(table: PDFTable): string {
  if (table.rows.length === 0) return '';

  const lines: string[] = [];

  // Assume first row is header
  const header = table.rows[0];
  lines.push(`[TABLE] ${header.join(' | ')}`);
  lines.push('');

  // Find reference column index (common column names for identification)
  // This works universally across all OEMs and manual types
  // Match if the column contains any of these keywords (not exact match)
  const refColIndex = header.findIndex(col =>
    /(reference|ref|code|led|part|terminal|component|item|fault|error|flash|model|number|id)/i.test(col.trim())
  );

  let currentRef = '';

  // Data rows - NO reference markers (they were causing confusion)
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    lines.push(`${row.join(' | ')}`);
  }

  return lines.join('\n');
}

/**
 * Extract text from PDF buffer with table awareness
 */
async function extractTextFromPDF(buffer: Buffer): Promise<PDFProcessResult> {
  console.log(`📄 Parsing PDF with table detection (${(buffer.length / 1024).toFixed(2)} KB)`);

  const pdfData = new Uint8Array(buffer);
  const pdfDocument = await pdfjs.getDocument({ data: pdfData }).promise;

  const pages: PDFPage[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);

    // Extract positioned text items
    const textItems = await extractPositionedText(page, pageNum);

    // Group into rows
    const rows = groupIntoRows(textItems);

    // Detect tables (can be multiple per page)
    const tables: PDFTable[] = detectTables(rows, pageNum);

    // Build page text - Extract ALL text AND format tables properly
    // Strategy: Get all text first (guaranteed complete), then add formatted tables
    let pageText = '';

    // Step 1: Extract ALL text in reading order (top to bottom)
    const allText: string[] = [];
    for (const row of rows) {
      const rowText = row.map(item => item.str).join(' ');
      if (rowText.trim()) {
        allText.push(rowText);
      }
    }

    // Step 2: Build page content
    if (tables.length > 0) {
      // Page has tables: include both raw text AND formatted tables
      // This ensures we capture everything

      // Add all text first
      pageText = allText.join('\n') + '\n\n';

      // Then add formatted tables with clear markers
      pageText += '=== STRUCTURED TABLES ===\n\n';
      for (const table of tables) {
        pageText += formatTableAsText(table) + '\n\n';
      }
    } else {
      // No tables: just concatenate text
      pageText = allText.join('\n');
    }

    pages.push({
      pageNumber: pageNum,
      text: pageText.trim(),
      rawText: pageText,
      tables,
    });

    console.log(`   Page ${pageNum}: ${tables.length} tables, ${rows.length} rows, ${pageText.length} chars`);
  }

  return {
    pages,
    metadata: {
      totalPages: pdfDocument.numPages,
      title: undefined,
      author: undefined,
      creationDate: undefined,
    },
  };
}

/**
 * Process a PDF manual from Supabase Storage
 * 
 * @param storagePath - Path to PDF in Supabase Storage (e.g., "manuals/carrier-25vna8-service.pdf")
 * @returns Extracted pages and metadata
 */
export async function processPDFManual(storagePath: string): Promise<PDFProcessResult> {
  try {
    // Download PDF
    const buffer = await downloadPDF(storagePath);

    // Extract text
    const result = await extractTextFromPDF(buffer);

    console.log(`✅ PDF processed: ${result.metadata.totalPages} pages, ${result.pages.reduce((sum, p) => sum + p.text.length, 0)} characters`);

    return result;
  } catch (error) {
    console.error('❌ PDF processing failed:', error);
    throw error;
  }
}
