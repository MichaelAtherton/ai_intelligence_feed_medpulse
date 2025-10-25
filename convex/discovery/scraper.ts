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
    console.log(`[SCRAPER] Calling Railway Crawl4AI /v1/scrape for: ${url}`);

    // Use new OpenAPI-compliant /v1/scrape endpoint
    const requestBody = {
      url,
      extract: {
        title: {
          fallbackToMeta: true  // Use meta tags and h1 as fallback
        },
        content: {
          format: "markdown",   // Get content as markdown
          removeSelectors: [".ad", ".advertisement", "nav", "footer", ".social-share"]
        }
      },
      processing: {
        minContentLength: 200,
        maxContentLength: 40000,
        normalizeWhitespace: true
      },
      options: {
        timeout: 60000,
        executeJs: true
      }
    };

    const response = await fetch(`${SCRAPER_SERVICE_URL}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(70000), // 70s timeout (10s buffer)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Railway scraper HTTP ${response.status} - ${response.statusText}`,
      };
    }

    const result = await response.json();

    console.log(`[SCRAPER] Railway result: success=${result.success}, contentLength=${result.data?.contentLength || 0}`);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Railway scraper returned success=false',
      };
    }

    if (!result.data || !result.data.content || result.data.contentLength < 200) {
      return {
        success: false,
        error: `Insufficient content extracted (${result.data?.contentLength || 0} chars)`,
      };
    }

    console.log(`[SCRAPER] SUCCESS: Extracted ${result.data.contentLength} chars via Railway Crawl4AI`);

    return {
      success: true,
      content: result.data.content,
      title: result.data.title || '',
    };
  } catch (error) {
    console.error(`[SCRAPER] Railway Crawl4AI error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calling Railway scraper',
    };
  }
}
