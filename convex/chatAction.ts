"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Generate an AI response to a user message with streaming support
 */
export const generateStreamingResponse = action({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Get conversation history
    const messages = await ctx.runQuery(api.chat.getMessages, {
      conversationId: args.conversationId,
    });

    // Get user for model configuration
    const user = await ctx.runQuery(api.auth.loggedInUser);
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user settings to determine which AI provider to use
    const settings = await ctx.runQuery(api.userSettings.getUserSettings);
    const provider = settings?.preferredProvider || "convex";

    // Get user's model configuration
    const modelConfig = await ctx.runQuery(internal.userSettings.getUserModelConfig, {
      userId: user._id,
    });

    // Get recent articles for context
    const articles = await ctx.runQuery(api.articles.getFeed, {
      limit: 10,
    });

    // Build context from articles
    const articlesContext = articles
      .map((article: any, idx: number) => 
        `[${idx + 1}] ${article.title}\n${article.summary}\nSource: ${article.sourceName}`
      )
      .join("\n\n");

    const systemPrompt = `You are an AI assistant helping healthcare professionals stay informed about AI developments in healthcare. You have access to the user's personalized feed of articles.

Here are the most recent articles from their feed:

${articlesContext}

When answering questions:
- Reference specific articles when relevant using [number] notation
- Provide insights based on the articles in their feed
- Be concise and actionable
- Focus on practical implications for healthcare professionals`;

    // Build message history for the AI
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Create a placeholder message that we'll update with streaming content
    const messageId = await ctx.runMutation(api.chat.addAssistantMessage, {
      conversationId: args.conversationId,
      content: "",
    });

    let fullResponse = "";

    try {
      if (provider === "openai") {
        const apiKey = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
          userId: user._id,
          provider: "openai",
        });

        const openai = new OpenAI({
          apiKey: apiKey || process.env.CONVEX_OPENAI_API_KEY,
          baseURL: apiKey ? undefined : process.env.CONVEX_OPENAI_BASE_URL,
        });

        const stream = await openai.chat.completions.create({
          model: modelConfig.chat,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: args.userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            // Update message every few chunks to reduce database writes
            if (fullResponse.length % 50 < content.length) {
              await ctx.runMutation(api.chat.updateMessageContent, {
                messageId,
                content: fullResponse,
              });
            }
          }
        }
      } else if (provider === "anthropic") {
        const apiKey = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
          userId: user._id,
          provider: "anthropic",
        });

        if (!apiKey) {
          throw new Error("Anthropic API key not configured");
        }

        const anthropic = new Anthropic({
          apiKey,
        });

        const stream = await anthropic.messages.stream({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...conversationHistory.map((msg: any) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
            { role: "user", content: args.userMessage },
          ],
        });

        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const content = chunk.delta.text;
            fullResponse += content;
            // Update message every few chunks
            if (fullResponse.length % 50 < content.length) {
              await ctx.runMutation(api.chat.updateMessageContent, {
                messageId,
                content: fullResponse,
              });
            }
          }
        }
      } else {
        // Use Convex bundled OpenAI
        const openai = new OpenAI({
          apiKey: process.env.CONVEX_OPENAI_API_KEY,
          baseURL: process.env.CONVEX_OPENAI_BASE_URL,
        });

        const stream = await openai.chat.completions.create({
          model: modelConfig.chat,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: args.userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            // Update message every few chunks
            if (fullResponse.length % 50 < content.length) {
              await ctx.runMutation(api.chat.updateMessageContent, {
                messageId,
                content: fullResponse,
              });
            }
          }
        }
      }

      // Final update with complete response
      await ctx.runMutation(api.chat.updateMessageContent, {
        messageId,
        content: fullResponse || "I apologize, but I couldn't generate a response.",
      });

      return fullResponse;
    } catch (error) {
      console.error("Error generating AI response:", error);
      const errorMessage = "I apologize, but I encountered an error generating a response. Please try again.";
      
      await ctx.runMutation(api.chat.updateMessageContent, {
        messageId,
        content: errorMessage,
      });

      return errorMessage;
    }
  },
});

/**
 * Generate an AI response to a user message (non-streaming fallback)
 */
export const generateResponse = action({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Get conversation history
    const messages = await ctx.runQuery(api.chat.getMessages, {
      conversationId: args.conversationId,
    });

    // Get user for model configuration
    const user = await ctx.runQuery(api.auth.loggedInUser);
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user settings to determine which AI provider to use
    const settings = await ctx.runQuery(api.userSettings.getUserSettings);
    const provider = settings?.preferredProvider || "convex";

    // Get user's model configuration
    const modelConfig = await ctx.runQuery(internal.userSettings.getUserModelConfig, {
      userId: user._id,
    });

    // Get recent articles for context
    const articles = await ctx.runQuery(api.articles.getFeed, {
      limit: 10,
    });

    // Build context from articles
    const articlesContext = articles
      .map((article: any, idx: number) => 
        `[${idx + 1}] ${article.title}\n${article.summary}\nSource: ${article.sourceName}`
      )
      .join("\n\n");

    const systemPrompt = `You are an AI assistant helping healthcare professionals stay informed about AI developments in healthcare. You have access to the user's personalized feed of articles.

Here are the most recent articles from their feed:

${articlesContext}

When answering questions:
- Reference specific articles when relevant using [number] notation
- Provide insights based on the articles in their feed
- Be concise and actionable
- Focus on practical implications for healthcare professionals`;

    // Build message history for the AI
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    let responseContent: string;

    try {
      if (provider === "openai") {
        const apiKey = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
          userId: user._id,
          provider: "openai",
        });

        const openai = new OpenAI({
          apiKey: apiKey || process.env.CONVEX_OPENAI_API_KEY,
          baseURL: apiKey ? undefined : process.env.CONVEX_OPENAI_BASE_URL,
        });

        const response = await openai.chat.completions.create({
          model: modelConfig.chat,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: args.userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        responseContent = response.choices[0].message.content || "I apologize, but I couldn't generate a response.";
      } else if (provider === "anthropic") {
        const apiKey = await ctx.runQuery(internal.apiKeys.getDecryptedApiKey, {
          userId: user._id,
          provider: "anthropic",
        });

        if (!apiKey) {
          throw new Error("Anthropic API key not configured");
        }

        const anthropic = new Anthropic({
          apiKey,
        });

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...conversationHistory.map((msg: any) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
            { role: "user", content: args.userMessage },
          ],
        });

        const content = response.content[0];
        responseContent = content.type === "text" ? content.text : "I apologize, but I couldn't generate a response.";
      } else {
        const openai = new OpenAI({
          apiKey: process.env.CONVEX_OPENAI_API_KEY,
          baseURL: process.env.CONVEX_OPENAI_BASE_URL,
        });

        const response = await openai.chat.completions.create({
          model: modelConfig.chat,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: args.userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        responseContent = response.choices[0].message.content || "I apologize, but I couldn't generate a response.";
      }

      await ctx.runMutation(api.chat.addAssistantMessage, {
        conversationId: args.conversationId,
        content: responseContent,
      });

      return responseContent;
    } catch (error) {
      console.error("Error generating AI response:", error);
      const errorMessage = "I apologize, but I encountered an error generating a response. Please try again.";
      
      await ctx.runMutation(api.chat.addAssistantMessage, {
        conversationId: args.conversationId,
        content: errorMessage,
      });

      return errorMessage;
    }
  },
});
