/**
 * Analytics Controller
 * Provides detailed metrics for the admin dashboard
 */

import { Request, Response } from 'express';
import { prisma } from '@/config/database';

// Failure detection keywords
const FAILURE_KEYWORDS = [
  'cannot find',
  'don\'t have',
  'not available',
  'no information',
  'i don\'t know',
  'unable to locate',
  'not found in',
  'doesn\'t contain',
  'no manual sections',
  'could not find any relevant'
];

/**
 * Helper: Parse time range query param
 */
function getTimeRangeFilter(timeRange?: string): Date | null {
  const now = new Date();
  
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 1 * 60 * 60 * 1000);
    case '4h':
      return new Date(now.getTime() - 4 * 60 * 60 * 1000);
    case '12h':
      return new Date(now.getTime() - 12 * 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null; // No filter
  }
}

/**
 * Helper: Detect if answer is a failure
 */
function isFailedResponse(answer: string): boolean {
  const lowerAnswer = answer.toLowerCase();
  return FAILURE_KEYWORDS.some(keyword => lowerAnswer.includes(keyword));
}

/**
 * GET /api/analytics/overview
 * High-level metrics and activity summary
 */
export async function getOverview(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const startDate = getTimeRangeFilter(timeRange);

    // Total counts
    const totalUsers = await prisma.user.count();
    const totalUnits = await prisma.savedUnit.count();
    const totalManuals = await prisma.manual.count({ where: { status: 'active' } });
    const totalQuestions = await prisma.question.count();
    const totalSessions = await prisma.chat_sessions.count();

    // Today's activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayUsers = await prisma.user.count({
      where: { createdAt: { gte: today } }
    });

    // Cost calculations (OpenAI pricing: $0.150/1M input, $0.600/1M output for gpt-4o-mini)
    const INPUT_COST_PER_TOKEN = 0.150 / 1_000_000;
    const OUTPUT_COST_PER_TOKEN = 0.600 / 1_000_000;

    // Get questions with token data and context
    const questions = await prisma.question.findMany({
      where: startDate ? { createdAt: { gte: startDate } } : {},
      select: {
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        createdAt: true,
        context: true,
      },
    });

    const todayQuestions = questions.filter(q => q.createdAt >= today);

    // Separate OpenAI and Perplexity costs
    const openAIQuestions = questions.filter(q => {
      const ctx = q.context as any;
      return !ctx || !ctx.provider || ctx.provider !== 'perplexity';
    });
    const perplexityQuestions = questions.filter(q => {
      const ctx = q.context as any;
      return ctx && ctx.provider === 'perplexity';
    });

    const todayOpenAI = todayQuestions.filter(q => {
      const ctx = q.context as any;
      return !ctx || !ctx.provider || ctx.provider !== 'perplexity';
    });
    const todayPerplexity = todayQuestions.filter(q => {
      const ctx = q.context as any;
      return ctx && ctx.provider === 'perplexity';
    });

    // Calculate actual costs from stored data
    let chatCost = openAIQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
    let todayChatCost = todayOpenAI.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
    
    let perplexityCost = perplexityQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
    let todayPerplexityCost = todayPerplexity.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);

    // Total costs (Chat + Perplexity)
    let totalCost = chatCost + perplexityCost;
    let todayCost = todayChatCost + todayPerplexityCost;

    // Active users (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: { lastActiveAt: { gte: yesterday } }
    });

    // Activity over time (last 7 days, daily)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activityByDay = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM questions
      WHERE created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: Date; count: bigint }>;

    res.json({
      totals: {
        users: totalUsers,
        units: totalUnits,
        manuals: totalManuals,
        questions: totalQuestions,
        sessions: totalSessions,
      },
      today: {
        newUsers: todayUsers,
        questions: todayQuestions.length,
        cost: todayCost,
      },
      costs: {
        today: todayCost,
        total: totalCost,
      },
      activeUsers,
      activityChart: activityByDay.map(row => ({
        date: row.date,
        count: Number(row.count),
      })),
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
}

/**
 * GET /api/analytics/costs
 * Detailed cost breakdown for pricing model
 */
export async function getCostAnalytics(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const startDate = getTimeRangeFilter(timeRange);

    const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

    // Get all questions with costs (Chat costs) including context to identify provider
    const questions = await prisma.question.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        estimatedCost: true,
        inputTokens: true,
        outputTokens: true,
        processingTimeMs: true,
        createdAt: true,
        chat_session_id: true,
        context: true,
      },
    });

    // Separate OpenAI and Perplexity questions
    const openAIQuestions = questions.filter(q => {
      const ctx = q.context as any;
      return !ctx || !ctx.provider || ctx.provider !== 'perplexity';
    });
    const perplexityQuestions = questions.filter(q => {
      const ctx = q.context as any;
      return ctx && ctx.provider === 'perplexity';
    });

    // Get Perplexity searches (Discovery costs - manual discovery only)
    const PERPLEXITY_COST_PER_SEARCH = 0.002; // $0.002 per search (legacy, only for manual discovery)
    const searches = await prisma.search.findMany({
      where: {
        ...whereClause,
        usedPerplexity: true,
      },
    });

    // Get all users for per-user calculations
    const users = await prisma.user.findMany({
      include: {
        questions: {
          where: whereClause,
          select: {
            estimatedCost: true,
            createdAt: true,
            context: true,
          },
        },
        searches: {
          where: {
            ...whereClause,
            usedPerplexity: true,
          },
        },
      },
    });

    // Calculate OpenAI chat metrics
    const totalQuestions = questions.length;
    const openAICost = openAIQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
    const questionsWithCost = questions.filter(q => q.estimatedCost && q.estimatedCost > 0);
    
    // Calculate Perplexity costs (chat fallback + manual discovery)
    const perplexityChatCost = perplexityQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
    const perplexityDiscoveryCost = searches.length * PERPLEXITY_COST_PER_SEARCH;
    const totalPerplexityCost = perplexityChatCost + perplexityDiscoveryCost;
    const totalSearches = searches.length;

    // Total costs
    const chatCost = openAICost; // OpenAI only
    const discoveryCost = totalPerplexityCost; // All Perplexity costs
    const totalCost = chatCost + discoveryCost;

    // Average cost per question (only counting questions with cost data)
    const avgCostPerQuestion = questionsWithCost.length > 0
      ? questionsWithCost.reduce((sum, q) => sum + (q.estimatedCost || 0), 0) / questionsWithCost.length
      : 0;

    // Calculate cost per session
    const sessionCosts = new Map<string, number>();
    questions.forEach(q => {
      if (q.chat_session_id && q.estimatedCost) {
        const current = sessionCosts.get(q.chat_session_id) || 0;
        sessionCosts.set(q.chat_session_id, current + q.estimatedCost);
      }
    });

    const avgCostPerSession = sessionCosts.size > 0
      ? Array.from(sessionCosts.values()).reduce((sum, cost) => sum + cost, 0) / sessionCosts.size
      : 0;

    // User cost breakdown (including OpenAI chat + Perplexity chat + Perplexity discovery costs)
    const userCosts = users.map(user => {
      const userQuestions = user.questions;
      
      // Separate OpenAI and Perplexity questions
      const userOpenAIQuestions = userQuestions.filter(q => {
        const ctx = q.context as any;
        return !ctx || !ctx.provider || ctx.provider !== 'perplexity';
      });
      const userPerplexityQuestions = userQuestions.filter(q => {
        const ctx = q.context as any;
        return ctx && ctx.provider === 'perplexity';
      });

      const userOpenAICost = userOpenAIQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
      const userPerplexityChatCost = userPerplexityQuestions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
      const userPerplexityDiscoveryCost = user.searches.length * PERPLEXITY_COST_PER_SEARCH;
      const userPerplexityTotalCost = userPerplexityChatCost + userPerplexityDiscoveryCost;
      const userTotalCost = userOpenAICost + userPerplexityTotalCost;
      
      // Calculate monthly cost (assuming 30 days)
      const oldestQuestion = userQuestions.length > 0 
        ? new Date(Math.min(...userQuestions.map(q => new Date(q.createdAt).getTime())))
        : new Date();
      const daysSinceFirstQuestion = Math.max(1, Math.ceil((Date.now() - oldestQuestion.getTime()) / (1000 * 60 * 60 * 24)));
      const monthlyMultiplier = 30 / daysSinceFirstQuestion;
      const avgMonthlyEstimate = userTotalCost * monthlyMultiplier;

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        totalCost: userTotalCost,
        chatCost: userOpenAICost,
        discoveryCost: userPerplexityTotalCost,
        perplexityChatCost: userPerplexityChatCost,
        perplexityDiscoveryCost: userPerplexityDiscoveryCost,
        questionCount: userQuestions.length,
        searchCount: user.searches.length,
        avgCostPerQuestion: userQuestions.length > 0 ? userTotalCost / userQuestions.length : 0,
        estimatedMonthlyCost: avgMonthlyEstimate,
        daysSinceFirstQuestion,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    // Calculate average cost per user
    const activeUsers = userCosts.filter(u => u.questionCount > 0 || u.searchCount > 0);
    const avgCostPerUser = activeUsers.length > 0
      ? activeUsers.reduce((sum, u) => sum + u.totalCost, 0) / activeUsers.length
      : 0;
    
    const avgMonthlyCostPerUser = activeUsers.length > 0
      ? activeUsers.reduce((sum, u) => sum + u.estimatedMonthlyCost, 0) / activeUsers.length
      : 0;

    // Cost over time (daily) - chat costs
    const costByDay = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as question_count
      FROM questions
      WHERE created_at >= ${startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        AND estimated_cost IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: Date; total_cost: number; question_count: bigint }>;

    // Token cost breakdown
    const totalInputTokens = questions.reduce((sum, q) => sum + (q.inputTokens || 0), 0);
    const totalOutputTokens = questions.reduce((sum, q) => sum + (q.outputTokens || 0), 0);
    const avgInputTokens = questionsWithCost.length > 0 ? totalInputTokens / questionsWithCost.length : 0;
    const avgOutputTokens = questionsWithCost.length > 0 ? totalOutputTokens / questionsWithCost.length : 0;

    // Calculate percentiles for cost distribution
    const sortedCosts = questionsWithCost.map(q => q.estimatedCost!).sort((a, b) => a - b);
    const p50 = sortedCosts[Math.floor(sortedCosts.length * 0.5)] || 0;
    const p90 = sortedCosts[Math.floor(sortedCosts.length * 0.9)] || 0;
    const p95 = sortedCosts[Math.floor(sortedCosts.length * 0.95)] || 0;
    const p99 = sortedCosts[Math.floor(sortedCosts.length * 0.99)] || 0;

    // Profit margin calculator - different subscription price points
    const subscriptionPricePoints = [4.99, 9.99, 14.99, 19.99, 29.99, 49.99, 99.99];
    const profitMargins = subscriptionPricePoints.map(price => {
      const profitPerUser = price - avgMonthlyCostPerUser;
      const marginPercent = ((profitPerUser / price) * 100);
      return {
        price,
        avgCost: avgMonthlyCostPerUser,
        profit: profitPerUser,
        marginPercent,
      };
    });

    res.json({
      overview: {
        totalCost,
        chatCost,
        discoveryCost,
        totalQuestions,
        totalSearches,
        questionsWithCost: questionsWithCost.length,
        avgCostPerQuestion,
        avgCostPerSession,
        avgCostPerUser,
        avgMonthlyCostPerUser,
        totalSessions: sessionCosts.size,
        activeUsers: activeUsers.length,
      },
      discovery: {
        totalSearches,
        perplexityCost: discoveryCost,
        perplexityChatCost: perplexityChatCost,
        perplexityDiscoveryCost: perplexityDiscoveryCost,
        perplexityChatQuestions: perplexityQuestions.length,
        avgCostPerSearch: PERPLEXITY_COST_PER_SEARCH,
        percentOfTotal: totalCost > 0 ? (discoveryCost / totalCost) * 100 : 0,
      },
      chat: {
        totalQuestions,
        chatCost,
        avgCostPerQuestion,
        percentOfTotal: totalCost > 0 ? (chatCost / totalCost) * 100 : 0,
      },
      tokens: {
        avgInputTokens: Math.round(avgInputTokens),
        avgOutputTokens: Math.round(avgOutputTokens),
        totalInputTokens,
        totalOutputTokens,
      },
      costDistribution: {
        p50,
        p90,
        p95,
        p99,
        min: sortedCosts[0] || 0,
        max: sortedCosts[sortedCosts.length - 1] || 0,
      },
      profitMargins,
      userCosts: userCosts.slice(0, 20), // Top 20 users by cost
      costOverTime: costByDay.map(row => ({
        date: row.date,
        cost: row.total_cost,
        questionCount: Number(row.question_count),
      })),
    });
  } catch (error: any) {
    console.error('Cost analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch cost analytics' });
  }
}

