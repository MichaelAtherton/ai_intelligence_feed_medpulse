# Discovery Component Testing

This directory contains standalone test scripts for each functional component of the discovery pipeline. Each test script can be run independently to verify that component works correctly in isolation.

## Purpose

The discovery system is a multi-stage pipeline. Testing each component individually allows us to:

- **Debug in isolation** - Identify exactly which step is failing
- **Verify external services** - Ensure Railway Crawl4AI is responding correctly
- **Inspect data flow** - See what data passes between components
- **Test without infrastructure** - Run tests without the full Convex action system
- **Human-readable output** - Print results to console for manual inspection

## Functional Components Breakdown

The discovery pipeline consists of 4 main functional components that can be tested independently:

### Component 1: Link Discovery (`tools.ts` → `webFetch`)

**Purpose**: Find article links on a source webpage

**Input**:
- Single source URL (e.g., `https://jamanetwork.com/channels/medical-news`)

**Process**:
- Calls Railway Crawl4AI `/v1/discover` endpoint
- Extracts links matching article patterns (`/fullarticle/`, `/article/`, `/news/`, etc.)
- Filters for same-domain, minimum text length, max 100 links

**Output**:
- JSON string containing array of article objects:
```json
{
  "url": "https://source.com",
  "articles": [
    {
      "title": "Article Title",
      "url": "https://source.com/article/123",
      "snippet": "Context text"
    }
  ],
  "count": 10
}
```

**Test Script**: `test-link-discovery.ts`
- Pass 1-2 test source URLs
- Print the article links found on each page
- Verify Railway service is accessible

---

### Component 2: Content Scraping (`scraper.ts` → `scrapeArticleContent`)

**Purpose**: Scrape full article content from a discovered article URL

**Input**:
- Single article URL (e.g., `https://jamanetwork.com/fullarticle/123456`)

**Process**:
- Calls Railway Crawl4AI `/v1/scrape` endpoint
- Extracts title and main content as markdown
- Removes ads, navigation, social sharing elements
- Validates minimum content length (200 chars)

**Output**:
```typescript
{
  success: boolean,
  content?: string,     // Markdown content
  title?: string,
  error?: string
}
```

**Test Script**: `test-content-scraper.ts`
- Use an article URL from Component 1's output
- Print article title
- Print first 500 characters of content
- Verify content quality and length

---

### Component 3: Content Analysis (`analyzer.ts` → `analyzeArticleContent`)

**Purpose**: Extract structured insights from article content using AI

**Input**:
- `title: string` - Article title
- `content: string` - Article content (markdown or plain text)
- `url: string` - Article URL (for reference)
- `apiKey?: string` - Optional OpenAI API key
- `model?: string` - Optional model override (default: "gpt-4.1-nano")

**Process**:
- Truncates content to first 15k chars if needed
- Calls OpenAI to extract structured information
- Parses JSON response with validation

**Output**:
```typescript
{
  industry: string,              // e.g., "Hospital Systems"
  department: string,            // e.g., "Radiology"
  aiTechnology: string[],        // e.g., ["Computer Vision", "Deep Learning"]
  businessImpact: string,        // 1-2 sentences
  technicalDetails: string,      // 1-2 sentences
  keyInsights: string[],         // 3-5 key takeaways
  summary: string,               // 2-3 sentence summary
  tags: string[]                 // 5-7 categorization tags
}
```

**Test Script**: `test-content-analyzer.ts`
- Use title + content from Component 2's output
- Print structured analysis in readable format
- Verify all fields are populated correctly

---

### Component 4: Full Discovery Agent (`agent.ts` → `discoveryAgentOpenAI`)

**Purpose**: Orchestrate discovery of articles from multiple sources using AI agent with tool calling

**Input**:
- `sources: Source[]` - Array of `{ name: string, url: string, type: string }`
- `sinceDate: Date` - Only find articles published after this date
- `topics: string[]` - Array of topic strings to filter articles by
- `apiKey?: string` - Optional OpenAI API key
- `model?: string` - Optional model override (default: "gpt-4o-mini")
- `logger?: (data: any) => Promise<void>` - Optional logging callback
- `progressCallback?: (current: number, total: number, sourceName: string) => Promise<void>`

