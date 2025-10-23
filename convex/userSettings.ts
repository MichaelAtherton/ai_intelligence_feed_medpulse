import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user settings
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return settings || {
      preferredProvider: "convex" as const,
      theme: "light" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
});

// Update preferred provider
export const updatePreferredProvider = mutation({
  args: {
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("convex")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferredProvider: args.provider,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        preferredProvider: args.provider,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Update theme
export const updateTheme = mutation({
  args: { theme: v.union(v.literal("light"), v.literal("dark")) },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        theme: args.theme,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        preferredProvider: "convex",
        theme: args.theme,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Update model configuration
export const updateModelConfiguration = mutation({
  args: {
    discovery: v.string(),
    analysis: v.string(),
    dailySummary: v.string(),
    trendAnalysis: v.string(),
    chat: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const models = {
      discovery: args.discovery,
      analysis: args.analysis,
      dailySummary: args.dailySummary,
      trendAnalysis: args.trendAnalysis,
      chat: args.chat,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        models,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        preferredProvider: "convex",
        models,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get user model configuration
export const getUserModelConfig = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    discovery: v.string(),
    analysis: v.string(),
    dailySummary: v.string(),
    trendAnalysis: v.string(),
    chat: v.string(),
  }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return {
      discovery: settings?.models?.discovery || "gpt-4o-mini",
      analysis: settings?.models?.analysis || "gpt-4.1-nano",
      dailySummary: settings?.models?.dailySummary || "gpt-4o-mini",
      trendAnalysis: settings?.models?.trendAnalysis || "gpt-4o-mini",
      chat: settings?.models?.chat || "gpt-4o-mini",
    };
  },
});
