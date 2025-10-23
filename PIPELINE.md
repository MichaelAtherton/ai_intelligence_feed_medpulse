# AI Intelligence Feed - Discovery Pipeline Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pipeline Stages](#pipeline-stages)
4. [Component Details](#component-details)
5. [Data Flow](#data-flow)
6. [User Isolation](#user-isolation)
7. [Error Handling](#error-handling)
8. [Debugging Guide](#debugging-guide)
9. [Extension Points](#extension-points)
10. [Performance & Optimization](#performance--optimization)

---

## Overview

The **Discovery Pipeline** is an agentic system that automatically finds, scrapes, analyzes, and indexes AI healthcare articles from user-configured sources. It runs as a background job, allowing users to navigate away without interruption.

### Key Features
- ✅ **Agentic Discovery**: LLM-driven article discovery using tool calling
- ✅ **User Isolation**: Every article/embedding belongs to a specific user
- ✅ **Asynchronous**: Runs in background, survives page navigation
- ✅ **Cancellable**: Users can cancel running pipelines
- ✅ **Real-time Monitoring**: Live activity feed with detailed logs
- ✅ **Error Resilient**: Individual failures don't break the pipeline

### Technology Stack
- **Backend**: Convex (serverless functions + real-time DB)
- **LLM**: OpenAI (gpt-4o-mini for discovery, gpt-4.1-nano for analysis)
- **Embeddings**: OpenAI text-embedding-3-small (384 dimensions)
- **Scraping**: Cheerio + Mozilla Readability + JSDOM
- **State Management**: Convex real-time queries

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE (React)                       │
│  LiveDiscovery.tsx → Triggers pipeline, shows real-time status  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER LAYER (Convex)                        │
│  manualTriggers.ts → Schedules pipeline via ctx.scheduler       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 ORCHESTRATION LAYER (Convex)                     │
│  discoveryAction.ts → Main pipeline coordinator                 │
│    - Manages user iteration                                      │
│    - Coordinates phases                                          │
│    - Tracks state                                                │
│    - Handles cancellation                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1: DISCOVERY (Node.js Runtime)                │
│  discovery/agent.ts → Agentic article discovery                 │
│  discovery/tools.ts → Web scraping utilities                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         PHASE 2: SCRAPING & ANALYSIS (Node.js Runtime)          │
│  scrapingAction.ts → Batch orchestrator                         │
│  discovery/scraper.ts → Content extraction                      │
│  discovery/analyzer.ts → AI insight extraction                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           PHASE 3: EMBEDDING (Node.js Runtime)                  │
│  storageAction.ts → Vector generation for semantic search       │
│  Note: This runs separately, not in main pipeline               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (Convex)                         │
│  articles.ts → Article CRUD + queries                           │
│  state.ts → Pipeline state tracking                             │
│  activityFeed.ts → Event logging                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Stages

### Stage 0: Trigger
**File**: `convex/manualTriggers.ts`

**Entry Point**: `triggerDiscovery()`

**User Access Points**:
1. **Sources Tab** → Manual Triggers section → "Run Discovery" button
2. **Live Discovery Tab** → "Start Discovery" button
3. **Admin Panel** (if accessed directly) → "Run Discovery" button

**Flow**:
```typescript
User clicks "Run Discovery" or "Start Discovery"
      ↓
Action schedules pipeline via ctx.scheduler.runAfter(0, ...)
      ↓
Returns immediately (non-blocking)
      ↓
Pipeline runs independently on Convex servers
```

**Key Implementation**:
```typescript
await ctx.scheduler.runAfter(0, internal.discoveryAction.runDiscoveryPipeline, {});
```

This ensures:
- ✅ User can navigate away
- ✅ No connection dependency
- ✅ Pipeline survives page refresh
- ✅ Same pipeline regardless of trigger location

---

### Stage 1: Discovery
**File**: `convex/discoveryAction.ts` → `convex/discovery/agent.ts`

**Purpose**: Find new articles from user sources using AI agent

**Flow**:
```
1. Load user preferences
   ├─ Get customSources[] (RSS feeds, web URLs)
   └─ Get selectedTopics[] + customTopics[]

2. Check for cancellation (early exit)

3. Get last check timestamp (with 1-hour buffer)

4. Call discoveryAgentOpenAI()
   ├─ Process sources in batches of 3
   ├─ LLM uses web_fetch tool to extract articles
   ├─ Filter by topics & date range
   └─ Return discoveries[]

5. Deduplicate via state.hasSeenUrl()

6. Create article stubs
   ├─ Status: "pending"
   ├─ userId: assigned
   └─ Content: empty (needs scraping)
```

**Agentic Behavior**:
- LLM decides which sources to check
- LLM decides when it has found enough
- LLM filters articles by relevance
- Max 15 iterations to prevent infinite loops

**Token Management**:
- Context limit: 100k tokens
- Tool result limit: 20k tokens
- Truncates if exceeding limits

---

### Stage 2: Scraping & Analysis
**File**: `convex/scrapingAction.ts` → `convex/discovery/scraper.ts` + `analyzer.ts`

**Purpose**: Extract full content and AI-generated insights

**Flow**:
```
1. Query pending articles (limit 10)
   articles.getPendingAnalysis(userId)

2. Check for cancellation (exit with partial results)

3. For each article:
   a. Scrape content
      scrapeArticleContent(url)
      ├─ Fetch HTML (15s timeout)
      ├─ Parse with Cheerio
      ├─ Extract main content
      ├─ Clean & limit to 40k chars
      └─ Return { success, content, title }
   
   b. Validate content (> 100 chars)
   
   c. Analyze content
      analyzeArticleContent(title, content, url, apiKey)
      ├─ Truncate to 15k chars
      ├─ Call OpenAI gpt-4.1-nano
      ├─ Extract structured insights
      └─ Return AnalysisResult
   
   d. Update article
      updateArticleAnalysis()
      ├─ Save full content
      ├─ Save all analysis fields
      └─ Set status: "completed"
```

**Analysis Fields Extracted**:
- `industry`: Healthcare sector (e.g., "Hospital Systems")
- `department`: Function (e.g., "Radiology")
- `aiTechnology[]`: AI techs (e.g., ["Computer Vision", "NLP"])
- `businessImpact`: ROI/value (1-2 sentences)
- `technicalDetails`: Implementation (1-2 sentences)
- `keyInsights[]`: 3-5 takeaways
- `summary`: 2-3 sentence overview
- `tags[]`: 5-7 categorization tags

---

### Stage 3: Embedding Generation
**File**: `convex/storageAction.ts`

**Purpose**: Generate vector embeddings for semantic search

**Note**: This runs **separately** from the main pipeline, either:
- Manually triggered by user in "Test Embeddings" panel
- Via batch job or scheduled task

**Flow**:
```
1. Query completed articles without embeddings
   getArticlesWithoutEmbeddings(userId)

2. For each article (5 concurrent):
   a. Combine text
      text = title + summary + keyInsights.join()
   
   b. Truncate to 5k chars
   
   c. Generate embedding
      OpenAI text-embedding-3-small
      ├─ 384 dimensions (reduced for efficiency)
      └─ Returns Array<number>
   
   d. Store embedding
      storeEmbedding(articleId, embedding)
      ├─ Links to articleId
      └─ Saves in embeddings table
```

**Concurrency**: Processes 5 articles in parallel for efficiency

---

## Component Details

### 1. Discovery Agent (`convex/discovery/agent.ts`)

**Responsibilities**:
- Orchestrate article discovery using LLM
- Manage source batching (3 sources per batch)
- Track token usage and context size
- Handle tool calling (web_fetch)
- Filter discoveries by topic and date

**Key Functions**:

#### `discoveryAgentOpenAI(sources, sinceDate, topics, apiKey, logger, progressCallback)`
- **Input**: Source list, date threshold, user topics, API key
- **Output**: `{ discoveries[], summary: { sources_checked, items_found } }`
- **LLM Model**: gpt-4o-mini (cost-effective, good at tool use)
- **Tool**: `web_fetch` - extracts articles from source pages

**Batching Strategy**:
```typescript
BATCH_SIZE = 3; // Process 3 sources per batch
// Prevents token overflow
// Allows progress tracking
// Enables partial success
```

**Iteration Control**:
```typescript
maxIterations = 15; // Prevents infinite loops
maxContextTokens = 100000; // Context window limit
MAX_TOOL_RESULT_TOKENS = 20000; // Per-tool result limit
```

---

### 2. Web Fetch Tool (`convex/discovery/tools.ts`)

**Responsibilities**:
- Fetch source URLs
- Parse HTML with Cheerio
- Extract article links and metadata
- Return structured data to LLM

**Key Functions**:

#### `webFetch(url)`
- **Input**: Source URL (RSS feed or web page)
- **Output**: JSON string with articles array
- **Timeout**: 10 seconds
- **Max Articles**: 15 per source

**Article Extraction Strategy**:
```typescript
1. Try semantic selectors:
   <article>, .post, .article, .entry
   
2. Fallback to all <a> tags:
   Filter by meaningful text (15-200 chars)
   
3. Extract for each:
   { title, url, snippet }
```

---

### 3. Content Scraper (`convex/discovery/scraper.ts`)

**Responsibilities**:
- Extract full article content
- Clean HTML (remove ads, nav, scripts)
- Find main content area
- Validate content quality

**Key Functions**:

#### `scrapeArticleContent(url)`
- **Input**: Article URL
- **Output**: `{ success, content?, title?, error? }`
- **Timeout**: 15 seconds
- **Max Content**: 40k chars

**Content Extraction Strategy**:
```typescript
Priority selectors (in order):
1. <article>
2. <main>
3. [role="main"]
4. .article-content
5. .post-content
6. .entry-content
7. .content
8. .article-body
9. Fallback: <body>

Removes: script, style, nav, header, footer, iframe, ads
Validates: Content must be > 200 chars
```

---

### 4. AI Analyzer (`convex/discovery/analyzer.ts`)

**Responsibilities**:
- Extract structured insights from content
- Categorize article by industry/department
- Identify AI technologies mentioned
- Generate business impact summary
- Extract key insights and tags

**Key Functions**:

#### `analyzeArticleContent(title, content, url, apiKey)`
- **Input**: Article metadata and full text
- **Output**: `AnalysisResult` (structured object)
- **LLM Model**: gpt-4.1-nano (lightweight, structured output)
- **Temperature**: 0.3 (consistent, factual)
- **Max Content**: 15k chars (fits in context)

**Prompt Strategy**:
- System prompt: Sets role as "AI healthcare analyst"
- JSON schema: Defines exact output structure
- Focus areas: Specific use cases, measurable outcomes, technical details
- Output: Returns only valid JSON

---

### 5. Embedding Generator (`convex/storageAction.ts`)

**Responsibilities**:
- Generate vector representations of articles
- Enable semantic similarity search
- Batch process with concurrency control

**Key Functions**:

#### `generateAndStoreEmbedding(articleId)`
- **Input**: Article ID
- **Output**: Embedding stored in DB
- **Model**: text-embedding-3-small
- **Dimensions**: 384 (reduced for efficiency vs 1536 default)

#### `batchGenerateEmbeddings(userId, limit)`
- **Concurrency**: 5 simultaneous embeddings
- **User Isolated**: Only processes user's articles
- **Batch Size**: 20 articles per run (default)

**Text Preparation**:
```typescript
const textToEmbed = `${title}\n\n${summary}\n\n${keyInsights.join("\n")}`;
// Combines most relevant text
// Limits to 5k chars before embedding
```

---

## Data Flow

### Complete Pipeline Data Transformations

```
1. USER INPUT (Sources + Topics)
   ↓
   [{ name: "BCG", url: "https://...", type: "web" }]
   [topics: ["AI in Radiology", "Machine Learning"]]

2. DISCOVERY AGENT OUTPUT
   ↓
   [{ url: "https://article1.com", title: "...", published: "2025-10-19", source: "BCG" }]

3. ARTICLE STUBS IN DB
   ↓
   articles table:
   { _id, userId, title, articleUrl, status: "pending", content: "" }

4. SCRAPER OUTPUT
   ↓
   { success: true, content: "Full article text...", title: "..." }

5. ANALYZER OUTPUT
   ↓
   {
     industry: "Hospital Systems",
     department: "Radiology",
     aiTechnology: ["Computer Vision", "Deep Learning"],
     businessImpact: "Reduces diagnosis time by 40%",
     technicalDetails: "Uses ResNet-50 CNN architecture",
     keyInsights: ["Insight 1", "Insight 2", "Insight 3"],
     summary: "Article summary...",
     tags: ["radiology", "AI", "diagnostics", "CNN", "computer-vision"]
   }

6. UPDATED ARTICLE IN DB
   ↓
   articles table:
   { _id, userId, title, content: "full text", status: "completed", ...analysis fields }

7. EMBEDDING OUTPUT
   ↓
   embeddings table:
   { articleId, embedding: [0.123, -0.456, ...], embeddingModel: "text-embedding-3-small" }

8. USER FEED DISPLAY
   ↓
   Articles with full metadata, searchable by:
   - Text search (full-text index)
   - Semantic search (vector similarity)
   - Filters (source, tags, date)
```

---

## User Isolation

**Critical Security Feature**: Every article, embedding, and pipeline run is isolated per user.

### Implementation

**1. Article Creation**:
```typescript
await ctx.db.insert("articles", {
  userId: args.userId, // REQUIRED field
  title: discovery.title,
  // ... other fields
});
```

**2. Queries Always Filter by User**:
```typescript
const articles = await ctx.db
  .query("articles")
  .withIndex("by_user_and_status", (q) => 
    q.eq("userId", userId).eq("analysisStatus", "completed")
  )
  .collect();
```

**3. Embeddings Linked to User's Articles**:
```typescript
// Embedding references articleId
// Article has userId
// Therefore: embedding is user-isolated via article
```

**4. Discovery Runs Tracked Per User**:
```typescript
discoveryRuns table: { userId, startedAt, status, ... }
```

### Benefits
- ✅ Privacy: Users never see each other's articles
- ✅ Customization: Each user has their own sources/topics
- ✅ Scalability: No cross-user contamination
- ✅ Security: Authorization checks at every query

---

## Error Handling

### Pipeline-Level Error Handling

**Graceful Degradation**: Individual failures don't break the entire pipeline.

```typescript
try {
  await runDiscoveryForUser(ctx, user._id);
} catch (error) {
  console.error(`Failed for user ${user._id}:`, error);
  // Continue to next user
}
```

### Stage-Level Error Handling

**1. Discovery Stage**:
- Source fetch timeout → Skip source, continue
- LLM failure → Retry once, then fail gracefully
- Tool call timeout → Return empty array

**2. Scraping Stage**:
- HTTP errors → Mark as failed, continue to next article
- Insufficient content → Skip, log warning
- Parse errors → Skip, log error

**3. Analysis Stage**:
- LLM timeout → Retry once
- JSON parse error → Use fallback values
- Missing API key → Fail with clear message

**4. Embedding Stage**:
- Embedding failure → Skip article, continue batch
- API rate limit → Exponential backoff
- Concurrent processing → Promise.allSettled() catches individual failures

### Activity Logging

Every stage logs to `activityEvents` table:
```typescript
await ctx.runMutation(internal.activityFeed.logActivity, {
  userId,
  runId,
  stage: "scraping",
  eventType: "error",
  message: `❌ Failed to process: ${article.title}`,
  metadata: {
    articleId: article._id,
    errorMessage: error.message,
  },
});
```

### Cancellation Handling

Users can cancel running pipelines:
```typescript
// Check before each major phase
const isCancelled = await ctx.runQuery(internal.state.isRunCancelled, { runId });
if (isCancelled) {
  // Save partial results
  // Update run status to "cancelled"
  return;
}
```

---

## Debugging Guide

### Viewing Pipeline Logs

**1. Live Discovery Tab** (Recommended):
- Real-time activity feed
- Enable "Debug Mode" for full LLM logs
- Shows: prompts, responses, tool calls, errors

**2. Convex Dashboard**:
- Go to https://dashboard.convex.dev
- Select deployment
- View Logs tab
- Filter by function: `discoveryAction:runDiscoveryPipeline`

**3. Terminal Output** (Development):
```bash
# Pipeline logs appear in terminal where npm run dev is running
# Look for emoji prefixes: 🔍 📊 ✅ ❌ ⚠️
```

### Common Issues & Solutions

**Problem**: "No sources configured"
```
Solution: User hasn't added sources yet
Check: Go to Sources tab → Add RSS feeds or web URLs
```

**Problem**: "OpenAI API key not configured"
```
Solution: User hasn't set up API key
Check: Settings → Add OpenAI API key
```

**Problem**: "Insufficient content" warnings
```
Reason: Scraper couldn't extract enough text (< 100 chars)
Possible causes:
  - Site requires JavaScript
  - Paywall or login wall
  - Content loaded dynamically
  - Anti-scraping protection
Solution: Add RSS feed instead of direct web scraping
```

**Problem**: Articles found but all "already seen"
```
Reason: Articles were discovered in previous run
Check: state.seenUrls table for userId
Clear: Delete seenUrls for user (via data management)
```

**Problem**: Discovery finds 0 articles
```
Possible causes:
  1. No new articles published since last check
  2. LLM filtered out articles (not matching topics)
  3. Source URL is incorrect
  4. Source structure changed
Solution: Check source URL manually in browser
```

### Debugging Tools

**1. Article Stats Query**:
```typescript
// In Convex dashboard or client:
await client.query(api.articles.getArticleStats);
// Returns: { total, pending, analyzing, completed, failed, noStatus }
```

**2. Discovery Run History**:
```typescript
await client.query(api.state.getRecentRuns);
// Returns: Last 10 runs with metrics
```

**3. Debug Feed Query**:
```typescript
await client.query(api.articles.debugFeed);
// Returns: User prefs, article counts, tag breakdown
```

### Monitoring Metrics

Track these metrics for health:
- **Discovery Rate**: Articles found per run
- **Scraping Success**: % of articles successfully scraped
- **Analysis Success**: % of scraped articles analyzed
- **Embedding Coverage**: % of completed articles with embeddings
- **Average Run Time**: How long pipeline takes

---

## Extension Points

### Adding a New Source Type

Currently supports: RSS feeds, web pages

**To add email newsletters, APIs, etc:**

1. **Add source type to schema**:
```typescript
// convex/schema.ts
customSources: v.array(v.object({
  url: v.string(),
  name: v.string(),
  type: v.union(v.literal("web"), v.literal("rss"), v.literal("api")), // ← Add new type
  status: v.union(v.literal("active"), v.literal("muted"), v.literal("failed")),
}))
```

2. **Create new tool**:
```typescript
// convex/discovery/tools.ts
export async function apiFetch(apiUrl: string, apiKey: string) {
  // Fetch from API
  // Transform to standard format
  return articles;
}
```

3. **Update agent to use new tool**:
```typescript
// convex/discovery/agent.ts
const tools = [
  webFetchToolDefinition,
  apiFetchToolDefinition, // ← Add new tool
];
```

### Adding New Analysis Fields

**To extract additional insights:**

1. **Update schema**:
```typescript
// convex/schema.ts
articles: defineTable({
  // ... existing fields
  clinicalTrialPhase: v.optional(v.string()), // ← New field
  regulatoryStatus: v.optional(v.string()),   // ← New field
})
```

2. **Update analyzer prompt**:
```typescript
// convex/discovery/analyzer.ts
const prompt = `Extract:
{
  // ... existing fields
  "clinicalTrialPhase": "Phase I/II/III or N/A",
  "regulatoryStatus": "FDA approved/pending/experimental"
}`;
```

3. **Update TypeScript types**:
```typescript
interface AnalysisResult {
  // ... existing
  clinicalTrialPhase?: string;
  regulatoryStatus?: string;
}
```

### Switching LLM Providers

**To use Claude, Gemini, or local models:**

1. **Add provider to settings**:
```typescript
// convex/schema.ts
preferredProvider: v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("gemini") // ← New
)
```

2. **Create provider adapter**:
```typescript
// convex/discovery/llm-adapters.ts
export async function callLLM(provider, model, messages, tools) {
  switch(provider) {
    case "openai": return callOpenAI(...);
    case "anthropic": return callAnthropic(...);
    case "gemini": return callGemini(...);
  }
}
```

3. **Update agent to use adapter**:
```typescript
// convex/discovery/agent.ts
const response = await callLLM(
  userSettings.preferredProvider,
  "discovery-model",
  messages,
  tools
);
```

### Adding Custom Filters

**To filter articles by custom criteria:**

1. **Add filter to analysis**:
```typescript
// convex/discovery/analyzer.ts
{
  "isResearchPaper": true/false,
  "hasCodeSamples": true/false,
  "industryRelevance": 1-10
}
```

2. **Add to schema**:
```typescript
isResearchPaper: v.optional(v.boolean()),
industryRelevance: v.optional(v.number()),
```

3. **Add filter to frontend**:
```typescript
// src/Feed.tsx
<select onChange={(e) => setFilter(e.target.value)}>
  <option value="all">All Articles</option>
  <option value="research">Research Papers Only</option>
  <option value="high-relevance">High Relevance (8+)</option>
</select>
```

---

## Performance & Optimization

### Current Performance Characteristics

**Discovery Phase**:
- Time: ~5-30 seconds per batch of 3 sources
- LLM Calls: 2-15 iterations per batch
- Token Usage: 200-5000 tokens per iteration
- Bottleneck: Network I/O (web fetches)

**Scraping Phase**:
- Time: ~2-5 seconds per article
- Sequential processing (one at a time)
- Bottleneck: Network I/O + HTML parsing

**Analysis Phase**:
- Time: ~3-8 seconds per article
- LLM Model: gpt-4.1-nano (fast, cheap)
- Bottleneck: LLM API latency

**Embedding Phase**:
- Time: ~1-2 seconds per article
- Concurrency: 5 articles in parallel
- Bottleneck: OpenAI embedding API

### Optimization Strategies

**1. Increase Source Batch Size**:
```typescript
// convex/discovery/agent.ts
const BATCH_SIZE = 5; // Increase from 3 to 5
// Trade-off: Higher token usage, but faster overall
```

**2. Parallel Scraping**:
```typescript
// convex/scrapingAction.ts
const CONCURRENCY = 3; // Process 3 articles at once
for (let i = 0; i < articles.length; i += CONCURRENCY) {
  const batch = articles.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(article => scrapeAndAnalyze(article)));
}
```

**3. Cache Frequently Accessed Sources**:
```typescript
// Cache web_fetch results for 1 hour
const cacheKey = `source:${url}:${dateHash}`;
const cached = await getCacheOrFetch(cacheKey, () => webFetch(url));
```

**4. Reduce Embedding Dimensions**:
```typescript
// Already optimized: 384 dims (vs 1536 default)
// Could go lower: 256 dims for even faster search
// Trade-off: Slightly lower search quality
```

**5. Batch Database Operations**:
```typescript
// Instead of:
for (const article of articles) {
  await ctx.db.insert("articles", article);
}

// Use Promise.all:
await Promise.all(
  articles.map(article => ctx.db.insert("articles", article))
);
```

### Scaling Considerations

**Current Limits**:
- ✅ Handles 10-20 sources per user easily
- ✅ Processes 50-100 articles per run comfortably
- ⚠️ May slow with > 100 sources per user
- ⚠️ Embedding generation can be slow for 1000+ articles

**Recommendations for Scale**:
1. Implement source priority (check high-value sources first)
2. Add rate limiting to respect source server limits
3. Distribute embedding generation across multiple runs
4. Consider using Convex scheduled functions for continuous background processing

---

## Appendix: File Reference

### Core Pipeline Files
| File | Purpose | Runtime |
|------|---------|---------|
| `convex/discoveryAction.ts` | Main orchestrator | Node.js Action |
| `convex/scrapingAction.ts` | Scraping coordinator | Node.js Action |
| `convex/storageAction.ts` | Embedding generator | Node.js Action |
| `convex/manualTriggers.ts` | User-triggered entry points | V8 Action |

### Discovery Components
| File | Purpose | Runtime |
|------|---------|---------|
| `convex/discovery/agent.ts` | Agentic discovery logic | Node.js (imported) |
| `convex/discovery/tools.ts` | Web scraping tools | Node.js (imported) |
| `convex/discovery/scraper.ts` | Content extraction | Node.js (imported) |
| `convex/discovery/analyzer.ts` | AI analysis | Node.js (imported) |

### Data Layer
| File | Purpose | Runtime |
|------|---------|---------|
| `convex/articles.ts` | Article CRUD + queries | V8 Query/Mutation |
| `convex/state.ts` | Pipeline state tracking | V8 Query/Mutation |
| `convex/activityFeed.ts` | Event logging | V8 Query/Mutation |
| `convex/schema.ts` | Database schema | Schema Definition |

### Frontend
| File | Purpose |
|------|---------|
| `src/LiveDiscovery.tsx` | Pipeline monitoring UI + Start button |
| `src/AdminPanel.tsx` | Manual triggers (Run Discovery button) |
| `src/SourceManagement.tsx` | Source management |
| `src/DiscoveryStatus.tsx` | Status widget |
| `src/Feed.tsx` | Article display |
| `src/Search.tsx` | Search interface |

**Note**: The Sources tab displays DiscoveryStatus + AdminPanel + SourceManagement together

---

## Version History

- **v1.0** (2025-10-19): Initial pipeline documentation
  - Complete architecture overview
  - All 3 pipeline stages documented
  - User isolation explained
  - Debugging guide added
  - Extension points defined

---

**Questions or Issues?**

For pipeline-related questions, check:
1. This documentation
2. Inline code comments in `convex/discoveryAction.ts`
3. Activity logs in Live Discovery tab
4. Convex dashboard logs

**Contributing**: When modifying the pipeline, please update this documentation to reflect changes.

