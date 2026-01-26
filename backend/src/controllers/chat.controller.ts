/**
 * Chat Controller
 * 
 * Handles AI chat requests with streaming responses.
 */

import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { gatherChatContext, buildSystemPrompt } from '@/services/answering/context';
import { openai, MODELS, calculateCost, estimateTokens } from '@/config/openai';
import { prisma } from '@/config/database';
import { AppError } from '@/middleware/errorHandler';

/**
 * Ask a question about a saved unit
 * 
 * POST /api/chat/ask
 * Body: { 
 *   unitId: string, 
 *   chatSessionId?: string,  // Chat session ID (created if not provided)
 *   question?: string,  // Legacy: single question
 *   messages?: Array<{ role: 'user' | 'assistant', content: string, timestamp?: string }>  // New: conversation history
 * }
 * 
 * Returns: Streaming SSE response with AI answer
 */
export async function askQuestion(req: AuthRequest, res: Response) {
  const { unitId, chatSessionId, question, messages } = req.body;
  const userId = req.user!.id;

  // Validate input - support both legacy (question) and new (messages) format
  if (!unitId) {
    throw new AppError(400, 'unitId is required');
  }

  // Extract current question from either format
  let currentQuestion: string;
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (messages && Array.isArray(messages) && messages.length > 0) {
    // New format: conversation history
    // Take last 10 messages
    conversationHistory = messages.slice(-10);
    
    // Current question is the last user message
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage.role !== 'user') {
      throw new AppError(400, 'Last message must be from user');
    }
    currentQuestion = lastMessage.content;
    
    // Remove the current question from history (it will be sent separately to GPT)
    conversationHistory = conversationHistory.slice(0, -1);
  } else if (question) {
    // Legacy format: single question
    currentQuestion = question;
  } else {
    throw new AppError(400, 'Either question or messages array is required');
  }

  if (currentQuestion.length > 500) {
    throw new AppError(400, 'Question is too long (max 500 characters)');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`💬 Chat Request`);
  console.log(`   User: ${req.user!.email}`);
  console.log(`   Unit: ${unitId}`);
  console.log(`   Question: "${currentQuestion}"`);
  console.log(`   Conversation history: ${conversationHistory.length} messages`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // 1. Gather context (unit, model, manuals, relevant sections)
    // Using 20 sections for better coverage, especially for broad/vague queries
    const context = await gatherChatContext(unitId, currentQuestion, 20, conversationHistory);

    // Check if we have sufficient manual coverage
    const hasRelevantSections = context.relevantSections.length > 0;
    const avgSimilarity = hasRelevantSections
      ? context.relevantSections.reduce((sum, s) => sum + s.similarity, 0) / context.relevantSections.length
      : 0;

    // Warn if similarity is low (< 0.60 average)
    // Lowered threshold from 0.75 to accommodate broader queries
    const lowConfidence = avgSimilarity < 0.60 && avgSimilarity > 0;

    if (lowConfidence) {
      console.warn(`⚠️  Low similarity score: ${avgSimilarity.toFixed(2)} - Answer may not be accurate`);
    }

    // 2. Build system prompt
    const systemPrompt = buildSystemPrompt(context);

    // 3. Estimate tokens and choose model
    const estimatedInputTokens = estimateTokens(systemPrompt + currentQuestion);

    // Use gpt-4o-mini for:
    // - Flash code / error code queries (need accurate table reading)
    // - Complex troubleshooting
    // - Diagnostic questions
    // - Long questions
    const isFlashCodeQuery = /\b(flash|error|fault|diagnostic)\s*code\s*\d+/i.test(currentQuestion);
    const useComplexModel = isFlashCodeQuery ||
      currentQuestion.toLowerCase().includes('troubleshoot') ||
      currentQuestion.toLowerCase().includes('diagnose') ||
      currentQuestion.toLowerCase().includes('why') ||
      currentQuestion.includes('?') && currentQuestion.split(' ').length > 10;

    const model = useComplexModel ? MODELS.CHAT_COMPLEX : MODELS.CHAT_SIMPLE;

    console.log(`\n🤖 AI Request:`);
    console.log(`   Model: ${model}`);
    console.log(`   Input tokens (est): ${estimatedInputTokens}`);
    console.log(`   Context sections: ${context.relevantSections.length}`);
    console.log(`   Avg similarity: ${avgSimilarity.toFixed(2)}`);

    // 4. Set up Server-Sent Events (SSE) for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Helper function to send SSE messages
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial context event
    sendEvent('context', {
      unit: context.unit.nickname,
      model: `${context.model.oem} ${context.model.modelNumber}`,
      manualsCount: context.manuals.length,
      sectionsCount: context.relevantSections.length,
      lowConfidence: lowConfidence,
      avgSimilarity: avgSimilarity,
    });

    // Send warning if confidence is low
    if (lowConfidence) {
      sendEvent('warning', {
        message: 'The manual sections found may not directly address your question. The answer might be limited.',
      });
    }

    // If no sections found at all, send a clearer message
    if (!hasRelevantSections) {
      sendEvent('warning', {
        message: 'No relevant sections found in the manual for this question. Searching for general information...',
      });
    }

    // 5. Stream AI response
    let fullAnswer = '';
    let outputTokens = 0;

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentQuestion },
      ],
      temperature: 0.6, // Balanced: follows manual but allows reasoning & general knowledge
      max_tokens: 2000, // Increased from 1000 to allow complete responses with all causes/actions
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullAnswer += content;
        outputTokens += estimateTokens(content);

        // Send token event
        sendEvent('token', { content });
      }
    }

    // 6. Calculate final stats
    const processingTime = Date.now() - startTime;
    const inputTokens = estimatedInputTokens;
    const cost = calculateCost(model, inputTokens, outputTokens);

    console.log(`\n✅ Response complete:`);
    console.log(`   Output tokens: ${outputTokens}`);
    console.log(`   Processing time: ${processingTime}ms`);
    console.log(`   Cost: $${cost.toFixed(6)}`);
    console.log('='.repeat(60) + '\n');

    // 7. Save question and answer to database (non-blocking)
    let questionRecord = null;
    let finalSessionId: string | null = chatSessionId || null;
    try {
      // Look up the internal database user ID (not Supabase Auth ID)
      const dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: userId },
        select: { id: true },
      });

      if (!dbUser) {
        console.warn('⚠️  User not found in database - skipping question save');
        throw new Error('User not found in database');
      }

      // Create or reuse chat session
      let sessionId = finalSessionId;
      if (!sessionId) {
        // Create new chat session
        const session = await prisma.chat_sessions.create({
          data: {
            user_id: dbUser.id,
            unit_id: unitId,
            title: currentQuestion.substring(0, 50), // Use first 50 chars of question as title
            last_message_at: new Date(),
          },
        });
        sessionId = session.id;
        finalSessionId = sessionId; // Update outer scope
        console.log(`📝 Created new chat session: ${sessionId}`);
      } else {
        // Update existing session's last_message_at
        await prisma.chat_sessions.update({
          where: { id: sessionId },
          data: { last_message_at: new Date() },
        });
        console.log(`📝 Using existing chat session: ${sessionId}`);
      }

      questionRecord = await prisma.question.create({
        data: {
          userId: dbUser.id, // Use internal database ID, not Supabase Auth ID
          modelId: context.model.id,
          manualId: context.manuals[0]?.id || null,
          chat_session_id: sessionId, // Link to chat session
          questionText: currentQuestion,
          context: {
            intent: useComplexModel ? 'complex' : 'simple',
            serialNumber: context.unit.serialNumber,
            relevantSections: context.relevantSections.map(s => ({
              id: s.id,
              similarity: s.similarity,
              pageReference: s.pageReference,
            })),
          },
          answerText: fullAnswer,
          answerSources: context.relevantSections.map(s => ({
            manualId: s.manualId,
            manualTitle: s.manualTitle,
            sectionId: s.id,
            sectionTitle: s.sectionTitle,
            sectionType: s.sectionType,
            pageReference: s.pageReference,
            confidence: s.similarity,
          })),
          confidenceScore: context.relevantSections.length > 0
            ? context.relevantSections.reduce((sum, s) => sum + s.similarity, 0) / context.relevantSections.length
            : 0.5,
          processingTimeMs: processingTime,
        },
      });
    } catch (dbError: any) {
      console.warn('⚠️  Failed to save question to database:', dbError.message);
      // Continue - don't fail the entire request just because we couldn't save
    }

    // 8. Send completion event
    sendEvent('complete', {
      chatSessionId: finalSessionId, // Send session ID to frontend for follow-up questions
      questionId: questionRecord?.id || null,
      stats: {
        inputTokens,
        outputTokens,
        processingTimeMs: processingTime,
        cost,
      },
      sources: context.relevantSections.map(s => ({
        title: s.manualTitle,
        section: s.sectionTitle,
        page: s.pageReference,
        type: s.sectionType,
      })),
    });

    // Close the stream
    res.end();

  } catch (error) {
    console.error('❌ Chat error:', error);

    // Send error event
    res.write(`event: error\ndata: ${JSON.stringify({
      error: error instanceof Error ? error.message : 'An error occurred',
    })}\n\n`);

    res.end();
  }
}

