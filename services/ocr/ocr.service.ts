/**
 * OCR Service
 *
 * Sends a captured image to the backend for text extraction.
 * The backend uses OpenAI Vision (or similar) to return the raw
 * text from the serial plate, which we then parse client-side.
 *
 * Fallback chain:
 *  1. Backend vision OCR  (best accuracy)
 *  2. Error → surface raw base64 image for manual entry
 */

import apiClient from '../api';
import { extractModelNumber, ExtractedModel } from './modelExtractor';

export interface OcrResult {
  rawText: string;
  extracted: ExtractedModel | null;
  error?: string;
}

/**
 * Send an image (base64 or file URI) to the backend OCR endpoint.
 *
 * @param imageBase64  Pure base64 string (no data: prefix)
 * @param mimeType     e.g. 'image/jpeg'
 * @param preferredOem Optional OEM name to bias model extraction
 */
export async function ocrImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  preferredOem?: string
): Promise<OcrResult> {
  try {
    const response = await apiClient.post<{
      text: string;
      modelNumber?: string | null;
      manufacturer?: string | null;
      error?: string;
    }>(
      '/ocr/extract',
      { image: imageBase64, mimeType },
      { timeout: 30000 } // OCR can be slow on first cold-start
    );

    const rawText = response.data?.text ?? '';
    const aiModelNumber = response.data?.modelNumber ?? null;
    const aiManufacturer = response.data?.manufacturer ?? null;

    if (!rawText && !aiModelNumber) {
      return {
        rawText: '',
        extracted: null,
        error: 'No text detected in the image. Try better lighting or a closer angle.',
      };
    }

    // Prefer AI-extracted model number; fall back to regex-based extraction
    let extracted: ExtractedModel | null = null;
    if (aiModelNumber) {
      extracted = {
        modelNumber: aiModelNumber.trim().toUpperCase(),
        confidence: 'high',
        detectedOem: aiManufacturer ?? undefined,
        method: 'label-match', // GPT read the label directly
        rawText,
      };
    } else {
      extracted = extractModelNumber(rawText, preferredOem ?? aiManufacturer ?? undefined);
    }

    return { rawText, extracted };
  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      'OCR failed. Please enter the model number manually.';
    return { rawText: '', extracted: null, error: message };
  }
}
