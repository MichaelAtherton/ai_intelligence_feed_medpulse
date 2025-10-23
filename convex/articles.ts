import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get feed articles filtered by user's topics (USER ISOLATED)
export const getFeed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!prefs || !prefs.onboardingCompleted) return [];

    // Get completed articles for THIS USER ONLY using compound index
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user_status_published", (q) => 
        q.eq("userId", userId).eq("analysisStatus", "completed")
      )
      .order("desc")
      .take(args.limit ?? 100);

    // Batch fetch all bookmarks for this user
    const allBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Create a map for O(1) lookup
    const bookmarkMap = new Map(
      allBookmarks.map(b => [b.articleId, b])
    );

    // Add bookmark info to articles
    const articlesWithBookmarks = articles.map((article) => {
      const bookmark = bookmarkMap.get(article._id);
      return {
        ...article,
        isBookmarked: !!bookmark,
        bookmarkNotes: bookmark?.notes,
        bookmarkTags: bookmark?.userTags ?? [],
      };
    });

    return articlesWithBookmarks;
  },
});

// Search articles (USER ISOLATED)
export const searchArticles = query({
  args: {
    searchTerm: v.string(),
    sourceName: v.optional(v.string()),
    userTag: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let results;
    
    // If there's a search term (and it's not just "*"), use search index
    if (args.searchTerm && args.searchTerm !== "*") {
      results = await ctx.db
        .query("articles")
        .withSearchIndex("search_content", (q) => {
          let query = q.search("content", args.searchTerm)
            .eq("userId", userId) // USER ISOLATION
            .eq("analysisStatus", "completed");
          if (args.sourceName) {
            query = query.eq("sourceName", args.sourceName);
          }
          return query;
        })
        .take(50);
    } else {
      // Get completed articles for THIS USER ONLY
      results = await ctx.db
        .query("articles")
        .withIndex("by_user_status_published", (q) => 
          q.eq("userId", userId).eq("analysisStatus", "completed")
        )
        .order("desc")
        .take(100);
      
      // Filter by source if provided
      if (args.sourceName) {
        results = results.filter(article => article.sourceName === args.sourceName);
      }
    }

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      results = results.filter(article => {
        if (args.startDate && article.publishedAt < args.startDate) return false;
        if (args.endDate && article.publishedAt > args.endDate) return false;
        return true;
      });
    }

    // Batch fetch all bookmarks for this user
    const allBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const bookmarkMap = new Map(allBookmarks.map(b => [b.articleId, b]));

    // Add bookmark info to articles
    const articlesWithBookmarks = results.map((article) => {
      const bookmark = bookmarkMap.get(article._id);
      return {
        ...article,
        isBookmarked: !!bookmark,
        bookmarkNotes: bookmark?.notes,
        bookmarkTags: bookmark?.userTags ?? [],
      };
    });

    // Filter by user tag if provided
    if (args.userTag) {
      const tagToFilter = args.userTag;
      return articlesWithBookmarks.filter(article => 
        article.bookmarkTags.includes(tagToFilter)
      );
    }

    return articlesWithBookmarks;
  },
});

// Get bookmarked articles (USER ISOLATED)
export const getBookmarked = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const articles = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const article = await ctx.db.get(bookmark.articleId);
        // Verify article belongs to this user
        return article && article.userId === userId && article.analysisStatus === "completed" ? { 
          ...article, 
          isBookmarked: true,
          bookmarkNotes: bookmark.notes,
          bookmarkTags: bookmark.userTags,
        } : null;
      })
    );

    return articles.filter(a => a !== null);
  },
});

// Get all unique user tags (USER ISOLATED)
export const getUserTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const allTags = new Set<string>();
    bookmarks.forEach(bookmark => {
      if (bookmark.userTags) {
        bookmark.userTags.forEach(tag => allTags.add(tag));
      }
    });

    return Array.from(allTags).sort();
  },
});

// Toggle bookmark
export const toggleBookmark = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify article belongs to this user
    const article = await ctx.db.get(args.articleId);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or access denied");
    }

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_article", (q) => 
        q.eq("userId", userId).eq("articleId", args.articleId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    } else {
      await ctx.db.insert("bookmarks", {
        userId,
        articleId: args.articleId,
        bookmarkedAt: Date.now(),
        userTags: [],
      });
      return { bookmarked: true };
    }
  },
});

// Delete article (USER ISOLATED)
export const deleteArticle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify article belongs to this user
    const article = await ctx.db.get(args.articleId);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or access denied");
    }

    // Delete the article
    await ctx.db.delete(args.articleId);

    // Delete associated bookmark if exists
    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_article", (q) => 
        q.eq("userId", userId).eq("articleId", args.articleId)
      )
      .first();
    
    if (bookmark) {
      await ctx.db.delete(bookmark._id);
    }

    // Delete associated embedding if exists
    const embedding = await ctx.db
      .query("embeddings")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .first();
    
    if (embedding) {
      await ctx.db.delete(embedding._id);
    }

    return { success: true };
  },
});

// Update bookmark notes and tags
export const updateBookmark = mutation({
  args: {
    articleId: v.id("articles"),
    notes: v.optional(v.string()),
    userTags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify article belongs to this user
    const article = await ctx.db.get(args.articleId);
    if (!article || article.userId !== userId) {
      throw new Error("Article not found or access denied");
    }

    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_article", (q) => 
        q.eq("userId", userId).eq("articleId", args.articleId)
      )
      .first();

    if (!bookmark) {
      // Create bookmark if it doesn't exist
      await ctx.db.insert("bookmarks", {
        userId,
        articleId: args.articleId,
        bookmarkedAt: Date.now(),
        notes: args.notes,
        userTags: args.userTags,
      });
    } else {
      // Update existing bookmark
      await ctx.db.patch(bookmark._id, {
        notes: args.notes,
        userTags: args.userTags,
      });
    }

    return null;
  },
});

