import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get or create user preferences
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return prefs;
  },
});

// Save onboarding preferences
export const saveOnboarding = mutation({
  args: {
    selectedTopics: v.array(v.string()),
    customTopics: v.array(v.string()),
    customSources: v.array(v.object({
      url: v.string(),
      name: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const sources = args.customSources.map(s => ({
      ...s,
      status: "active" as const,
    }));

    if (existing) {
      await ctx.db.patch(existing._id, {
        selectedTopics: args.selectedTopics,
        customTopics: args.customTopics,
        customSources: sources,
        onboardingCompleted: true,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        selectedTopics: args.selectedTopics,
        customTopics: args.customTopics,
        customSources: sources,
        onboardingCompleted: true,
      });
    }

    return null;
  },
});

// Update preferences (for Preferences page)
export const updatePreferences = mutation({
  args: {
    selectedTopics: v.array(v.string()),
    customTopics: v.array(v.string()),
    customSources: v.array(v.object({
      url: v.string(),
      name: v.string(),
      status: v.union(v.literal("active"), v.literal("muted"), v.literal("failed")),
      failureReason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!prefs) throw new Error("Preferences not found");

    await ctx.db.patch(prefs._id, {
      selectedTopics: args.selectedTopics,
      customTopics: args.customTopics,
      customSources: args.customSources,
    });

    return null;
  },
});

// Update custom sources
export const updateCustomSources = mutation({
  args: {
    sources: v.array(v.object({
      url: v.string(),
      name: v.string(),
      status: v.union(v.literal("active"), v.literal("muted"), v.literal("failed")),
      failureReason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!prefs) throw new Error("Preferences not found");

    await ctx.db.patch(prefs._id, {
      customSources: args.sources,
    });

    return null;
  },
});

// Add a custom source
export const addCustomSource = mutation({
  args: {
    url: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!prefs) throw new Error("Preferences not found");

    const newSource = {
      url: args.url,
      name: args.name,
      status: "active" as const,
    };

    await ctx.db.patch(prefs._id, {
      customSources: [...prefs.customSources, newSource],
    });

    return null;
  },
});

export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const prefs = await ctx.db.query("userPreferences").collect();
    const userIds = prefs
      .filter(p => p.onboardingCompleted)
      .map(p => p.userId);
    
    const users = await Promise.all(
      userIds.map(id => ctx.db.get(id))
    );
    
    return users.filter(u => u !== null);
  },
});

export const getUserSources = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    return prefs;
  },
});
