from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from crawl4ai import AsyncWebCrawler
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin

app = FastAPI(title="Crawl4AI Scraper Service")

class FetchRequest(BaseModel):
    url: str

class ScrapeRequest(BaseModel):
    url: str
    title: str = ""

class ArticleLink(BaseModel):
    title: str
    url: str
    snippet: str

class FetchResponse(BaseModel):
    success: bool
    articles: list[ArticleLink]
    error: str | None = None

class ScrapeResponse(BaseModel):
    success: bool
    title: str | None = None
    content: str | None = None
    content_length: int = 0
    error: str | None = None

@app.get("/")
async def root():
    return {
        "service": "Crawl4AI Scraper Service",
        "version": "1.0.0",
        "endpoints": {
            "fetch": "POST /fetch - Discover article links from a page",
            "scrape": "POST /scrape - Extract content from an article URL"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/fetch", response_model=FetchResponse)
async def fetch_articles(request: FetchRequest):
    """
    Discovery endpoint: Find article links on a page
    Returns list of articles with title, url, snippet
    """
    print(f"\n🔍 [SCRAPER] Received fetch request for: {request.url}")
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=request.url, magic=True)
            
            if not result.success:
                return FetchResponse(
                    success=False,
                    articles=[],
                    error=result.error_message or "Failed to fetch page"
                )
            
            soup = BeautifulSoup(result.html, 'html.parser')
            articles = []
            seen = set()
            all_links = soup.find_all('a', href=True)

            print(f"[DEBUG] Total links found: {len(all_links)}")

            for link in all_links:
                href = link['href']
                text = link.get_text(strip=True)

                # Make absolute URL
                if not href.startswith('http'):
                    if href.startswith('/'):
                        # Extract base domain from request.url
                        from urllib.parse import urlparse
                        parsed = urlparse(request.url)
                        base_url = f"{parsed.scheme}://{parsed.netloc}"
                        href = f"{base_url}{href}"
                    else:
                        href = urljoin(request.url, href)

                # Skip duplicates
                if href in seen:
                    continue
                seen.add(href)

                # Look for fullarticle pattern or article-like URLs
                if '/fullarticle/' in href.lower() or '/article/' in href.lower():
                    print(f"[DEBUG] Matched article URL: {href[:100]}")
                    articles.append(ArticleLink(
                        title=text if text else '[No title]',
                        url=href,
                        snippet=text[:200] if text else ''
                    ))

            print(f"✅ [SCRAPER] Found {len(articles)} articles from {request.url}")
            return FetchResponse(
                success=True,
                articles=articles
            )
            
    except Exception as e:
        print(f"❌ [SCRAPER] Error fetching {request.url}: {str(e)}")
        return FetchResponse(
            success=False,
            articles=[],
            error=str(e)
        )

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_article(request: ScrapeRequest):
    """
    Scraping endpoint: Extract full content from an article URL
    Returns title and full text content
    """
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=request.url, magic=True)
            
            if not result.success:
                return ScrapeResponse(
                    success=False,
                    error=result.error_message or "Failed to scrape article"
                )
            
            soup = BeautifulSoup(result.html, 'html.parser')
            
            # Extract title
            title = None
            title_candidates = [
                soup.find('h1'),
                soup.find('meta', property='og:title'),
                soup.find('title')
            ]
            
            for candidate in title_candidates:
                if candidate:
                    if candidate.name == 'meta':
                        title = candidate.get('content', '')
                    else:
                        title = candidate.get_text(strip=True)
                    if title:
                        break
            
            # Use title from request if extraction failed
            if not title:
                title = request.title
            
            # Extract content (use markdown for cleaner text)
            content = result.markdown.raw_markdown
            content = ' '.join(content.split())  # Clean whitespace
            
            # Limit size
            if len(content) > 40000:
                content = content[:40000] + '...'
            
            # Validate minimum content
            success = len(content) >= 200
            
            return ScrapeResponse(
                success=success,
                title=title,
                content=content,
                content_length=len(content),
                error=None if success else f"Insufficient content (only {len(content)} chars)"
            )
            
    except Exception as e:
        return ScrapeResponse(
            success=False,
            error=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

