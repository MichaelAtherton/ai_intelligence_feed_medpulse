# Discovery System

This directory contains the core discovery agents responsible for finding, scraping, and analyzing AI healthcare articles from configured sources.

## Architecture Overview

The discovery system uses an AI-powered agent architecture to automatically discover relevant articles, scrape their content, and extract structured insights.

### Pipeline Flow

```
User Sources → Discovery Agent → Article Links → Deduplication → Scraping → Analysis → Storage
```

## Core Components

### [agent.ts](agent.ts)
**OpenAI-Powered Discovery Agent**

Main agent that orchestrates the discovery of article links from configured sources.

- **Model**: GPT-4o-mini (default, configurable)
- **Batching**: Processes sources in batches of 3 to avoid token limits
- **Iteration Limits**: Max 15 iterations per batch
- **Token Management**:
  - Context limit: 100k tokens
  - Tool results truncated to 20k tokens max
  - Automatic message history truncation when needed
- **Tool Calling**: Uses `web_fetch` tool to retrieve article links from sources

**Key Functions**:

`discoveryAgentOpenAI(sources, sinceDate, topics, apiKey?, model?, logger?, progressCallback?)`

**Parameters**:
- `sources: Source[]` - Array of source objects `{ name: string, url: string, type: string }`
- `sinceDate: Date` - Only find articles published after this date
- `topics: string[]` - Array of topic strings to filter articles by
- `apiKey?: string` - Optional OpenAI API key (falls back to env)
- `model?: string` - Optional model override (default: "gpt-4o-mini")
- `logger?: (data: any) => Promise<void>` - Optional logging callback
- `progressCallback?: (current: number, total: number, sourceName: string) => Promise<void>` - Optional progress tracking

**Returns**:
```typescript
{
  discoveries: [
    { url: string, title: string, published: string, source: string }
  ],
  summary: {
    sources_checked: number,
    items_found: number
  }
}
```

### [tools.ts](tools.ts)
**Web Fetching Tool**

Provides the `web_fetch` tool used by the discovery agent to extract article links from source URLs.

**Function**:

`webFetch(url: string): Promise<string>`

**Parameters**:
- `url: string` - Single source URL to scrape for article links

- **Service**: Railway Crawl4AI at `/v1/discover` endpoint
- **Selectors**: Matches article URLs using patterns:
  - `/fullarticle/` - JAMA full articles
  - `/article/` - Generic articles
  - `/news/` - News items
  - `/blog/` - Blog posts
- **Filters**:
  - Min text length: 5 chars
  - Max links: 100
  - Same-domain only (no external links)
- **Timeout**: 60s scraping + 10s buffer = 70s total

**Tool Definition**:
```typescript
{
  type: "function",
  function: {
    name: "web_fetch",
    description: "Fetch and extract article links from a URL",
    parameters: { url: string }
  }
}
```

**Output Format**:
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

### [scraper.ts](scraper.ts)
**Article Content Scraper**

Scrapes full article content from discovered URLs.

**Function**:

`scrapeArticleContent(url: string): Promise<{ success: boolean, content?: string, title?: string, error?: string }>`

**Parameters**:
- `url: string` - Single article URL to scrape

- **Service**: Railway Crawl4AI at `/v1/scrape` endpoint
- **Content Format**: Markdown
- **Content Limits**:
  - Min: 200 chars
  - Max: 40,000 chars
- **Extraction**:
  - Title with meta tag fallback
  - Main content with ad/nav removal
  - Whitespace normalization
- **Timeout**: 60s scraping + 10s buffer = 70s total

### [analyzer.ts](analyzer.ts)
**Content Analyzer**

Extracts structured insights from scraped article content using AI.

**Function**:

`analyzeArticleContent(title: string, content: string, url: string, apiKey?: string, model?: string): Promise<AnalysisResult>`

**Parameters**:
- `title: string` - Article title
- `content: string` - Article content (markdown or plain text)
- `url: string` - Article URL (for reference)
- `apiKey?: string` - Optional OpenAI API key (falls back to env)
- `model?: string` - Optional model override (default: "gpt-4.1-nano")

