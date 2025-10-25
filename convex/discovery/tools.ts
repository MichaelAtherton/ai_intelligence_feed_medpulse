"use node";

// Railway Crawl4AI Scraper Service
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'https://aiintelligencefeedmedpulse-production.up.railway.app';

export async function webFetch(url: string): Promise<string> {
  try {
    console.log(`[WEB_FETCH] Calling Railway Crawl4AI /v1/discover for: ${url}`);

    // Use new OpenAPI-compliant /v1/discover endpoint
    // This configuration works for medical article sites
    const requestBody = {
      url,
      selectors: {
        // Match article-like URLs using regex patterns
        urlPatterns: [
          "/fullarticle/",     // JAMA full articles
          "/article/",          // Generic article URLs
          "/articles/",         // Plural form
          "/news/",             // News items
          "/blog/",             // Blog posts
          "/post/",             // Post URLs
        ]
      },
      filters: {
        minTextLength: 5,     // Require at least some text in the link
        maxLinks: 100,        // Limit to 100 links
        includeExternal: false // Only same-domain links
      },
      options: {
        timeout: 60000,       // 60s timeout
        executeJs: true       // Enable JavaScript rendering
      }
    };

    const response = await fetch(`${SCRAPER_SERVICE_URL}/v1/discover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(70000), // 70s timeout (10s buffer)
    });

    if (!response.ok) {
      const errorMsg = `Error: Railway Crawl4AI HTTP ${response.status} - ${response.statusText}`;
      console.error(`[WEB_FETCH] ${errorMsg}`);
      return errorMsg;
    }

    const result = await response.json();

    console.log(`[WEB_FETCH] Railway result: success=${result.success}, linksFound=${result.linksFound || 0}`);

    if (!result.success) {
      const errorMsg = `Error: Railway Crawl4AI failed - ${result.error || 'Unknown error'}`;
      console.error(`[WEB_FETCH] ${errorMsg}`);
      return errorMsg;
    }

    // Transform new response format to match what the discovery agent expects
    const articles = (result.links || []).map((link: any) => ({
      title: link.text || '[No title]',
      url: link.url,
      snippet: link.context || link.text || ''
    }));

    console.log(`[WEB_FETCH] Transformed ${articles.length} links into article format`);

    // Return in the same format expected by the discovery agent
    return JSON.stringify({
      url,
      articles,
      count: articles.length
    }, null, 2);
  } catch (error) {
    const errorMsg = error instanceof Error
      ? `Error fetching ${url}: ${error.message}`
      : `Error fetching ${url}: Unknown error`;
    console.error(`[WEB_FETCH] ${errorMsg}`);
    return errorMsg;
  }
}

export const webFetchToolDefinition = {
  type: "function" as const,
  function: {
    name: "web_fetch",
    description: "Fetch and extract article links from a URL",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch content from",
        },
      },
      required: ["url"],
    },
  },
};
