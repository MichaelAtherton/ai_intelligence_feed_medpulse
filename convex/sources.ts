import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// All sources now come from userPreferences.customSources
// Default sources functionality has been removed

export const getSourceStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const customStats = await Promise.all(
      (prefs?.customSources ?? []).map(async (source, index) => {
        // Count articles for THIS USER from this source
        const articles = await ctx.db
          .query("articles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        const count = articles.filter(a => a.sourceName === source.name).length;

        return {
          _id: `custom_${index}_${source.url}` as any,
          _creationTime: Date.now(),
          name: source.name,
          url: source.url,
          type: "web" as const,
          articleCount: count,
          status: source.status,
          failureReason: source.failureReason,
        };
      })
    );

    return customStats;
  },
});

export const getAllActiveSources = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    const customSources = prefs?.customSources
      ?.filter(s => s.status !== 'failed')
      .map(s => ({
        name: s.name,
        url: s.url,
        type: "web" as const,
      })) ?? [];
    
    return customSources;
  },
});
