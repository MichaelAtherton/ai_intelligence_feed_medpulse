import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const triggerDiscovery = action({
  args: {},
  handler: async (ctx) => {
    // USER ISOLATION: Only run discovery for the logged-in user
    // Delegates to runDiscoveryForCurrentUser which checks authentication
    return await ctx.runAction(api.discoveryAction.runDiscoveryForCurrentUser, {});
  },
});

export const triggerScraping = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Create a run for activity logging
    const runId = await ctx.runMutation(internal.state.startDiscoveryRun, { userId });
    
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "scraping",
      eventType: "stage_start",
      message: "🔧 Manual scraping trigger started",
      metadata: { manualTrigger: true },
    });
    
    // USER ISOLATION: Only scrape articles for the current user
    const result: { total: number; success: number; failed: number } = await ctx.runAction(
      internal.scrapingAction.batchScrapeAndAnalyze,
      { userId, runId, limit: 10 } // USER ISOLATION
    );
    
    // Mark run as complete
    await ctx.runMutation(internal.state.completeDiscoveryRun, {
      runId,
      sourcesChecked: 0,
      itemsFound: 0,
      itemsQueued: 0,
      itemsScraped: result.success,
      itemsAnalyzed: result.success,
    });
    
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "completion",
      eventType: "stage_complete",
      message: `✅ Manual scraping complete: ${result.success} of ${result.total} articles processed`,
      metadata: { manualTrigger: true },
    });
    
    return result;
  },
});

export const triggerEmbeddings = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // USER ISOLATION: Only generate embeddings for the current user's articles
    const result: { total: number; success: number; failed: number } = await ctx.runAction(
      internal.storageAction.batchGenerateEmbeddings,
      { userId, limit: 20 } // USER ISOLATION
    );
    return result;
  },
});
