import { v } from "convex/values";
import { action, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get embedding statistics (USER ISOLATED)
export const getEmbeddingStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { totalEmbeddings: 0, model: "text-embedding-3-small", dimensions: 384 };
    }

    const userArticles = await ctx.db
      .query("articles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const articleIds = new Set(userArticles.map(a => a._id));
    const embeddings = await ctx.db.query("embeddings").collect();
    const userEmbeddings = embeddings.filter(e => articleIds.has(e.articleId));
    
    if (userEmbeddings.length === 0) {
      return { totalEmbeddings: 0, model: "text-embedding-3-small", dimensions: 384 };
    }

    return {
      totalEmbeddings: userEmbeddings.length,
      model: userEmbeddings[0].embeddingModel,
      dimensions: userEmbeddings[0].embedding.length,
    };
  },
});

// Semantic search using vector similarity
export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<any>> => {
    // Get user's API key
    const userId = await getAuthUserId(ctx);
    const userApiKey = userId ? await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
      userId,
      provider: "openai",
    }) : null;
    
    // Generate embedding for the query
    const queryEmbedding: { embedding: Array<number>; model: string } = await ctx.runAction(
      internal.storageAction.generateQueryEmbedding,
      { query: args.query, apiKey: userApiKey || undefined }
    );

    // Search for similar articles using vector search
    const results: Array<any> = await ctx.vectorSearch("embeddings", "by_embedding", {
      vector: queryEmbedding.embedding,
      limit: args.limit ?? 10,
    });

    // Get article details for each result and filter by userId
    const articles: Array<any> = await Promise.all(
      results.map(async (result: any) => {
        const embedding = await ctx.runQuery(internal.semanticSearch.getEmbeddingById, {
          embeddingId: result._id,
        });
        
        if (!embedding) return null;

        const article = await ctx.runQuery(internal.articles.getArticleById, {
          articleId: embedding.articleId,
        });

        // USER ISOLATION: Only return articles that belong to the current user
        if (!article || article.userId !== userId) return null;

        return {
          ...article,
          score: result._score,
        };
      })
    );

    return articles.filter((a: any) => a !== null);
  },
});

// Internal query to get embedding by ID
export const getEmbeddingById = internalQuery({
  args: { embeddingId: v.id("embeddings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.embeddingId);
  },
});
