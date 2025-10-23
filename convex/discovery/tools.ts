import * as cheerio from 'cheerio';

function extractArticles(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, iframe, noscript').remove();
  
  const articles: Array<{title: string, url: string, snippet: string}> = [];
  
  $('article, .post, .article, .entry').each((_, elem) => {
    const $elem = $(elem);
    const title = $elem.find('h1, h2, h3, .title').first().text().trim();
    const link = $elem.find('a').first().attr('href');
    const snippet = $elem.text().trim().slice(0, 200);
    
    if (title && link) {
      const fullUrl = link.startsWith('http') ? link : new URL(link, baseUrl).href;
      articles.push({ title, url: fullUrl, snippet });
    }
  });
  
  if (articles.length === 0) {
    $('a').each((_, elem) => {
      const $elem = $(elem);
      const title = $elem.text().trim();
      const link = $elem.attr('href');
      
      if (title && link && title.length > 15 && title.length < 200) {
        const fullUrl = link.startsWith('http') ? link : new URL(link, baseUrl).href;
        articles.push({ title, url: fullUrl, snippet: title });
      }
    });
  }
  
  return articles.slice(0, 15);
}

export async function webFetch(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (AI Research Bot)',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return `Error: HTTP ${response.status} - ${response.statusText}`;
    }
    
    const html = await response.text();
    const articles = extractArticles(html, url);
    
    return JSON.stringify({
      url,
      articles,
      count: articles.length
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) {
      return `Error fetching ${url}: ${error.message}`;
    }
    return `Error fetching ${url}: Unknown error`;
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
