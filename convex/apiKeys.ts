import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Simple encryption using base64 (for demo - in production use proper encryption)
// Note: This is a basic implementation. For production, consider using a proper encryption library
function encryptKey(key: string): string {
  // In production, use a proper encryption method with a secret key
  // Using btoa for base64 encoding (available in V8 runtime)
  return btoa(key);
}

function decryptKey(encryptedKey: string): string {
  // In production, use a proper decryption method
  // Using atob for base64 decoding (available in V8 runtime)
  return atob(encryptedKey);
}

// Get user's API keys (returns masked versions)
export const getUserApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const keys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return keys.map(key => ({
      _id: key._id,
      provider: key.provider,
      isActive: key.isActive,
      maskedKey: "sk-..." + key.encryptedKey.slice(-4),
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  },
});

// Save or update API key
export const saveApiKey = mutation({
  args: {
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate API key format
    if (args.provider === "openai" && !args.apiKey.startsWith("sk-")) {
      throw new Error("Invalid OpenAI API key format");
    }
    if (args.provider === "anthropic" && !args.apiKey.startsWith("sk-ant-")) {
      throw new Error("Invalid Anthropic API key format");
    }

    const encryptedKey = encryptKey(args.apiKey);

    // Check if key already exists for this provider
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      // Update existing key
      await ctx.db.patch(existing._id, {
        encryptedKey,
        isActive: true,
        updatedAt: Date.now(),
      });
      return { success: true, updated: true };
    } else {
      // Create new key
      await ctx.db.insert("userApiKeys", {
        userId,
        provider: args.provider,
        encryptedKey,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true, updated: false };
    }
  },
});

// Delete API key
export const deleteApiKey = mutation({
  args: {
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true };
    }

    return { success: false, error: "Key not found" };
  },
});

// Toggle API key active status
export const toggleApiKey = mutation({
  args: {
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: !existing.isActive,
        updatedAt: Date.now(),
      });
      return { success: true, isActive: !existing.isActive };
    }

    return { success: false, error: "Key not found" };
  },
});

// Internal query to get decrypted API key for a user
export const getDecryptedApiKey = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
  },
  handler: async (ctx, args) => {
    console.log(`[API_KEY] Looking for key: userId=${args.userId}, provider=${args.provider}`);

    const key = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    console.log(`[API_KEY] Query result: ${key ? 'FOUND' : 'NOT FOUND'}`);
    if (key) {
      console.log(`[API_KEY] Key details: _id=${key._id}, isActive=${key.isActive}, provider=${key.provider}`);
    }

    if (!key || !key.isActive) {
      console.log(`[API_KEY] Returning null: ${!key ? 'No key found' : 'Key is inactive'}`);
      return null;
    }

    console.log(`[API_KEY] Returning decrypted key`);
    return decryptKey(key.encryptedKey);
  },
});