**Process**:
- Batches sources (3 at a time) to avoid token limits
- Uses OpenAI function calling with `web_fetch` tool
- LLM decides which sources to fetch and filters results by topics/date
- Iterates up to 15 times or until completion

**Output**:
```typescript
{
  discoveries: [
    {
      url: string,
      title: string,
      published: string,      // YYYY-MM-DD format
      source: string
    }
  ],
  summary: {
    sources_checked: number,
    items_found: number
  }
}
```

**Test Script**: `test-discovery-agent.ts` (already exists)
- Pass 1-2 test sources with topics
- Print discovered articles with metadata
- Verify agent's tool calling and filtering logic

---

## Testing Workflow

The recommended testing order:

1. **Start with Component 1** (Link Discovery)
   - Verify Railway service is accessible
   - Confirm source URLs return article links
   - Identify good test URLs for subsequent tests

2. **Test Component 2** (Content Scraping)
   - Use article URLs from Component 1
   - Verify content extraction quality
   - Check markdown formatting

3. **Test Component 3** (Content Analysis)
   - Use content from Component 2
   - Verify OpenAI API key works
   - Check analysis quality and structure

4. **Test Component 4** (Full Agent)
   - Verify end-to-end orchestration
   - Check batching and tool calling
   - Validate filtering by topics and dates

## Running Tests

Each test script is a standalone TypeScript file that can be run with Node:

```bash
# Component 1: Link Discovery
npx tsx convex/discovery/tests/test-link-discovery.ts

# Component 2: Content Scraping
npx tsx convex/discovery/tests/test-content-scraper.ts

# Component 3: Content Analysis
npx tsx convex/discovery/tests/test-content-analyzer.ts

# Component 4: Full Discovery Agent (already exists)
npx tsx tests/test-discovery-agent.ts
```

## Environment Variables Required

```bash
# Railway Crawl4AI Scraper Service (required for Components 1 & 2)
SCRAPER_SERVICE_URL=https://aiintelligencefeedmedpulse-production.up.railway.app

# OpenAI API (required for Components 3 & 4)
CONVEX_OPENAI_API_KEY=sk-...
# OR
# You can pass your own API key as a parameter to the test functions
```

## Expected Output Format

Each test script should print:

1. **Test configuration** - What inputs are being tested
2. **Process logs** - What's happening during execution
3. **Results** - The output in human-readable format
4. **Summary** - Success/failure status and key metrics

Example output format:
```
🧪 Testing Link Discovery

📋 Test Configuration:
   Source URL: https://jamanetwork.com/channels/medical-news

🚀 Fetching article links...

✅ SUCCESS
📊 Found 15 article links

📄 Sample Articles (first 5):
1. AI Tool Improves Diagnostic Accuracy
   URL: https://jamanetwork.com/fullarticle/123456
   Snippet: New machine learning model...

2. ...
```

## Troubleshooting

### Component 1 Failures
- Verify `SCRAPER_SERVICE_URL` is set correctly
- Check if Railway service is running: `curl https://aiintelligencefeedmedpulse-production.up.railway.app/health`
- Try different source URLs
- Check network/firewall issues

### Component 2 Failures
- Ensure article URLs are valid and accessible
- Some sites may block scraping (403/429 errors)
- Check timeout settings (currently 70s)
- Verify content length requirements (min 200 chars)

### Component 3 Failures
- Verify `CONVEX_OPENAI_API_KEY` is set
- Check OpenAI API quota and rate limits
- Ensure content isn't empty or malformed
- Try different model if needed

### Component 4 Failures
- All of the above
- Check token limits (100k context, 20k tool results)
- Verify topics and date filtering logic
- Review agent iteration limits (max 15)

## Next Steps

After all component tests pass:
1. Run integration test with the full pipeline
2. Test with user-specific configuration
3. Monitor token usage and costs
4. Set up automated regression testing
