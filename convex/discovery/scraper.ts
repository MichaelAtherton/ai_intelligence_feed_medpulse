"use node";

// Railway Crawl4AI Scraper Service
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'https://aiintelligencefeedmedpulse-production.up.railway.app';

export async function scrapeArticleContent(url: string): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
}> {
  try {
    console.log(`[SCRAPER] Calling Railway Crawl4AI service for: ${url}`);

    const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, title: '' }),
      signal: AbortSignal.timeout(60000), // 60s timeout for Crawl4AI
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Railway scraper HTTP ${response.status} - ${response.statusText}`,
      };
    }

    const result = await response.json();

    console.log(`[SCRAPER] Railway result: success=${result.success}, contentLength=${result.content_length}`);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Railway scraper returned success=false',
      };
    }

    if (!result.content || result.content.length < 200) {
      return {
        success: false,
        error: `Insufficient content extracted (${result.content?.length || 0} chars)`,
      };
    }

    console.log(`[SCRAPER] SUCCESS: Extracted ${result.content.length} chars via Railway Crawl4AI`);

    return {
      success: true,
      content: result.content,
      title: result.title || '',
    };
  } catch (error) {
    console.error(`[SCRAPER] Railway Crawl4AI error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calling Railway scraper',
    };
  }
}