// Add article (for scraping pipeline) - REQUIRES userId
export const addArticle = internalMutation({
  args: {
    userId: v.id("users"), // REQUIRED: Must specify which user this article belongs to
    title: v.string(),
    sourceUrl: v.string(),
    sourceName: v.string(),
    articleUrl: v.string(),
    summary: v.string(),
    tags: v.array(v.string()),
    content: v.string(),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if article already exists for THIS USER using index
    const existing = await ctx.db
      .query("articles")
      .withIndex("by_user_and_url", (q) => 
        q.eq("userId", args.userId).eq("articleUrl", args.articleUrl)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    const articleId = await ctx.db.insert("articles", {
      userId: args.userId, // USER ISOLATION
      title: args.title,
      sourceUrl: args.sourceUrl,
      sourceName: args.sourceName,
      articleUrl: args.articleUrl,
      summary: args.summary,
      tags: args.tags,
      content: args.content,
      publishedAt: args.publishedAt,
      scrapedAt: Date.now(),
      analysisStatus: "pending",
    });

    return articleId;
  },
});

// Internal queries and mutations for scraping/analysis
export const getArticleById = internalQuery({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.articleId);
  },
});

export const getPendingAnalysis = internalQuery({
  args: { 
    userId: v.id("users"), // USER ISOLATION
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", args.userId).eq("analysisStatus", "pending")
      )
      .take(args.limit ?? 10);
  },
});

export const updateAnalysisStatus = internalMutation({
  args: {
    articleId: v.id("articles"),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.articleId, {
      analysisStatus: args.status,
    });
  },
});

export const updateArticleAnalysis = internalMutation({
  args: {
    articleId: v.id("articles"),
    content: v.string(),
    industry: v.optional(v.string()),
    department: v.optional(v.string()),
    aiTechnology: v.optional(v.array(v.string())),
    businessImpact: v.optional(v.string()),
    technicalDetails: v.optional(v.string()),
    keyInsights: v.optional(v.array(v.string())),
    summary: v.string(),
    tags: v.array(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const { articleId, status, ...updates } = args;
    
    await ctx.db.patch(articleId, {
      ...updates,
      analysisStatus: status,
    });
  },
});

// Store embedding for an article
export const storeEmbedding = internalMutation({
  args: {
    articleId: v.id("articles"),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("embeddings")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        createdAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("embeddings", {
        articleId: args.articleId,
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        createdAt: Date.now(),
      });
    }
  },
});

export const getArticleWithEmbedding = internalQuery({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return null;
    
    const embedding = await ctx.db
      .query("embeddings")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .first();
    
    return {
      ...article,
      embedding: embedding?.embedding,
      embeddingModel: embedding?.embeddingModel,
    };
  },
});

// Get completed articles without embeddings (USER ISOLATED)
export const getArticlesWithoutEmbeddings = internalQuery({
  args: { 
    userId: v.id("users"), // USER ISOLATION
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user_status_published", (q) => 
        q.eq("userId", args.userId).eq("analysisStatus", "completed")
      )
      .order("desc")
      .take(args.limit ?? 50);
    
    const result = [];
    for (const article of articles) {
      const embedding = await ctx.db
        .query("embeddings")
        .withIndex("by_article", (q) => q.eq("articleId", article._id))
        .first();
      
      if (!embedding) result.push(article);
    }
    
    return result;
  },
});

// Fix articles without analysis status (USER ISOLATED)
export const fixArticlesWithoutStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const allArticles = await ctx.db
      .query("articles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const articlesWithoutStatus = allArticles.filter(a => !a.analysisStatus);
    
    for (const article of articlesWithoutStatus) {
      await ctx.db.patch(article._id, {
        analysisStatus: "pending",
      });
    }

    return {
      fixed: articlesWithoutStatus.length,
      message: `Fixed ${articlesWithoutStatus.length} articles`,
    };
  },
});

// Get article statistics for debugging (USER ISOLATED)
export const getArticleStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Use indexes for efficient counting
    const [pending, analyzing, completed, failed, allArticles] = await Promise.all([
      ctx.db.query("articles").withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("analysisStatus", "pending")).collect(),
      ctx.db.query("articles").withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("analysisStatus", "analyzing")).collect(),
      ctx.db.query("articles").withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("analysisStatus", "completed")).collect(),
      ctx.db.query("articles").withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("analysisStatus", "failed")).collect(),
      ctx.db.query("articles").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);
    
    const noStatus = allArticles.filter(a => !a.analysisStatus);

    return {
      total: allArticles.length,
      pending: pending.length,
      analyzing: analyzing.length,
      completed: completed.length,
      failed: failed.length,
      noStatus: noStatus.length,
    };
  },
});

// Debug query to see feed filtering (USER ISOLATED)
export const debugFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const allArticles = await ctx.db
      .query("articles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const completed = allArticles.filter(a => a.analysisStatus === "completed");

    return {
      onboardingCompleted: prefs?.onboardingCompleted ?? false,
      selectedTopics: prefs?.selectedTopics ?? [],
      customTopics: prefs?.customTopics ?? [],
      totalArticles: allArticles.length,
      completedArticles: completed.length,
      completedArticleTags: completed.map(a => ({ title: a.title, tags: a.tags })),
    };
  },
});
