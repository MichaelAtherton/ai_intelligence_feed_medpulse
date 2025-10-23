import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Clear all articles (admin only - for testing)
export const clearAllArticles = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all articles
    const articles = await ctx.db.query("articles").collect();
    
    // Delete all articles
    for (const article of articles) {
      await ctx.db.delete(article._id);
    }

    // Also clear embeddings
    const embeddings = await ctx.db.query("embeddings").collect();
    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }

    // Clear discovery runs
    const runs = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const run of runs) {
      await ctx.db.delete(run._id);
    }

    // Clear seen URLs
    const seenUrls = await ctx.db
      .query("seenUrls")
      .withIndex("by_user_url", (q) => q.eq("userId", userId))
      .collect();
    for (const url of seenUrls) {
      await ctx.db.delete(url._id);
    }

    return { 
      success: true, 
      articlesDeleted: articles.length,
      embeddingsDeleted: embeddings.length,
    };
  },
});

// Delete articles without userId (cleanup old data)
export const deleteArticlesWithoutUserId = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const allArticles = await ctx.db.query("articles").collect();
    const articlesWithoutUserId = allArticles.filter(a => !a.userId);
    
    for (const article of articlesWithoutUserId) {
      await ctx.db.delete(article._id);
    }

    // Also delete embeddings for these articles
    const allEmbeddings = await ctx.db.query("embeddings").collect();
    const embeddingsToDelete = allEmbeddings.filter(e => 
      articlesWithoutUserId.some(a => a._id === e.articleId)
    );
    
    for (const embedding of embeddingsToDelete) {
      await ctx.db.delete(embedding._id);
    }

    return { 
      success: true, 
      articlesDeleted: articlesWithoutUserId.length,
      embeddingsDeleted: embeddingsToDelete.length,
    };
  },
});

// Clear user's bookmarks
export const clearAllBookmarks = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    return { success: true, bookmarksDeleted: bookmarks.length };
  },
});

// Clear user's summaries
export const clearAllSummaries = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const summaries = await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();

    for (const summary of summaries) {
      await ctx.db.delete(summary._id);
    }

    return { success: true, summariesDeleted: summaries.length };
  },
});

// Clear user's trend analyses
export const clearAllTrends = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trends = await ctx.db
      .query("trendAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const trend of trends) {
      await ctx.db.delete(trend._id);
    }

    return { success: true, trendsDeleted: trends.length };
  },
});

// Reset discovery state
export const resetDiscoveryState = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Clear discovery state
    const state = await ctx.db
      .query("discoveryState")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (state) {
      await ctx.db.delete(state._id);
    }

    // Clear seen URLs
    const seenUrls = await ctx.db
      .query("seenUrls")
      .withIndex("by_user_url", (q) => q.eq("userId", userId))
      .collect();
    
    for (const url of seenUrls) {
      await ctx.db.delete(url._id);
    }

    // Clear discovery runs
    const runs = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    for (const run of runs) {
      await ctx.db.delete(run._id);
    }

    return { 
      success: true, 
      urlsCleared: seenUrls.length,
      runsCleared: runs.length,
    };
  },
});

// Clear all sources
export const clearAllSources = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Clear custom sources from user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (prefs && prefs.customSources.length > 0) {
      await ctx.db.patch(prefs._id, {
        customSources: [],
      });
    }

    return { 
      success: true, 
      sourcesDeleted: prefs?.customSources.length ?? 0,
    };
  },
});

// Get data statistics
export const getDataStats = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const articles = await ctx.db.query("articles").collect();
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const summaries = await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();
    const trends = await ctx.db
      .query("trendAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const runs = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      articles: articles.length,
      bookmarks: bookmarks.length,
      summaries: summaries.length,
      trends: trends.length,
      discoveryRuns: runs.length,
      sources: prefs?.customSources.length ?? 0,
    };
  },
});
