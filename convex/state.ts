import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getLastCheckTime = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("discoveryState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    return state?.lastCheck ?? Date.now() - (7 * 24 * 60 * 60 * 1000);
  },
});

export const updateLastCheckTime = internalMutation({
  args: {
    userId: v.id("users"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("discoveryState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { lastCheck: args.timestamp });
    } else {
      await ctx.db.insert("discoveryState", {
        userId: args.userId,
        lastCheck: args.timestamp,
      });
    }
  },
});

export const hasSeenUrl = internalQuery({
  args: { 
    userId: v.id("users"),
    url: v.string() 
  },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("seenUrls")
      .withIndex("by_user_url", (q) => 
        q.eq("userId", args.userId).eq("url", args.url)
      )
      .first();
    
    return seen !== null;
  },
});

export const markUrlAsSeen = internalMutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("seenUrls")
      .withIndex("by_user_url", (q) => 
        q.eq("userId", args.userId).eq("url", args.url)
      )
      .first();
    
    if (!existing) {
      await ctx.db.insert("seenUrls", {
        userId: args.userId,
        url: args.url,
        firstSeen: Date.now(),
      });
    }
  },
});

export const startDiscoveryRun = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("discoveryRuns", {
      userId: args.userId,
      startedAt: Date.now(),
      sourcesChecked: 0,
      itemsFound: 0,
      itemsQueued: 0,
      status: "running",
    });
  },
});

export const completeDiscoveryRun = internalMutation({
  args: {
    runId: v.id("discoveryRuns"),
    sourcesChecked: v.number(),
    itemsFound: v.number(),
    itemsQueued: v.number(),
    itemsScraped: v.optional(v.number()),
    itemsAnalyzed: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const wasCancelled = run?.status === "cancelled";
    
    await ctx.db.patch(args.runId, {
      completedAt: Date.now(),
      sourcesChecked: args.sourcesChecked,
      itemsFound: args.itemsFound,
      itemsQueued: args.itemsQueued,
      itemsScraped: args.itemsScraped,
      itemsAnalyzed: args.itemsAnalyzed,
      status: wasCancelled ? "cancelled" : args.error ? "failed" : "completed",
      error: args.error,
    });
  },
});

export const cancelDiscoveryRun = mutation({
  args: { runId: v.id("discoveryRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== userId) {
      throw new Error("Run not found or access denied");
    }

    if (run.status !== "running") {
      throw new Error("Can only cancel running pipelines");
    }

    await ctx.db.patch(args.runId, { status: "cancelled" });
    return null;
  },
});

export const isRunCancelled = internalQuery({
  args: { runId: v.id("discoveryRuns") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    return run?.status === "cancelled";
  },
});

export const getRecentRuns = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});

export const getRecentRunsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);
  },
});

export const deleteRun = mutation({
  args: { runId: v.id("discoveryRuns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== userId) {
      throw new Error("Run not found or access denied");
    }

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    await ctx.db.delete(args.runId);
    return { success: true };
  },
});

export const clearAllRuns = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const runs = await ctx.db
      .query("discoveryRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    for (const run of runs) {
      const events = await ctx.db
        .query("activityEvents")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect();
      
      for (const event of events) {
        await ctx.db.delete(event._id);
      }

      await ctx.db.delete(run._id);
    }

    return { success: true, deleted: runs.length };
  },
});
