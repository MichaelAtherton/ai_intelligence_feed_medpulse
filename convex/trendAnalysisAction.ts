"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

// Generate trend analysis for user's feed
export const generateTrendAnalysis = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get articles from past 2-4 weeks (using 3 weeks as default)
    const weeksBack = 3;
    const articles: Array<any> = await ctx.runQuery(internal.trendAnalysis.getRecentArticlesForTrends, {
      userId: args.userId,
      weeksBack,
    });

    if (articles.length < 5) {
      throw new Error("Not enough articles to analyze trends (minimum 5 required)");
    }

    // Get user's model configuration
    const modelConfig = await ctx.runQuery(internal.userSettings.getUserModelConfig, {
      userId: args.userId,
    });

    // Generate trend analysis using AI
    const openai = new OpenAI({
      baseURL: process.env.CONVEX_OPENAI_BASE_URL,
      apiKey: process.env.CONVEX_OPENAI_API_KEY,
    });

    // Prepare article data for AI
    const articleData = articles.map((a: any, idx: number) => ({
      id: idx,
      title: a.title,
      summary: a.summary,
      tags: a.tags,
      source: a.sourceName,
      publishedAt: new Date(a.publishedAt).toISOString().split('T')[0],
      aiTechnology: a.aiTechnology || [],
      keyInsights: a.keyInsights || [],
    }));

    const prompt = `Analyze these ${articles.length} AI healthcare articles from the past ${weeksBack} weeks and identify directional technology trends.

Articles (chronologically ordered):
${JSON.stringify(articleData, null, 2)}

Your task is to identify 3-5 major directional trends in AI technology capabilities. Focus on:
- Technology capability trends (AI models, tools, platforms, applications)
- Progressive developments that show directional movement
- Patterns across multiple articles that indicate "stepping stones" to future capabilities
- Recent major announcements that could be inflection points

DO NOT predict:
- Medical research outcomes or clinical efficacy
- Specific product launches or company strategies
- Market dynamics or competitive positioning

For each trend, provide:
1. A clear, descriptive title (4-8 words)
2. A 2-3 sentence description of the pattern you're observing
3. A 2-3 sentence projection of where this trend is likely heading (use language like "likely", "suggests", "indicates direction toward")
4. Confidence level: "high" (5+ supporting articles, clear pattern), "medium" (3-4 articles, emerging pattern), or "low" (2-3 articles, early signal)
5. List of article IDs that support this trend
6. 3-5 key developments that define this trend
7. Inflection points: articles that represent significant shifts or "stepping stones" (with brief reason why)

Return ONLY valid JSON in this exact format:
{
  "trends": [
    {
      "title": "Trend Title",
      "description": "2-3 sentence description of the observed pattern",
      "projection": "2-3 sentence projection of likely direction (use cautious language)",
      "confidence": "high" | "medium" | "low",
      "supportingArticleIds": [0, 1, 2],
      "keyDevelopments": [
        "Development 1",
        "Development 2",
        "Development 3"
      ],
      "inflectionPoints": [
        {
          "articleId": 0,
          "reason": "Brief explanation of why this is a potential inflection point"
        }
      ]
    }
  ]
}

Focus on non-obvious connections that busy professionals wouldn't easily make themselves. Look for:
- Multiple articles building on similar capabilities
- Technology progressions (e.g., from research → prototype → production)
- Cross-domain applications of similar AI techniques
- Recurring themes across different sources
- Recent announcements that suggest new directions`;

    try {
      const response = await openai.chat.completions.create({
        model: modelConfig.trendAnalysis,
        messages: [
          {
            role: "system",
            content: "You are an AI technology analyst specializing in healthcare AI trends. You identify directional patterns in technology capabilities and project likely future developments based on recent announcements. You are careful to distinguish between technology capability trends and medical outcome predictions. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in response");
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const result = JSON.parse(jsonMatch[0]);

      // Map article indices back to actual article IDs
      const trends = result.trends.map((trend: any) => ({
        title: trend.title,
        description: trend.description,
        projection: trend.projection,
        confidence: trend.confidence,
        supportingArticleIds: trend.supportingArticleIds.map((idx: number) => articles[idx]._id),
        keyDevelopments: trend.keyDevelopments,
        inflectionPoints: trend.inflectionPoints.map((ip: any) => ({
          articleId: articles[ip.articleId]._id,
          reason: ip.reason,
        })),
      }));

      // Calculate date range
      const sortedArticles = [...articles].sort((a, b) => a.publishedAt - b.publishedAt);
      const analysisStartDate = sortedArticles[0].publishedAt;
      const analysisEndDate = sortedArticles[sortedArticles.length - 1].publishedAt;

      // Store analysis in database
      const analysisId: Id<"trendAnalyses"> = await ctx.runMutation(internal.trendAnalysis.storeTrendAnalysis, {
        userId: args.userId,
        trends,
        analysisStartDate,
        analysisEndDate,
        totalArticlesAnalyzed: articles.length,
      });

      // Return the stored analysis
      return await ctx.runQuery(internal.trendAnalysis.getTrendAnalysisById, {
        analysisId,
      });
    } catch (error) {
      console.error("Failed to generate trend analysis:", error);
      throw new Error("Failed to generate trend analysis");
    }
  },
});
