"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

// Generate daily summary for user's feed
export const generateDailySummary = internalAction({
  args: {
    userId: v.id("users"),
    timeRange: v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("2w"),
      v.literal("1m"),
      v.literal("6m"),
      v.literal("1y")
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Check if summary already exists for today
    const existing: any = await ctx.runQuery(internal.dailySummary.getSummaryByDate, {
      userId: args.userId,
      date: today,
    });

    if (existing) {
      return existing;
    }

    // Get user's feed articles based on time range
    const articles: Array<any> = await ctx.runQuery(internal.dailySummary.getRecentFeedArticles, {
      userId: args.userId,
      timeRange: args.timeRange,
    });

    if (articles.length === 0) {
      const timeRangeLabels: Record<string, string> = {
        "24h": "24 hours",
        "7d": "7 days",
        "2w": "2 weeks",
        "1m": "month",
        "6m": "6 months",
        "1y": "year",
      };
      throw new Error(`No articles found from the last ${timeRangeLabels[args.timeRange]} matching your interests. Try running discovery to fetch new articles first.`);
    }

    // Get user's model configuration
    const modelConfig = await ctx.runQuery(internal.userSettings.getUserModelConfig, {
      userId: args.userId,
    });

    // Generate summary using AI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare article data for AI
    const articleData = articles.map((a: any, idx: number) => ({
      id: idx,
      title: a.title,
      summary: a.summary,
      tags: a.tags,
      source: a.sourceName,
    }));

    const timeRangeLabels: Record<string, string> = {
      "24h": "24 hours",
      "7d": "7 days",
      "2w": "2 weeks",
      "1m": "month",
      "6m": "6 months",
      "1y": "year",
    };
    
    const prompt = `Analyze these ${articles.length} AI healthcare articles from the last ${timeRangeLabels[args.timeRange]} and create a summary.

Articles:
${JSON.stringify(articleData, null, 2)}

Create a thematic summary with 3-7 themes. For each theme:
1. Create a descriptive theme title (3-6 words)
2. Write a 2-3 sentence description of the theme
3. List which article IDs belong to this theme
4. For each article in the theme, write a one-liner summary (15-25 words)

Return ONLY valid JSON in this exact format:
{
  "themes": [
    {
      "title": "Theme Title",
      "description": "2-3 sentence description of this theme and why it matters",
      "articleIds": [0, 1, 2],
      "articleSummaries": [
        {
          "articleId": 0,
          "oneLiner": "15-25 word summary of key takeaway"
        }
      ]
    }
  ]
}

Focus on:
- Grouping related articles by topic, technology, or impact area
- Creating themes that help busy professionals understand patterns
- Writing one-liners that capture the most important insight
- Ensuring every article appears in exactly one theme`;

    try {
      const response = await openai.chat.completions.create({
        model: modelConfig.dailySummary,
        messages: [
          {
            role: "system",
            content: "You are an AI healthcare analyst creating daily summaries for busy healthcare professionals. Group articles into themes and create concise one-liners. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in response");
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const result = JSON.parse(jsonMatch[0]);

      // Map article indices back to actual article IDs
      const themes = result.themes.map((theme: any) => ({
        title: theme.title,
        description: theme.description,
        articleIds: theme.articleIds.map((idx: number) => articles[idx]._id),
        articleSummaries: theme.articleSummaries.map((summary: any) => ({
          articleId: articles[summary.articleId]._id,
          oneLiner: summary.oneLiner,
        })),
      }));

      // Store summary in database
      const summaryId: Id<"dailySummaries"> = await ctx.runMutation(internal.dailySummary.storeSummary, {
        userId: args.userId,
        date: today,
        themes,
        totalArticles: articles.length,
      });

      // Return the stored summary
      return await ctx.runQuery(internal.dailySummary.getSummaryById, {
        summaryId,
      });
    } catch (error) {
      console.error("Failed to generate summary:", error);
      throw new Error("Failed to generate summary");
    }
  },
});
