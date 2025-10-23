# AI Health Feed

A personalized intelligence platform for healthcare professionals to stay current on AI developments. Get curated, analyzed articles from your custom sources with AI-powered summaries, semantic search, and trend analysis.

## Core Features

- **Personalized Feed**: AI-analyzed articles from your custom sources
- **Smart Bookmarking**: Save articles with custom notes and tags
- **Advanced Search**: Full-text and AI semantic search
- **Daily Summaries**: AI-generated thematic summaries
- **Trend Analysis**: Identify emerging patterns across articles
- **Chat Interface**: Ask questions about your article collection
- **Dark Mode**: Full theme support

## Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Convex Auth (username/password)
- **AI**: OpenAI (GPT-4.1-nano, text-embedding-3-small) or Anthropic
- **Scraping**: Cheerio + Mozilla Readability + JSDOM
- **Vector Search**: Convex vector indexes (384 dimensions)

## Getting Started

### 1. Sign Up & Onboarding
- Create account with username/password
- Select healthcare AI topics
- Add custom RSS feeds or web sources

### 2. Configure AI (Optional)
- Go to Settings to choose AI provider
- Add your OpenAI or Anthropic API key
- Or use built-in Convex AI (limited free tier)

### 3. Discovery & Analysis
- System checks sources twice daily (9 AM, 9 PM)
- Articles are scraped and AI-analyzed
- Manual trigger available in Sources tab

### 4. Using the Feed
- Browse AI-analyzed articles
- Bookmark with notes and tags
- Generate daily summaries
- Run trend analysis

### 5. Search & Chat
- Full-text search with filters
- AI semantic search (finds by meaning)
- Chat with your article collection

## Architecture

### Data Flow
1. **Discovery Agent**: Runs twice daily to check user sources
2. **Scraper**: Extracts content from RSS feeds and web pages
3. **Analyzer**: AI extracts insights and categorizes
4. **Embeddings**: Generates vectors for semantic search
5. **Feed**: Displays analyzed articles filtered by preferences

### AI Features
- **Analysis**: Extracts industry, department, technologies, insights
- **Summaries**: Daily thematic summaries of articles
- **Trends**: Identifies patterns and inflection points
- **Semantic Search**: Vector-based similarity search
- **Chat**: RAG-based Q&A over article collection

## User Isolation

Each user has a completely isolated experience:
- **Private Articles**: Scraped per-user from custom sources
- **Private Bookmarks**: Notes and tags are user-specific
- **Private Embeddings**: Vector embeddings per-user
- **Private Summaries**: Daily summaries and trends per-user
- **Private Chat**: Conversations reference only user's articles

## Semantic Search

Uses vector embeddings to find articles by meaning:
1. Generate embeddings in Test Embeddings panel
2. Enable "AI Semantic Search" in Search tab
3. Enter natural language queries
4. Get results ranked by semantic similarity

Example queries:
- "AI for cancer detection"
- "machine learning in radiology"
- "natural language processing for medical records"

## AI Providers

**Convex AI (Default)**: Free tier, gpt-4.1-nano
**OpenAI**: Add API key, gpt-4o-mini + embeddings
**Anthropic**: Add API key, Claude Sonnet

## Development

```bash
npm install
npm run dev
```

## Success Metrics

✅ Onboarding <3 min | ✅ AI analysis | ✅ Semantic search | ✅ Daily summaries
