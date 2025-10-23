import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Public action wrapper
export const generateDailySummary = action({
  args: {
    timeRange: v.optional(v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("2w"),
      v.literal("1m"),
      v.literal("6m"),
      v.literal("1y")
    )),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(internal.dailySummaryAction.generateDailySummary, {
      userId,
      timeRange: args.timeRange || "24h",
    });
  },
});

// Get today's summary if it exists
export const getTodaysSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split('T')[0];

    const summary = await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    if (!summary) return null;

    // Enrich with article details
    const enrichedThemes = await Promise.all(
      summary.themes.map(async (theme) => {
        const articles = await Promise.all(
          theme.articleIds.map(async (articleId) => {
            const article = await ctx.db.get(articleId);
            return article;
          })
        );

        return {
          ...theme,
          articles: articles.filter((a) => a !== null),
        };
      })
    );

    return {
      ...summary,
      themes: enrichedThemes,
    };
  },
});

// Internal queries and mutations
export const getUserId = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const getSummaryByDate = internalQuery({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (!summary) return null;

    // Enrich with article details
    const enrichedThemes = await Promise.all(
      summary.themes.map(async (theme) => {
        const articles = await Promise.all(
          theme.articleIds.map(async (articleId) => {
            const article = await ctx.db.get(articleId);
            return article;
          })
        );

        return {
          ...theme,
          articles: articles.filter((a) => a !== null),
        };
      })
    );

    return {
      ...summary,
      themes: enrichedThemes,
    };
  },
});

export const getSummaryById = internalQuery({
  args: {
    summaryId: v.id("dailySummaries"),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) return null;

    // Enrich with article details
    const enrichedThemes = await Promise.all(
      summary.themes.map(async (theme) => {
        const articles = await Promise.all(
          theme.articleIds.map(async (articleId) => {
            const article = await ctx.db.get(articleId);
            return article;
          })
        );

        return {
          ...theme,
          articles: articles.filter((a) => a !== null),
        };
      })
    );

    return {
      ...summary,
      themes: enrichedThemes,
    };
  },
});

export const getRecentFeedArticles = internalQuery({
  args: {
    userId: v.id("users"),
    timeRange: v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("2w"),
      v.literal("1m"),
      v.literal("6m"),
      v.literal("1y")
    ),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!prefs || !prefs.onboardingCompleted) return [];

    const allTopics = [...prefs.selectedTopics, ...prefs.customTopics];
    
    // Calculate time range in milliseconds
    const timeRangeMs: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "2w": 14 * 24 * 60 * 60 * 1000,
      "1m": 30 * 24 * 60 * 60 * 1000,
      "6m": 180 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
    };
    const cutoffTime = Date.now() - timeRangeMs[args.timeRange];
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user_status_published", (q) => 
        q.eq("userId", args.userId).eq("analysisStatus", "completed")
      )
      .order("desc")
      .filter((q) => q.gte(q.field("publishedAt"), cutoffTime))
      .take(100);

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

export const storeSummary = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    themes: v.array(v.object({
      title: v.string(),
      description: v.string(),
      articleIds: v.array(v.id("articles")),
      articleSummaries: v.array(v.object({
        articleId: v.id("articles"),
        oneLiner: v.string(),
      })),
    })),
    totalArticles: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dailySummaries", {
      userId: args.userId,
      date: args.date,
      themes: args.themes,
      totalArticles: args.totalArticles,
      generatedAt: Date.now(),
    });
  },
});

export const deleteSummary = mutation({
  args: { summaryId: v.id("dailySummaries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const summary = await ctx.db.get(args.summaryId);
    if (!summary || summary.userId !== userId) {
      throw new Error("Summary not found or access denied");
    }

    await ctx.db.delete(args.summaryId);
    return { success: true };
  },
});