/**
 * Get question history for a user
 * 
 * GET /api/chat/history?unitId=xxx&limit=10
 */
/**
 * Get a single question by ID
 * 
 * GET /api/chat/question/:questionId
 */
export async function getQuestionById(req: AuthRequest, res: Response) {
  const questionId = Array.isArray(req.params.questionId) ? req.params.questionId[0] : req.params.questionId;
  const supabaseUserId = req.user!.id;

  // Look up the internal database user ID
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { id: true },
  });

  if (!dbUser) {
    throw new AppError(404, 'User not found in database');
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      userId: dbUser.id, // Ensure user owns this question
    },
    include: {
      model: {
        include: {
          productLine: {
            include: {
              oem: true,
            },
          },
        },
      },
    },
  });

  if (!question) {
    throw new AppError(404, 'Question not found');
  }

  res.json({
    id: question.id,
    question: question.questionText,
    answer: question.answerText,
    confidence: question.confidenceScore,
    processingTime: question.processingTimeMs,
    sources: question.answerSources,
    timestamp: question.createdAt,
    model: `${question.model.productLine.oem.name} ${question.model.modelNumber}`,
  });
}

/**
 * Get chat session history for a user/unit
 * 
 * GET /api/chat/history
 */
export async function getQuestionHistory(req: AuthRequest, res: Response) {
  const { unitId, limit = 10 } = req.query;
  const supabaseUserId = req.user!.id;

  // Look up the internal database user ID
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { id: true },
  });

  if (!dbUser) {
    throw new AppError(404, 'User not found in database');
  }

  const where: any = { user_id: dbUser.id };

  if (unitId) {
    where.unit_id = unitId as string;
  }

  // Get chat sessions instead of individual questions
  const sessions = await prisma.chat_sessions.findMany({
    where,
    orderBy: { last_message_at: 'desc' },
    take: parseInt(limit as string),
    include: {
      questions: {
        orderBy: { createdAt: 'asc' },
        take: 1, // Get first question for preview
      },
    },
  });

  // Need to fetch unit details separately with proper relations
  const sessionsWithDetails = await Promise.all(sessions.map(async (session: any) => {
    const unit = await prisma.savedUnit.findUnique({
      where: { id: session.unit_id },
      include: {
        model: {
          include: {
            productLine: {
              include: {
                oem: true
              }
            }
          }
        }
      }
    });
    
    return {
      id: session.id,
      title: session.title,
      unitName: unit?.nickname || 'Unknown Unit',
      model: unit ? `${unit.model.productLine.oem.name} ${unit.model.modelNumber}` : 'Unknown Model',
      lastMessageAt: session.last_message_at,
      createdAt: session.created_at,
      // Preview: First question and answer
      preview: session.questions?.[0] ? {
        question: session.questions[0].questionText,
        answer: session.questions[0].answerText?.substring(0, 100) + '...',
      } : null,
    };
  }));

  res.json({
    total: sessions.length,
    sessions: sessionsWithDetails,
  });
}

