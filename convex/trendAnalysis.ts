import { v } from "convex/values";
import { action, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Public action wrapper
export const generateTrendAnalysis = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(internal.trendAnalysisAction.generateTrendAnalysis, {
      userId,
    });
  },
});

// Get most recent trend analysis
export const getLatestTrendAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const analysis = await ctx.db
      .query("trendAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!analysis) return null;

    // Enrich with article details
    const enrichedTrends = await Promise.all(
      analysis.trends.map(async (trend) => {
        const articles = await Promise.all(
          trend.supportingArticleIds.map(async (articleId) => {
            const article = await ctx.db.get(articleId);
            return article;
          })
        );

        return {
          ...trend,
          supportingArticles: articles.filter((a) => a !== null),
        };
      })
    );

    return {
      ...analysis,
      trends: enrichedTrends,
    };
  },
});

// Internal queries and mutations
export const getRecentArticlesForTrends = internalQuery({
  args: {
    userId: v.id("users"),
    weeksBack: v.number(),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!prefs || !prefs.onboardingCompleted) return [];

    const allTopics = [...prefs.selectedTopics, ...prefs.customTopics];
    
    // Get articles from specified weeks back for THIS USER
    const cutoffTime = Date.now() - args.weeksBack * 7 * 24 * 60 * 60 * 1000;
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user_status_published", (q) => 
        q.eq("userId", args.userId).eq("analysisStatus", "completed")
      )
      .order("desc")
      .filter((q) => q.gte(q.field("publishedAt"), cutoffTime))
      .take(200);

    // Filter by user's topics (show all if no topics selected)
    const filtered = allTopics.length === 0 
      ? articles 
      : articles.filter(article => 
          article.tags.some(tag => 
            allTopics.some(topic => 
              tag.toLowerCase().includes(topic.toLowerCase()) ||
              topic.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );

    return filtered;
  },
});

export const storeTrendAnalysis = internalMutation({
  args: {
    userId: v.id("users"),
    trends: v.array(v.object({
      title: v.string(),
      description: v.string(),
      projection: v.string(),
      confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
      supportingArticleIds: v.array(v.id("articles")),
      keyDevelopments: v.array(v.string()),
      inflectionPoints: v.array(v.object({
        articleId: v.id("articles"),
        reason: v.string(),
      })),
    })),
    analysisStartDate: v.number(),
    analysisEndDate: v.number(),
    totalArticlesAnalyzed: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trendAnalyses", {
      userId: args.userId,
      trends: args.trends,
      analysisStartDate: args.analysisStartDate,
      analysisEndDate: args.analysisEndDate,
      totalArticlesAnalyzed: args.totalArticlesAnalyzed,
      generatedAt: Date.now(),
    });
  },
});

export const getTrendAnalysisById = internalQuery({
  args: {
    analysisId: v.id("trendAnalyses"),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) return null;

    // Enrich with article details
    const enrichedTrends = await Promise.all(
      analysis.trends.map(async (trend) => {
        const articles = await Promise.all(
          trend.supportingArticleIds.map(async (articleId) => {
            const article = await ctx.db.get(articleId);
            return article;
          })
        );

        return {
          ...trend,
          supportingArticles: articles.filter((a) => a !== null),
        };
      })
    );

    return {
      ...analysis,
      trends: enrichedTrends,
    };
  },
});
