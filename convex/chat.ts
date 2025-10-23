import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a new conversation
 */
export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: args.title || "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    });

    return conversationId;
  },
});

/**
 * List all conversations for the current user
 */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return conversations;
  },
});

/**
 * Get a specific conversation
 */
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }

    return conversation;
  },
});

/**
 * Delete a conversation and all its messages
 */
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the conversation
    await ctx.db.delete(args.conversationId);

    return null;
  },
});

/**
 * Update conversation title
 */
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get messages for a conversation
 */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) => 
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * Add a user message to a conversation
 */
export const addUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    referencedArticleIds: v.optional(v.array(v.id("articles"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
      referencedArticleIds: args.referencedArticleIds,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      messageCount: conversation.messageCount + 1,
    });

    return messageId;
  },
});

/**
 * Add an assistant message to a conversation
 */
export const addAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    referencedArticleIds: v.optional(v.array(v.id("articles"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "assistant",
      content: args.content,
      createdAt: Date.now(),
      referencedArticleIds: args.referencedArticleIds,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      messageCount: conversation.messageCount + 1,
    });

    return messageId;
  },
});

/**
 * Update message content (for streaming)
 */
export const updateMessageContent = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
    });

    return null;
  },
});
