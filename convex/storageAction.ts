"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import OpenAI from "openai";

async function generateEmbedding(text: string, apiKey?: string): Promise<Array<number>> {
  const openai = new OpenAI({
    baseURL: apiKey ? undefined : process.env.CONVEX_OPENAI_BASE_URL,
    apiKey: apiKey || process.env.CONVEX_OPENAI_API_KEY,
  });
  
  // Truncate text if too long (model has token limits - ~8k tokens)
  const truncatedText = text.length > 30000 ? text.slice(0, 30000) : text;
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncatedText,
      dimensions: 384, // Reduced dimensions for efficiency
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw error;
  }
}

export const generateAndStoreEmbedding = internalAction({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    console.log(`🔢 Generating embedding for article ${args.articleId}`);

    // Get article content
    const article = await ctx.runQuery(internal.articles.getArticleById, {
      articleId: args.articleId,
    });

    if (!article) {
      throw new Error("Article not found");
    }

    if (!article.userId) {
      throw new Error("Article missing userId");
    }

    // Get user's API key (article now has userId)
    const userApiKey = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
      userId: article.userId, // Use article's userId
      provider: "openai",
    });

    try {
      // Prepare text for embedding (combine title, summary, and key content)
      const textToEmbed = `${article.title}\n\n${article.summary}\n\n${
        article.keyInsights?.join("\n") || ""
      }`;

      // Truncate if too long (model has token limits)
      const truncatedText =
        textToEmbed.length > 5000
          ? textToEmbed.slice(0, 5000)
          : textToEmbed;

      // Generate embedding
      const embedding: Array<number> = await generateEmbedding(truncatedText, userApiKey || undefined);

      console.log(`  ✓ Generated embedding with ${embedding.length} dimensions`);

      // Store embedding in database
      await ctx.runMutation(internal.articles.storeEmbedding, {
        articleId: args.articleId,
        embedding,
        embeddingModel: "text-embedding-3-small",
      });

      console.log(`  ✓ Embedding stored successfully`);

      return {
        success: true,
        dimensions: embedding.length,
        model: "text-embedding-3-small",
      };
    } catch (error) {
      console.error(`  ❌ Failed to generate embedding:`, error);
      throw error;
    }
  },
});

// Generate embedding for a search query
export const generateQueryEmbedding = internalAction({
  args: {
    query: v.string(),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const embedding: Array<number> = await generateEmbedding(args.query, args.apiKey);

      return {
        embedding,
        model: "text-embedding-3-small",
      };
    } catch (error) {
      console.error("Failed to generate query embedding:", error);
      throw error;
    }
  },
});

// Batch generate embeddings for multiple articles (USER ISOLATED)
export const batchGenerateEmbeddings = internalAction({
  args: {
    userId: v.id("users"), // USER ISOLATION
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ total: number; success: number; failed: number }> => {
    console.log(`🚀 Starting batch embedding generation for user ${args.userId}`);

    // Get completed articles without embeddings for THIS USER ONLY
    const completedArticles: Array<any> = await ctx.runQuery(
      internal.articles.getArticlesWithoutEmbeddings,
      { userId: args.userId, limit: args.limit ?? 20 } // USER ISOLATION
    );

    console.log(`📊 Found ${completedArticles.length} articles to embed for user ${args.userId}`);

    // Process embeddings with concurrency limit of 5
    const CONCURRENCY = 5;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < completedArticles.length; i += CONCURRENCY) {
      const batch = completedArticles.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(async (article) => {
        const existing = await ctx.runQuery(
          internal.articles.getArticleWithEmbedding,
          { articleId: article._id }
        );

        if (existing?.embedding) {
          console.log(`  ⏭️  Skipping ${article._id} (already has embedding)`);
          return { skipped: true };
        }

        await ctx.runAction(internal.storageAction.generateAndStoreEmbedding, {
          articleId: article._id,
        });
        return { skipped: false };
      }));
      
      for (const result of results) {
        if (result.status === "fulfilled" && !result.value.skipped) {
          successCount++;
        } else if (result.status === "rejected") {
          failCount++;
        }
      }
    }

    console.log(
      `✅ Batch complete for user ${args.userId}: ${successCount} success, ${failCount} failed`
    );

    return {
      total: completedArticles.length,
      success: successCount,
      failed: failCount,
    };
  },
});