/**
 * Get messages for a specific chat session
 * 
 * GET /api/chat/session/:sessionId
 */
export async function getChatSession(req: AuthRequest, res: Response) {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const supabaseUserId = req.user!.id;

  // Look up the internal database user ID
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { id: true },
  });

  if (!dbUser) {
    throw new AppError(404, 'User not found in database');
  }

  const session = await prisma.chat_sessions.findFirst({
    where: {
      id: sessionId,
      user_id: dbUser.id, // Ensure user owns this session
    },
    include: {
      questions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) {
    throw new AppError(404, 'Chat session not found');
  }

  // Fetch unit details separately
  const unit = await prisma.savedUnit.findUnique({
    where: { id: session.unit_id },
    include: {
      model: {
        include: {
          productLine: {
            include: {
              oem: true
            }
          }
        }
      }
    }
  });

  res.json({
    id: session.id,
    title: session.title,
    unitName: unit?.nickname || 'Unknown Unit',
    model: unit ? `${unit.model.productLine.oem.name} ${unit.model.modelNumber}` : 'Unknown Model',
    lastMessageAt: session.last_message_at,
    createdAt: session.created_at,
    messages: (session.questions || []).map((q: any) => ({
      id: q.id,
      question: q.questionText,
      answer: q.answerText,
      confidence: q.confidenceScore,
      processingTime: q.processingTimeMs,
      sources: q.answerSources,
      timestamp: q.createdAt,
    })),
  });
}

/**
 * Legacy: Get question history (deprecated - use getQuestionHistory instead)
 */
async function getLegacyQuestionHistory(req: AuthRequest, res: Response) {
  const { unitId, limit = 10 } = req.query;
  const supabaseUserId = req.user!.id;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { id: true },
  });

  if (!dbUser) {
    throw new AppError(404, 'User not found in database');
  }

  const where: any = { userId: dbUser.id };

  if (unitId) {
    const unit = await prisma.savedUnit.findUnique({
      where: { id: unitId as string },
      select: { modelId: true },
    });

    if (unit) {
      where.modelId = unit.modelId;
    }
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit as string),
    select: {
      id: true,
      questionText: true,
      answerText: true,
      confidenceScore: true,
      processingTimeMs: true,
      createdAt: true,
      model: {
        select: {
          modelNumber: true,
          productLine: {
            select: {
              name: true,
              oem: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  res.json({
    total: questions.length,
    questions: questions.map(q => ({
      id: q.id,
      question: q.questionText,
      answer: q.answerText,
      confidence: q.confidenceScore,
      processingTime: q.processingTimeMs,
      timestamp: q.createdAt,
      model: `${q.model.productLine.oem.name} ${q.model.modelNumber}`,
    })),
  });
}
