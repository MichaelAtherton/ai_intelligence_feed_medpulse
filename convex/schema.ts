import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User preferences and onboarding data
  userPreferences: defineTable({
    userId: v.id("users"),
    selectedTopics: v.array(v.string()),
    customTopics: v.array(v.string()),
    customSources: v.array(v.object({
      url: v.string(),
      name: v.string(),
      status: v.union(v.literal("active"), v.literal("muted"), v.literal("failed")),
      failureReason: v.optional(v.string()),
    })),
    onboardingCompleted: v.boolean(),
  }).index("by_user", ["userId"]),

  // User API keys (encrypted)
  userApiKeys: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    encryptedKey: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_provider", ["userId", "provider"]),

  // User settings
  userSettings: defineTable({
    userId: v.id("users"),
    preferredProvider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("convex")),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    models: v.optional(v.object({
      discovery: v.string(),
      analysis: v.string(),
      dailySummary: v.string(),
      trendAnalysis: v.string(),
      chat: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Articles - USER ISOLATED (each user has their own articles from their sources)
  articles: defineTable({
    userId: v.optional(v.id("users")), // Optional for backwards compatibility, but should always be set for new articles
    title: v.string(),
    sourceUrl: v.string(),
    sourceName: v.string(),
    articleUrl: v.string(),
    summary: v.string(),
    tags: v.array(v.string()),
    content: v.string(),
    publishedAt: v.number(),
    scrapedAt: v.number(),
    // Analysis fields
    industry: v.optional(v.string()),
    department: v.optional(v.string()),
    aiTechnology: v.optional(v.array(v.string())),
    businessImpact: v.optional(v.string()),
    technicalDetails: v.optional(v.string()),
    keyInsights: v.optional(v.array(v.string())),
    analysisStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    )),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "analysisStatus"])
    .index("by_user_status_published", ["userId", "analysisStatus", "publishedAt"])
    .index("by_user_and_url", ["userId", "articleUrl"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "sourceName", "analysisStatus"],
    }),

  // User bookmarks with notes and custom tags
  bookmarks: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    bookmarkedAt: v.number(),
    notes: v.optional(v.string()),
    userTags: v.optional(v.array(v.string())),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_article", ["userId", "articleId"]),

  // Discovery agent state tracking
  discoveryState: defineTable({
    userId: v.id("users"),
    lastCheck: v.number(),
  }).index("by_user", ["userId"]),

  seenUrls: defineTable({
    userId: v.id("users"),
    url: v.string(),
    firstSeen: v.number(),
  }).index("by_user_url", ["userId", "url"]),

  discoveryRuns: defineTable({
    userId: v.id("users"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    sourcesChecked: v.number(),
    itemsFound: v.number(),
    itemsQueued: v.number(),
    itemsScraped: v.optional(v.number()),
    itemsAnalyzed: v.optional(v.number()),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    error: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Vector embeddings for semantic search
  embeddings: defineTable({
    articleId: v.id("articles"),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    createdAt: v.number(),
  })
    .index("by_article", ["articleId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["articleId"],
    }),

  // Daily summaries
  dailySummaries: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD format
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
    generatedAt: v.number(),
  })
    .index("by_user_and_date", ["userId", "date"]),

  // Trend analyses
  trendAnalyses: defineTable({
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
    generatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Chat conversations
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    messageCount: v.number(),
  }).index("by_user", ["userId"]),

  // Chat messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
    // Optional: reference to articles mentioned in the message
    referencedArticleIds: v.optional(v.array(v.id("articles"))),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_created", ["conversationId", "createdAt"]),

  // Activity feed events (in-memory style, auto-expire)
  activityEvents: defineTable({
    userId: v.id("users"),
    runId: v.id("discoveryRuns"),
    timestamp: v.number(),
    stage: v.string(),
    eventType: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_run", ["runId"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
