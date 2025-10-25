"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { discoveryAgentOpenAI } from "./discovery/agent";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// ============================================================================
// USER-TRIGGERED DISCOVERY (Manual button click - ISOLATED to logged-in user)
// ============================================================================

export const runDiscoveryForCurrentUser = action({
  args: {},
  handler: async (ctx) => {
    // Get the logged-in user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please log in to run discovery.");
    }

    console.log(`🔍 [USER-TRIGGERED] Discovery starting for userId: ${userId}`);

    // Schedule discovery for this user only
    await ctx.scheduler.runAfter(
      0,
      internal.discoveryAction.runDiscoveryForUser,
      { userId }
    );

    return {
      success: true,
      message: "Discovery pipeline scheduled for your account only",
      userId
    };
  },
});

// ============================================================================
// CRON-TRIGGERED DISCOVERY (Automated - runs for ALL users)
// ============================================================================

export const runDiscoveryPipelineForAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 [CRON-TRIGGERED] Discovery Pipeline Starting for ALL USERS");

    const allUsers = await ctx.runQuery(internal.userPreferences.getAllUsers);
    console.log(`📊 Found ${allUsers.length} users to process`);

    for (const user of allUsers) {
      try {
        console.log(`\n🔍 Processing discovery for user ${user._id}`);
        await runDiscoveryForUserImpl(ctx, user._id);
      } catch (error) {
        console.error(`❌ Failed for user ${user._id}:`, error);
      }
    }

    return { success: true, usersProcessed: allUsers.length };
  },
});

// ============================================================================
// CORE DISCOVERY LOGIC (Exported as internal action for scheduler)
// ============================================================================

export const runDiscoveryForUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await runDiscoveryForUserImpl(ctx, args.userId);
  }
});