**Configuration**:
- **Temperature**: 0.3 (deterministic)
- **Content Limit**: First 15k chars (truncated if longer)

**Output Structure**:
```typescript
{
  industry: string,              // e.g., "Hospital Systems", "Pharmaceuticals"
  department: string,            // e.g., "Radiology", "Oncology"
  aiTechnology: string[],        // e.g., ["Computer Vision", "Deep Learning"]
  businessImpact: string,        // 1-2 sentences
  technicalDetails: string,      // 1-2 sentences
  keyInsights: string[],         // 3-5 key takeaways
  summary: string,               // 2-3 sentence summary
  tags: string[]                 // 5-7 categorization tags
}
```

## Integration

### Used by [discoveryAction.ts](../discoveryAction.ts)

The main discovery action orchestrates these components:

1. **Load Configuration**: Get user sources, topics, and API keys
2. **Run Discovery**: Call `discoveryAgentOpenAI()` to find articles
3. **Deduplication**: Check against previously seen URLs
4. **Queue Articles**: Add new discoveries to article database
5. **Scrape Content**: Call `scrapeArticleContent()` for each article
6. **Analyze Content**: Call `analyzeArticleContent()` to extract insights
7. **Store Results**: Save analyzed articles with metadata

### User Isolation

Discovery runs are user-isolated:
- Manual triggers via `runDiscoveryForCurrentUser` (requires auth)
- Automated via `runDiscoveryPipelineForAllUsers` (processes each user separately)
- Each user has their own sources, topics, and seen URLs

## Environment Variables

```bash
# Railway Crawl4AI Scraper Service
SCRAPER_SERVICE_URL=https://aiintelligencefeedmedpulse-production.up.railway.app

# OpenAI API (fallback if user doesn't provide their own)
CONVEX_OPENAI_BASE_URL=<optional>
CONVEX_OPENAI_API_KEY=<required-if-no-user-key>
```

## Token Usage & Costs

### Discovery Agent (per batch of 3 sources)
- **Model**: gpt-4o-mini
- **Estimated**: 10k-50k tokens per batch
- **Tool calls**: 3-9 web_fetch calls (1-3 per source)
- **Iterations**: Typically 3-5 iterations

### Content Analyzer (per article)
- **Model**: gpt-4.1-nano
- **Estimated**: 3k-8k tokens per article
- **One-shot**: Single API call per article

## Error Handling

All components include comprehensive error handling:

- **Network timeouts**: 60-70s limits with AbortSignal
- **Invalid responses**: JSON parsing with fallbacks
- **Empty content**: Minimum content length validation
- **Token limits**: Automatic truncation and context management
- **Service failures**: Graceful degradation with error messages

## Logging & Monitoring

The system includes detailed logging:

- **Console logs**: All major operations and decisions
- **Activity feed**: User-visible progress tracking
- **LLM logging**: Request/response tracking for debugging
- **Token counting**: Accurate token estimation for cost tracking

## Testing

Run the test suite:

```bash
npm run test:discovery
```

Test file: [tests/test-discovery-agent.ts](../../tests/test-discovery-agent.ts)

## Common Issues & Troubleshooting

### No articles found
- Check if sources are accessible
- Verify URL patterns match article structure
- Review discovery agent prompts and topics

### Scraping failures
- Verify Railway service is running
- Check timeout settings
- Ensure JavaScript rendering is enabled for dynamic sites

### Token limit errors
- Reduce batch size (currently 3)
- Adjust MAX_TOOL_RESULT_TOKENS (currently 20k)
- Shorten content truncation limit (currently 15k)

### Analysis quality issues
- Adjust analyzer temperature (currently 0.3)
- Improve prompt engineering in analyzer
- Switch to more capable model (e.g., gpt-4o)

## Future Improvements

- [ ] Support for RSS/Atom feed sources
- [ ] PDF article scraping and analysis
- [ ] Multi-language support
- [ ] Relevance scoring and filtering
- [ ] Duplicate detection using embeddings
- [ ] Incremental updates (delta discovery)
- [ ] Source health monitoring
- [ ] Rate limiting and retry logic
