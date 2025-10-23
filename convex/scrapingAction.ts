"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { scrapeArticleContent } from "./discovery/scraper";
import { analyzeArticleContent } from "./discovery/analyzer";
import { v } from "convex/values";

export const batchScrapeAndAnalyze = internalAction({
  args: {
    userId: v.id("users"),
    runId: v.id("discoveryRuns"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ total: number; success: number; failed: number }> => {
    const limit = args.limit ?? 10;
    
    // Get articles that need scraping for THIS USER
    const articles = await ctx.runQuery(internal.articles.getPendingAnalysis, {
      userId: args.userId,
      limit,
    });

    let successCount = 0;
    let failedCount = 0;

    // Use the runId passed as parameter
    const runId = args.runId;

    // Get user's model configuration
    const modelConfig = await ctx.runQuery(internal.userSettings.getUserModelConfig, {
      userId: args.userId,
    });

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      try {
        // Log article progress with URL from discovery
        if (runId) {
          await ctx.runMutation(internal.activityFeed.logActivity, {
            userId: args.userId,
            runId,
            stage: "scraping",
            eventType: "article_progress",
            message: `📄 Scraping article ${i + 1} of ${articles.length}: ${article.title}`,
            metadata: {
              articleId: article._id,
              articleTitle: article.title,
              articleUrl: article.articleUrl, // URL from discovery agent
              sourceUrl: article.sourceUrl,   // Source from discovery agent
              discoveryData: {
                title: article.title,
                url: article.articleUrl,
                source: article.sourceUrl,
                summary: article.summary,
              },
              currentItem: i + 1,
              totalItems: articles.length,
            },
          });
        }

        // Scrape the article
        const scrapeResult = await scrapeArticleContent(article.articleUrl);
        const scrapedContent = scrapeResult.content || "";
        
        // Log scraping result
        if (runId) {
          await ctx.runMutation(internal.activityFeed.logActivity, {
            userId: args.userId,
            runId,
            stage: "scraping",
            eventType: scrapeResult.success ? "stage_progress" : "error",
            message: scrapeResult.success
              ? `✅ Scraped ${scrapedContent.length} chars from: ${article.title}`
              : `❌ Scraping failed for: ${article.title}`,
            metadata: {
              articleId: article._id,
              articleTitle: article.title,
              articleUrl: article.articleUrl,
              scrapeSuccess: scrapeResult.success,
              contentLength: scrapedContent.length,
              scraperError: scrapeResult.error,
              contentPreview: scrapedContent.slice(0, 500), // First 500 chars of extracted content
            },
          });
        }
        
        if (!scrapedContent || scrapedContent.length < 100) {
          console.log(`⚠️ Insufficient content for ${article.title}`);
          
          // Log content validation failure
          if (runId) {
            await ctx.runMutation(internal.activityFeed.logActivity, {
              userId: args.userId,
              runId,
              stage: "scraping",
              eventType: "error",
              message: `⚠️ Insufficient content for: ${article.title}`,
              metadata: {
                articleId: article._id,
                articleTitle: article.title,
                articleUrl: article.articleUrl,
                contentLength: scrapedContent.length,
                requiredLength: 100,
                reason: "Content length below minimum threshold",
                contentPreview: scrapedContent.slice(0, 500), // Show what was actually extracted
                extractedContent: scrapedContent, // Full content for analysis
              },
            });
          }
          
          failedCount++;
          continue;
        }

        // Get user's API key
        const userApiKey = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
          userId: args.userId,
          provider: "openai",
        });

        if (!userApiKey) {
          console.log(`⚠️ No API key for user ${args.userId}`);
          failedCount++;
          continue;
        }

        // Log LLM analysis start
        if (runId) {
          await ctx.runMutation(internal.activityFeed.logActivity, {
            userId: args.userId,
            runId,
            stage: "analysis",
            eventType: "llm_call",
            message: `🤖 Analyzing article: ${article.title}`,
            metadata: {
              articleId: article._id,
              articleTitle: article.title,
              llmProvider: "OpenAI",
              llmModel: modelConfig.analysis,
              llmPrompt: `Analyze article: ${article.title}\n\nExtract: industry, department, AI technologies, business impact, technical details, key insights`,
            },
          });
        }

        // Analyze the article
        const analysis = await analyzeArticleContent(
          article.title,
          scrapedContent,
          article.articleUrl,
          userApiKey,
          modelConfig.analysis
        );

        // Log LLM analysis complete
        if (runId) {
          await ctx.runMutation(internal.activityFeed.logActivity, {
            userId: args.userId,
            runId,
            stage: "analysis",
            eventType: "llm_call",
            message: `✅ Analysis complete for: ${article.title}`,
            metadata: {
              articleId: article._id,
              articleTitle: article.title,
              llmProvider: "OpenAI",
              llmModel: modelConfig.analysis,
              llmResponse: JSON.stringify(analysis, null, 2),
            },
          });
        }

        // Update article with analysis
        await ctx.runMutation(internal.articles.updateArticleAnalysis, {
          articleId: article._id,
          content: scrapedContent,
          industry: analysis.industry,
          department: analysis.department,
          aiTechnology: analysis.aiTechnology,
          businessImpact: analysis.businessImpact,
          technicalDetails: analysis.technicalDetails,
          keyInsights: analysis.keyInsights,
          summary: analysis.summary || article.summary,
          tags: analysis.tags || article.tags,
          status: "completed",
        });

        successCount++;
        console.log(`✅ Processed: ${article.title}`);
      } catch (error) {
        console.error(`❌ Failed to process ${article.title}:`, error);
        
        if (runId) {
          await ctx.runMutation(internal.activityFeed.logActivity, {
            userId: args.userId,
            runId,
            stage: "scraping",
            eventType: "error",
            message: `❌ Failed to process: ${article.title}`,
            metadata: {
              articleId: article._id,
              articleTitle: article.title,
              errorMessage: error instanceof Error ? error.message : String(error),
            },
          });
        }
        
        failedCount++;
      }
    }

    return {
      total: articles.length,
      success: successCount,
      failed: failedCount,
    };
  },
});
