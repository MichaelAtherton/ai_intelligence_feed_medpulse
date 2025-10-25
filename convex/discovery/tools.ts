"use node";

// Railway Crawl4AI Scraper Service
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'https://aiintelligencefeedmedpulse-production.up.railway.app';

export async function webFetch(url: string): Promise<string> {
  try {
    console.log(`[WEB_FETCH] Calling Railway Crawl4AI /fetch for: ${url}`);

    const response = await fetch(`${SCRAPER_SERVICE_URL}/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(60000), // 60s timeout for Crawl4AI
    });

    if (!response.ok) {
      const errorMsg = `Error: Railway Crawl4AI HTTP ${response.status} - ${response.statusText}`;
      console.error(`[WEB_FETCH] ${errorMsg}`);
      return errorMsg;
    }

    const result = await response.json();

    console.log(`[WEB_FETCH] Railway result: success=${result.success}, articles=${result.articles?.length || 0}`);

    if (!result.success) {
      const errorMsg = `Error: Railway Crawl4AI failed - ${result.error || 'Unknown error'}`;
      console.error(`[WEB_FETCH] ${errorMsg}`);
      return errorMsg;
    }

    // Return in the same format expected by the discovery agent
    return JSON.stringify({
      url,
      articles: result.articles || [],
      count: result.articles?.length || 0
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
