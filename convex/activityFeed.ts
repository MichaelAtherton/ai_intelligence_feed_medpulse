import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Log activity event
export const logActivity = internalMutation({
  args: {
    userId: v.id("users"),
    runId: v.id("discoveryRuns"),
    stage: v.string(),
    eventType: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityEvents", {
      userId: args.userId,
      runId: args.runId,
      timestamp: Date.now(),
      stage: args.stage,
      eventType: args.eventType,
      message: args.message,
      metadata: args.metadata,
    });
  },
});

// Get activity feed for a specific run
export const getActivityFeed = query({
  args: { runId: v.id("discoveryRuns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    
    return events.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Get latest activity for current user
export const getLatestActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const limit = args.limit ?? 100;
    
    return await ctx.db
      .query("activityEvents")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

// Clear old activity events (called by cron)
export const clearOldActivityEvents = internalMutation({
  args: { olderThan: v.number() },
  handler: async (ctx, args) => {
    const oldEvents = await ctx.db
      .query("activityEvents")
      .filter((q) => q.lt(q.field("timestamp"), args.olderThan))
      .collect();
    
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }
    
    return { deleted: oldEvents.length };
  },
});

// Export activity feed as JSON
export const exportActivityFeed = query({
  args: { runId: v.id("discoveryRuns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== userId) return null;
    
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    
    return {
      run,
      events: events.sort((a, b) => a.timestamp - b.timestamp),
      exportedAt: Date.now(),
    };
  },
});