/**
 * GET /api/analytics/chat
 * Detailed chat/Q&A metrics
 */
export async function getChatAnalytics(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const startDate = getTimeRangeFilter(timeRange);

    const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

    // Fetch all questions with details
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true, name: true } },
        model: {
          include: {
            productLine: {
              include: { oem: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate metrics using real token data
    const totalQuestions = questions.length;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalResponseTime = 0;
    let failedCount = 0;
    const failedQueries: any[] = [];
    const manualCount = questions.filter(q => q.confidenceScore && q.confidenceScore >= 0.6).length;

    questions.forEach(q => {
      totalInputTokens += q.inputTokens || 0;
      totalOutputTokens += q.outputTokens || 0;
      totalResponseTime += q.processingTimeMs || 0;

      // Detect failures
      if (q.answerText && isFailedResponse(q.answerText)) {
        failedCount++;
        failedQueries.push({
          id: q.id,
          question: q.questionText,
          answer: q.answerText.substring(0, 200), // Truncate
          user: q.user?.email || 'Unknown',
          unit: q.model?.productLine.oem.name + ' ' + q.model?.modelNumber,
          timestamp: q.createdAt,
          confidence: q.confidenceScore,
        });
      }
    });

    const avgResponseTime = totalQuestions > 0 ? totalResponseTime / totalQuestions : 0;
    const successRate = totalQuestions > 0 ? ((totalQuestions - failedCount) / totalQuestions) * 100 : 0;

    // Cost calculations
    const INPUT_COST_PER_TOKEN = 0.150 / 1_000_000;
    const OUTPUT_COST_PER_TOKEN = 0.600 / 1_000_000;
    const totalCost = totalInputTokens * INPUT_COST_PER_TOKEN + totalOutputTokens * OUTPUT_COST_PER_TOKEN;

    // Questions over time (hourly if < 24h, daily otherwise)
    const useHourly = timeRange === '1h' || timeRange === '4h' || timeRange === '12h' || timeRange === '24h';
    const timeSeriesData = useHourly ? 
      await getHourlyQuestions(startDate) :
      await getDailyQuestions(startDate);

    res.json({
      metrics: {
        totalQuestions,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 10) / 10,
        failedCount,
      },
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      costs: {
        total: totalCost,
        perQuestion: totalQuestions > 0 ? totalCost / totalQuestions : 0,
      },
      sourceBreakdown: {
        manual: manualCount,
        generalKnowledge: totalQuestions - manualCount,
      },
      questionsOverTime: timeSeriesData,
      failedQueries: failedQueries.slice(0, 50), // Top 50 failures
    });
  } catch (error: any) {
    console.error('Chat analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch chat analytics' });
  }
}