async function runDiscoveryForUserImpl(ctx: any, userId: Id<"users">) {
  console.log(`\n🔍 Running discovery for user ${userId}`);
  
  const runId: Id<"discoveryRuns"> = await ctx.runMutation(internal.state.startDiscoveryRun, {
    userId,
  });

  // Log: Pipeline started
  await ctx.runMutation(internal.activityFeed.logActivity, {
    userId,
    runId,
    stage: "discovery",
    eventType: "stage_start",
    message: "🚀 Discovery pipeline started",
    metadata: {},
  });

  try {
    // Get sources and topics from user preferences
    const prefs = await ctx.runQuery(internal.userPreferences.getUserSources, { userId });
    const sources = prefs?.customSources
      ?.filter((s: { status: string }) => s.status !== 'failed')
      .map((s: { name: string; url: string }) => ({
        name: s.name,
        url: s.url,
        type: "web" as const,
      })) ?? [];
    
    // Get user's selected topics
    const userTopics = [...(prefs?.selectedTopics ?? []), ...(prefs?.customTopics ?? [])];
    console.log(`📊 Loaded ${sources.length} sources and ${userTopics.length} topics from user preferences`);

    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "stage_progress",
      message: `📊 Loaded ${sources.length} sources and ${userTopics.length} topics`,
      metadata: {
        totalItems: sources.length,
        sources: sources.map((s: any) => ({ name: s.name, url: s.url })),
        topics: userTopics,
      },
    });

    if (sources.length === 0) {
      await ctx.runMutation(internal.activityFeed.logActivity, {
        userId,
        runId,
        stage: "discovery",
        eventType: "error",
        message: "⚠️ No sources configured",
        metadata: {
          errorMessage: "Please add sources in the Sources tab",
        },
      });

      await ctx.runMutation(internal.state.completeDiscoveryRun, {
        runId,
        sourcesChecked: 0,
        itemsFound: 0,
        itemsQueued: 0,
        itemsScraped: 0,
        itemsAnalyzed: 0,
      });
      return;
    }

    // Check if cancelled before starting
    const isCancelled = await ctx.runQuery(internal.state.isRunCancelled, { runId });
    if (isCancelled) {
      console.log("⚠️ Discovery run cancelled by user");
      await ctx.runMutation(internal.activityFeed.logActivity, {
        userId,
        runId,
        stage: "discovery",
        eventType: "error",
        message: "❌ Discovery cancelled by user",
        metadata: {},
      });
      await ctx.runMutation(internal.state.completeDiscoveryRun, {
        runId,
        sourcesChecked: 0,
        itemsFound: 0,
        itemsQueued: 0,
        itemsScraped: 0,
        itemsAnalyzed: 0,
      });
      return;
    }

    const lastCheckTimestamp: number = await ctx.runQuery(internal.state.getLastCheckTime, { userId });
    // Subtract 1 hour buffer to avoid missing articles published during the last run
    const lastCheckDate = new Date((lastCheckTimestamp ?? Date.now() - 7 * 24 * 60 * 60 * 1000) - 60 * 60 * 1000);
    const currentRunStartTime = Date.now();
    console.log(`📅 Last check: ${lastCheckDate.toISOString()}`);

    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "stage_progress",
      message: `📅 Checking for articles since ${lastCheckDate.toLocaleDateString()}`,
      metadata: {},
    });

    // Get user's OpenAI API key
    const userApiKey: string | null = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
      userId,
      provider: "openai",
    });

    if (!userApiKey) {
      await ctx.runMutation(internal.activityFeed.logActivity, {
        userId,
        runId,
        stage: "discovery",
        eventType: "error",
        message: "❌ OpenAI API key not configured",
        metadata: {
          errorMessage: "Please add your API key in Settings",
        },
      });
      throw new Error("OpenAI API key not configured. Please add your API key in Settings.");
    }

    // Get user's model configuration
    const modelConfig = await ctx.runQuery(internal.userSettings.getUserModelConfig, {
      userId,
    });

    // Run discovery with enhanced logging and progress tracking
    const result = await discoveryAgentOpenAIWithLogging(
      ctx,
      userId,
      runId,
      sources,
      lastCheckDate,
      userTopics,
      userApiKey,
      modelConfig.discovery
    );

    console.log(`✅ Discovery agent found ${result.discoveries.length} items from ${sources.length} sources`);

    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "stage_complete",
      message: `✅ Discovery complete: ${result.discoveries.length} articles found`,
      metadata: {},
    });

    let queuedCount = 0;
    let skippedCount = 0;
    const articleIds: Array<Id<"articles">> = [];
    
    // Log: Starting deduplication
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "stage_progress",
      message: `🔍 Checking for duplicates...`,
      metadata: {},
    });

    for (const discovery of result.discoveries) {
      const seen: boolean = await ctx.runQuery(internal.state.hasSeenUrl, {
        userId,
        url: discovery.url,
      });

      if (!seen) {
        await ctx.runMutation(internal.state.markUrlAsSeen, {
          userId,
          url: discovery.url,
        });

        const articleId = await ctx.runMutation(internal.articles.addArticle, {
          userId,
          title: discovery.title,
          sourceUrl: discovery.source,
          sourceName: discovery.source,
          articleUrl: discovery.url,
          summary: `Discovered from ${discovery.source}`,
          tags: ["AI", "Healthcare"],
          content: "",
          publishedAt: new Date(discovery.published).getTime(),
        });

        articleIds.push(articleId);
        queuedCount++;
        console.log(`   ✓ Queued: ${discovery.title}`);
      } else {
        skippedCount++;
        console.log(`   ⊘ Skipped (already seen): ${discovery.title}`);
      }
    }
    
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "stage_progress",
      message: `📝 Queued ${queuedCount} new articles (${skippedCount} duplicates skipped)`,
      metadata: {},
    });

    // Check if cancelled before scraping
    const isCancelledBeforeScraping = await ctx.runQuery(internal.state.isRunCancelled, { runId });
    if (isCancelledBeforeScraping) {
      console.log("⚠️ Discovery run cancelled by user before scraping");
      await ctx.runMutation(internal.activityFeed.logActivity, {
        userId,
        runId,
        stage: "scraping",
        eventType: "error",
        message: "❌ Scraping cancelled by user",
        metadata: {},
      });
      await ctx.runMutation(internal.state.completeDiscoveryRun, {
        runId,
        sourcesChecked: result.summary.sources_checked,
        itemsFound: result.summary.items_found,
        itemsQueued: queuedCount,
        itemsScraped: 0,
        itemsAnalyzed: 0,
      });
      return;
    }

    // Trigger scraping and analysis
    let scrapedCount = 0;
    let analyzedCount = 0;
    
    if (articleIds.length > 0) {
      console.log(`\n🔄 Scraping and analyzing ${articleIds.length} articles for user ${userId}`);
      
      await ctx.runMutation(internal.activityFeed.logActivity, {
        userId,
        runId,
        stage: "scraping",
        eventType: "stage_start",
        message: `🔄 Starting scraping for ${articleIds.length} articles`,
        metadata: {
          totalItems: articleIds.length,
        },
      });

      const batchResult = await batchScrapeAndAnalyzeWithLogging(
        ctx,
        userId,
        runId,
        articleIds.length
      );
      
      scrapedCount = batchResult.success;
      analyzedCount = batchResult.success;

      await ctx.runMutation(internal.activityFeed.logActivity, {
        userId,
        runId,
        stage: "scraping",
        eventType: "stage_complete",
        message: `✅ Scraping complete: ${scrapedCount} articles processed`,
        metadata: {},
      });
    }

    await ctx.runMutation(internal.state.updateLastCheckTime, {
      userId,
      timestamp: currentRunStartTime,
    });

    await ctx.runMutation(internal.state.completeDiscoveryRun, {
      runId,
      sourcesChecked: result.summary.sources_checked,
      itemsFound: result.summary.items_found,
      itemsQueued: queuedCount,
      itemsScraped: scrapedCount,
      itemsAnalyzed: analyzedCount,
    });

    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "completion",
      eventType: "stage_complete",
      message: `🎉 Pipeline complete! ${queuedCount} new articles added`,
      metadata: {},
    });

    console.log(`✅ Discovery Complete for user ${userId}: ${result.discoveries.length} found, ${queuedCount} new (queued), ${skippedCount} already seen, ${analyzedCount} analyzed`);
  } catch (error) {
    console.error("❌ Discovery Pipeline Failed:", error);
    
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "completion",
      eventType: "error",
      message: `❌ Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    await ctx.runMutation(internal.state.completeDiscoveryRun, {
      runId,
      sourcesChecked: 0,
      itemsFound: 0,
      itemsQueued: 0,
      itemsScraped: 0,
      itemsAnalyzed: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function discoveryAgentOpenAIWithLogging(
  ctx: any,
  userId: Id<"users">,
  runId: Id<"discoveryRuns">,
  sources: any[],
  sinceDate: Date,
  topics: string[],
  apiKey: string,
  model: string
) {
  // Log LLM call start
  await ctx.runMutation(internal.activityFeed.logActivity, {
    userId,
    runId,
    stage: "discovery",
    eventType: "llm_call",
    message: `🤖 Calling OpenAI to discover articles`,
    metadata: {
      llmProvider: "OpenAI",
      llmModel: model,
      llmPrompt: `Discover AI healthcare articles from ${sources.length} sources since ${sinceDate.toISOString()}`,
    },
  });

  // Progress callback to report source-by-source progress
  const progressCallback = async (current: number, total: number, sourceName: string) => {
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "stage_progress",
      message: `🔍 Checking source ${current}/${total}: ${sourceName}`,
      metadata: {
        currentItem: current,
        totalItems: total,
        sourceName,
      },
    });
  };

  // Logger callback to capture all LLM interactions
  const logger = async (data: any) => {
    await ctx.runMutation(internal.activityFeed.logActivity, {
      userId,
      runId,
      stage: "discovery",
      eventType: "llm_call",
      message: data.type === "llm_request" 
        ? `🤖 LLM Request (iteration ${data.iteration})`
        : data.type === "llm_response"
        ? `✅ LLM Response (iteration ${data.iteration})`
        : `🔧 Tool Result: ${data.function}`,
      metadata: {
        llmProvider: "OpenAI",
        llmModel: data.model || model,
        ...data,
      },
    });
  };

  const result = await discoveryAgentOpenAI(sources, sinceDate, topics, apiKey, model, logger, progressCallback);

  // Log LLM call complete
  await ctx.runMutation(internal.activityFeed.logActivity, {
    userId,
    runId,
    stage: "discovery",
    eventType: "llm_call",
    message: `✅ OpenAI returned ${result.discoveries.length} discoveries`,
    metadata: {
      llmProvider: "OpenAI",
      llmModel: model,
      llmResponse: `Found ${result.discoveries.length} articles`,
    },
  });

  return result;
}

async function batchScrapeAndAnalyzeWithLogging(
  ctx: any,
  userId: Id<"users">,
  runId: Id<"discoveryRuns">,
  limit: number
) {
  const result = await ctx.runAction(internal.scrapingAction.batchScrapeAndAnalyze, {
    userId,
    runId,
    limit,
  });

  return result;
}
