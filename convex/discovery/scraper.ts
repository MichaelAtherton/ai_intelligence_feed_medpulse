"use node";

import * as cheerio from 'cheerio';

export async function scrapeArticleContent(url: string): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status} - ${response.statusText}`,
      };
    }
    
    const html = await response.text();
    
    // [DEBUGGER:scraper:fetch:26] Log HTML fetch results
    console.log(`[DEBUGGER:scraper:fetch:26] URL: ${url}`);
    console.log(`[DEBUGGER:scraper:fetch:26] HTML length: ${html.length} chars`);
    console.log(`[DEBUGGER:scraper:fetch:26] HTML preview (first 500 chars): ${html.slice(0, 500)}`);
    console.log(`[DEBUGGER:scraper:fetch:26] Contains <article> tag: ${html.includes('<article')}`);
    console.log(`[DEBUGGER:scraper:fetch:26] Contains <main> tag: ${html.includes('<main')}`);
    console.log(`[DEBUGGER:scraper:fetch:26] Contains "article-content" class: ${html.includes('article-content')}`);
    
    const $ = cheerio.load(html);
    
    // Extract title
    const title = $('h1').first().text().trim() || 
                  $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  '';
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, iframe, noscript, aside, .ad, .advertisement, .sidebar').remove();
    
    // Try to find main content
    let content = '';
    const mainSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '.article-body',
    ];
    
    // [DEBUGGER:scraper:selectors:51] Try each CSS selector
    console.log(`[DEBUGGER:scraper:selectors:51] Attempting ${mainSelectors.length} CSS selectors...`);
    
    for (const selector of mainSelectors) {
      const elem = $(selector).first();
      const found = elem.length > 0;
      const textLength = found ? elem.text().trim().length : 0;
      
      // [DEBUGGER:scraper:selectors:56] Log each selector attempt
      console.log(`[DEBUGGER:scraper:selectors:56] Selector="${selector}" found=${found} textLength=${textLength}`);
      
      if (elem.length > 0) {
        content = elem.text().trim();
        if (content.length > 300) {
          console.log(`[DEBUGGER:scraper:selectors:56] SUCCESS: Found >300 chars with selector="${selector}"`);
          console.log(`[DEBUGGER:scraper:selectors:56] Content preview: ${content.slice(0, 200)}...`);
          break;
        }
      }
    }
    
    // Fallback to body if no main content found
    if (content.length < 300) {
      console.log(`[DEBUGGER:scraper:fallback:82] No selector found >300 chars, trying body fallback`);
      content = $('body').text().trim();
      console.log(`[DEBUGGER:scraper:fallback:82] Body fallback result: ${content.length} chars`);
      console.log(`[DEBUGGER:scraper:fallback:82] Body content preview: ${content.slice(0, 300)}...`);
    }
    
    // Clean up whitespace
    const beforeCleanup = content.length;
    content = content.replace(/\s+/g, ' ').trim();
    console.log(`[DEBUGGER:scraper:cleanup:88] After whitespace cleanup: ${beforeCleanup} -> ${content.length} chars`);
    
    // Limit content size (max 40k chars for analysis)
    if (content.length > 40000) {
      content = content.slice(0, 40000) + '...';
      console.log(`[DEBUGGER:scraper:limit:92] Content trimmed to 40k chars`);
    }
    
    // [DEBUGGER:scraper:validation:95] Final validation
    console.log(`[DEBUGGER:scraper:validation:95] Final content length: ${content.length} chars (required: 200)`);
    console.log(`[DEBUGGER:scraper:validation:95] Final content preview: ${content.slice(0, 500)}`);
    
    if (content.length < 200) {
      console.log(`[DEBUGGER:scraper:validation:95] FAILED: Insufficient content (${content.length} < 200)`);
      return {
        success: false,
        error: 'Insufficient content extracted',
      };
    }
    
    console.log(`[DEBUGGER:scraper:validation:95] SUCCESS: Extracted ${content.length} chars`);
    
    
    return {
      success: true,
      content,
      title,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