/**
 * Helper: Get hourly question counts
 */
async function getHourlyQuestions(startDate: Date | null) {
  const since = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const data = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('hour', created_at) as hour,
      COUNT(*) as count
    FROM questions
    WHERE created_at >= ${since}
    GROUP BY hour
    ORDER BY hour ASC
  ` as Array<{ hour: Date; count: bigint }>;

  return data.map(row => ({
    time: row.hour,
    count: Number(row.count),
  }));
}

/**
 * Helper: Get daily question counts
 */
async function getDailyQuestions(startDate: Date | null) {
  const since = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const data = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM questions
    WHERE created_at >= ${since}
    GROUP BY date
    ORDER BY date ASC
  ` as Array<{ date: Date; count: bigint }>;

  return data.map(row => ({
    time: row.date,
    count: Number(row.count),
  }));
}

/**
 * GET /api/analytics/chat/requests
 * Get all chat requests with full details (paginated and filterable)
 */
export async function getAllChatRequests(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const userFilter = req.query.user as string;
    const statusFilter = req.query.status as string; // 'success' or 'failed'
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    const startDate = getTimeRangeFilter(timeRange);

    // Build where clause
    const whereClause: any = startDate ? { createdAt: { gte: startDate } } : {};
    
    if (userFilter) {
      whereClause.user = {
        email: { contains: userFilter, mode: 'insensitive' }
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.question.count({ where: whereClause });

    // Get questions
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true, name: true } },
        model: {
          include: {
            productLine: {
              include: { oem: true }
            }
          }
        }
      },
      orderBy: sortBy === 'cost' ? { estimatedCost: sortOrder as any } :
                sortBy === 'time' ? { processingTimeMs: sortOrder as any } :
                { createdAt: sortOrder as any },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    let requests = questions.map(q => ({
      id: q.id,
      timestamp: q.createdAt,
      user: q.user?.email || 'Unknown',
      userName: q.user?.name || 'Unknown',
      question: q.questionText,
      answerText: q.answerText,
      unit: q.model ? `${q.model.productLine.oem.name} ${q.model.modelNumber}` : 'Unknown',
      inputTokens: q.inputTokens || 0,
      outputTokens: q.outputTokens || 0,
      totalTokens: q.totalTokens || 0,
      cost: q.estimatedCost || 0,
      processingTime: q.processingTimeMs || 0,
      confidence: q.confidenceScore,
      isFailed: q.answerText ? isFailedResponse(q.answerText) : false,
    }));

    // Apply status filter
    if (statusFilter === 'failed') {
      requests = requests.filter(r => r.isFailed);
    } else if (statusFilter === 'success') {
      requests = requests.filter(r => !r.isFailed);
    }

    res.json({
      requests,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
}

/**
 * GET /api/analytics/users/:userId/requests
 * Get a specific user's requests
 */
export async function getUserRequests(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;

    const questions = await prisma.question.findMany({
      where: { userId },
      include: {
        user: { select: { email: true, name: true } },
        model: {
          include: {
            productLine: {
              include: { oem: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const requests = questions.map(q => ({
      id: q.id,
      timestamp: q.createdAt,
      question: q.questionText,
      answerText: q.answerText,
      unit: q.model ? `${q.model.productLine.oem.name} ${q.model.modelNumber}` : 'Unknown',
      inputTokens: q.inputTokens || 0,
      outputTokens: q.outputTokens || 0,
      totalTokens: q.totalTokens || 0,
      cost: q.estimatedCost || 0,
      processingTime: q.processingTimeMs || 0,
      confidence: q.confidenceScore,
      isFailed: q.answerText ? isFailedResponse(q.answerText) : false,
    }));

    res.json({ requests });
  } catch (error: any) {
    console.error('Get user requests error:', error);
    res.status(500).json({ error: 'Failed to fetch user requests' });
  }
}

/**
 * GET /api/analytics/discovery
 * Manual discovery and Perplexity usage metrics
 */
export async function getDiscoveryAnalytics(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const startDate = getTimeRangeFilter(timeRange);

    const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

    // Get search data from searches table
    const searches = await prisma.search.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const totalSearches = searches.length;
    const databaseHits = searches.filter(s => s.foundInDatabase).length;
    const perplexitySearches = searches.filter(s => s.usedPerplexity).length;
    const failedSearches = searches.filter(s => s.searchType === 'failed').length;
    const successfulSearches = searches.filter(s => s.manualsFound > 0).length;

    // Most searched models
    const modelCounts: Record<string, number> = {};
    searches.forEach(s => {
      const key = `${s.oemName} ${s.modelNumber}`;
      modelCounts[key] = (modelCounts[key] || 0) + 1;
    });

    const topModels = Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([model, count]) => ({ model, count }));

    // Average processing time
    const processingTimes = searches
      .map(s => s.processingTimeMs)
      .filter((t): t is number => t !== null && t > 0);

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    // Calculate rates
    const dbHitRate = totalSearches > 0 ? (databaseHits / totalSearches) * 100 : 0;
    const perplexityRate = totalSearches > 0 ? (perplexitySearches / totalSearches) * 100 : 0;
    const successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0;

    res.json({
      metrics: {
        totalSearches,
        dbHitRate: Math.round(dbHitRate * 10) / 10,
        perplexityRate: Math.round(perplexityRate * 10) / 10,
        successRate: Math.round(successRate * 10) / 10,
        avgProcessingTime: Math.round(avgProcessingTime / 1000), // seconds
      },
      sourceBreakdown: {
        database: databaseHits,
        perplexity: perplexitySearches,
        failed: failedSearches,
      },
      topModels,
      failedDiscoveries: searches
        .filter(s => s.searchType === 'failed')
        .slice(0, 20)
        .map(s => ({
          oem: s.oemName,
          model: s.modelNumber,
          reason: s.errorMessage || 'Unknown error',
          timestamp: s.createdAt,
        })),
    });
  } catch (error: any) {
    console.error('Discovery analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch discovery analytics' });
  }
}

/**
 * GET /api/analytics/users
 * Per-user activity and cost metrics
 */
export async function getUserAnalytics(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const startDate = getTimeRangeFilter(timeRange);

    const users = await prisma.user.findMany({
      include: {
        questions: {
          where: startDate ? { createdAt: { gte: startDate } } : {},
        },
        savedUnits: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const INPUT_COST_PER_TOKEN = 0.150 / 1_000_000;
    const OUTPUT_COST_PER_TOKEN = 0.600 / 1_000_000;

    const userStats = users.map(user => {
      const questionCount = user.questions.length;
      const unitCount = user.savedUnits.length;
      
      // Calculate actual cost from saved token data
      const totalCost = user.questions.reduce((sum, q) => sum + (q.estimatedCost || 0), 0);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        questionsAsked: questionCount,
        unitsSaved: unitCount,
        totalCost: Math.round(totalCost * 10000) / 10000, // 4 decimal places
        lastActive: user.lastActiveAt,
        signupDate: user.createdAt,
        role: user.role,
      };
    });

    // Sort by most active (questions asked)
    userStats.sort((a, b) => b.questionsAsked - a.questionsAsked);

    res.json({
      totalUsers: users.length,
      users: userStats,
    });
  } catch (error: any) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
}

/**
 * GET /api/analytics/failures
 * Detailed failure and error tracking
 */
export async function getFailureAnalytics(req: Request, res: Response) {
  try {
    const timeRange = req.query.timeRange as string || 'all';
    const startDate = getTimeRangeFilter(timeRange);

    const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

    // Failed chat responses
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true, name: true } },
        model: {
          include: {
            productLine: {
              include: { oem: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const failedChats: any[] = [];
    questions.forEach(q => {
      if (q.answerText && isFailedResponse(q.answerText)) {
        failedChats.push({
          id: q.id,
          timestamp: q.createdAt,
          user: q.user?.email || 'Unknown',
          userName: q.user?.name || 'Unknown',
          question: q.questionText,
          answer: q.answerText.substring(0, 300),
          confidence: q.confidenceScore,
          responseTime: q.processingTimeMs,
          processingTime: q.processingTimeMs,
          totalTokens: q.totalTokens || 0,
          cost: q.estimatedCost || 0,
          unit: q.model ? 
            `${q.model.productLine.oem.name} ${q.model.modelNumber}` : 
            'Unknown',
        });
      }
    });

    // Slow queries (>10 seconds)
    const slowQueries = questions
      .filter(q => (q.processingTimeMs || 0) > 10000)
      .slice(0, 50)
      .map(q => ({
        id: q.id,
        timestamp: q.createdAt,
        user: q.user?.email || 'Unknown',
        question: q.questionText.substring(0, 100),
        duration: q.processingTimeMs,
        processingTime: q.processingTimeMs,
        totalTokens: q.totalTokens || 0,
        cost: q.estimatedCost || 0,
        unit: q.model ? 
          `${q.model.productLine.oem.name} ${q.model.modelNumber}` : 
          'Unknown',
      }));

    // Failed discoveries (manuals that never became active)
    const failedManuals = await prisma.manual.findMany({
      where: {
        ...whereClause,
        status: { not: 'active' },
      },
      include: {
        model: {
          include: {
            productLine: {
              include: { oem: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const failedDiscoveries = failedManuals.map(m => ({
      timestamp: m.createdAt,
      oem: m.model.productLine.oem.name,
      model: m.model.modelNumber,
      error: m.status,
    }));

    res.json({
      summary: {
        failedChats: failedChats.length,
        failedDiscoveries: failedDiscoveries.length,
        slowQueries: slowQueries.length,
      },
      failedChats,
      failedDiscoveries,
      slowQueries,
    });
  } catch (error: any) {
    console.error('Failure analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch failure analytics' });
  }
}

/**
 * GET /api/analytics/chat/:id
 * Get detailed information for a specific chat request
 */
export async function getChatRequestDetails(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        model: {
          include: {
            productLine: {
              include: { oem: true }
            }
          }
        }
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Parse sources if they exist
    let sources = [];
    try {
      if (question.answerSources) {
        sources = JSON.parse(question.answerSources as string);
      }
    } catch (e) {
      console.warn('Failed to parse answer sources:', e);
    }

    // Check if this is a failed response
    const isFailed = question.answerText && isFailedResponse(question.answerText);

    res.json({
      id: question.id,
      timestamp: question.createdAt,
      user: question.user?.email || 'Unknown',
      userName: question.user?.name || 'Unknown',
      unit: question.model ? 
        `${question.model.productLine.oem.name} ${question.model.modelNumber}` : 
        'Unknown',
      question: question.questionText,
      answer: question.answerText,
      inputTokens: question.inputTokens || 0,
      outputTokens: question.outputTokens || 0,
      totalTokens: question.totalTokens || 0,
      cost: question.estimatedCost || 0,
      processingTime: question.processingTimeMs || 0,
      confidenceScore: question.confidenceScore,
      isFailed,
      sources,
    });
  } catch (error: any) {
    console.error('Chat request details error:', error);
    res.status(500).json({ error: 'Failed to fetch chat request details' });
  }
}
