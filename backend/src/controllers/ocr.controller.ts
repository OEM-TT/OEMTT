/**
 * OCR Controller
 *
 * POST /api/ocr/extract
 *
 * Accepts a base64-encoded image of an HVAC serial plate and uses
 * OpenAI Vision (gpt-4o-mini) to extract the raw text from it.
 * The mobile client then runs client-side model-number parsing on
 * the returned text.
 *
 * Edge cases handled:
 *  - Image too large (>4 MB base64) → 413 before hitting OpenAI
 *  - Invalid / missing mimeType → defaults to image/jpeg
 *  - OpenAI returns no content → graceful empty-text response
 *  - OpenAI API error → 502 with message forwarded to client
 *  - Prompt injection via image metadata → isolated system prompt
 *  - Rate-limiting at route level (see ocr.routes.ts)
 */

import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { openai, MODELS } from '@/config/openai';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max base64 payload size: ~4 MB decoded ≈ ~5.4 MB base64 */
const MAX_BASE64_BYTES = 5_400_000;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const OCR_SYSTEM_PROMPT = `You are an OCR assistant that reads text from HVAC equipment serial plates and data labels.

Your ONLY job is to transcribe every piece of text you see in the image, exactly as it appears.
- Preserve line breaks between different fields.
- Keep labels and values on the same line, separated by a colon or space (however they appear).
- Do NOT interpret, explain, or summarize the text.
- Do NOT add any text that is not visible in the image.
- If the image is blurry, partially obscured, or the text is faded, transcribe whatever you CAN read and indicate unclear portions with [?].
- Output ONLY the transcribed text, nothing else.`;

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/ocr/extract
 *
 * Body: { image: string (base64, no data: prefix), mimeType?: string }
 * Returns: { text: string }
 */
export async function extractText(req: AuthRequest, res: Response) {
  const { image, mimeType } = req.body;

  // ── Validate input ──────────────────────────────────────────────────────
  if (!image || typeof image !== 'string') {
    throw new AppError(400, 'image (base64 string) is required');
  }

  if (image.length > MAX_BASE64_BYTES) {
    throw new AppError(
      413,
      'Image is too large. Please reduce the image quality or size before uploading (max ~4 MB).'
    );
  }

  // Sanitise mimeType — default to JPEG if not provided or unrecognised
  const safeMime: AllowedMime = ALLOWED_MIME_TYPES.includes(mimeType as AllowedMime)
    ? (mimeType as AllowedMime)
    : 'image/jpeg';

  const dataUrl = `data:${safeMime};base64,${image}`;

  // ── Call OpenAI Vision ──────────────────────────────────────────────────
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.CHAT_SIMPLE, // gpt-4o-mini supports vision and is cheapest
      max_tokens: 512,           // Serial plates are short; 512 is plenty
      messages: [
        {
          role: 'system',
          content: OCR_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high', // Use high detail for small text on labels
              },
            },
            {
              type: 'text',
              text: 'Transcribe all the text you can see in this image.',
            },
          ],
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content?.trim() ?? '';

    // Log usage for cost tracking (same pattern as chat controller)
    const usage = response.usage;
    if (usage) {
      console.log(
        `[OCR] tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out` +
          ` | user: ${req.user?.id}`
      );
    }

    return res.json({ text: rawText });
  } catch (err: any) {
    // Forward OpenAI-specific error messages when safe to do so
    const openAiMessage: string | undefined =
      err?.error?.message || err?.message;

    // Common Vision API errors worth surfacing to the client
    if (openAiMessage?.includes('Could not process image')) {
      throw new AppError(
        422,
        'The image could not be processed. Try a clearer photo with better lighting.'
      );
    }

    if (openAiMessage?.includes('Invalid image')) {
      throw new AppError(
        422,
        'Invalid image format. Please use JPEG or PNG.'
      );
    }

    console.error('[OCR] OpenAI error:', openAiMessage || err);
    throw new AppError(
      502,
      openAiMessage || 'OCR service temporarily unavailable. Please try again.'
    );
  }
}
