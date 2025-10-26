from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from crawl4ai import AsyncWebCrawler, BrowserConfig, UndetectedAdapter
from crawl4ai.async_crawler_strategy import AsyncPlaywrightCrawlerStrategy
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import time

# OpenAPI Metadata
app = FastAPI(
    title="Crawl4AI Scraper Service",
    description="Project-agnostic web scraping service with flexible content extraction",
    version="2.0.0",
    contact={
        "name": "Scraper Service API Support",
        "url": "https://github.com/your-org/scraper-service",
    },
    license_info={
        "name": "MIT",
    },
)

# ============================================================================
# REQUEST MODELS
# ============================================================================

class LinkSelectors(BaseModel):
    """Selectors for finding links on a page"""
    css: Optional[List[str]] = Field(None, description="CSS selectors for links", example=["article a", ".post-link"])
    xpath: Optional[List[str]] = Field(None, description="XPath selectors for links")
    urlPatterns: Optional[List[str]] = Field(None, description="Regex patterns for URLs", example=["/article/", "/post/\\d+"])
    textPatterns: Optional[List[str]] = Field(None, description="Regex patterns for link text")

class LinkFilters(BaseModel):
    """Filters for discovered links"""
    minTextLength: Optional[int] = Field(0, ge=0, description="Minimum link text length")
    maxLinks: Optional[int] = Field(100, ge=1, le=1000, description="Maximum links to return")
    excludePatterns: Optional[List[str]] = Field(None, description="URL patterns to exclude", example=["/tag/", "/category/"])
    includeExternal: Optional[bool] = Field(False, description="Include external links")

class CrawlOptions(BaseModel):
    """Options for web crawling behavior"""
    waitForSelector: Optional[str] = Field(None, description="CSS selector to wait for before extracting")
    timeout: Optional[int] = Field(30000, ge=1000, le=120000, description="Max wait time in milliseconds")
    executeJs: Optional[bool] = Field(True, description="Enable JavaScript rendering")
    userAgent: Optional[str] = Field(None, description="Custom user agent string")
    bypassCloudflare: Optional[bool] = Field(True, description="Enable Cloudflare/anti-bot bypass (uses undetected browser)")

class DiscoverRequest(BaseModel):
    """Request for discovering links on a page"""
    url: str = Field(..., description="Target URL to scrape", example="https://jamanetwork.com/channels/medical-news")
    selectors: Optional[LinkSelectors] = Field(None, description="Link selection strategies")
    filters: Optional[LinkFilters] = Field(None, description="Filtering options")
    options: Optional[CrawlOptions] = Field(None, description="Crawl behavior options")

class TitleExtraction(BaseModel):
    """Title extraction configuration"""
    selectors: Optional[List[str]] = Field(None, description="CSS selectors for title", example=["h1.title", ".article-title"])
    fallbackToMeta: Optional[bool] = Field(True, description="Use <title> or og:title as fallback")

class ContentExtraction(BaseModel):
    """Content extraction configuration"""
    selectors: Optional[List[str]] = Field(None, description="CSS selectors for main content", example=["article", ".post-content"])
    format: Optional[Literal["html", "markdown", "text"]] = Field("markdown", description="Output format")
    removeSelectors: Optional[List[str]] = Field(None, description="Elements to remove", example=[".ad", "nav", "footer"])

class CustomField(BaseModel):
    """Custom field extraction rule"""
    name: str = Field(..., description="Field name")
    selector: str = Field(..., description="CSS selector")
    attribute: Optional[str] = Field(None, description="Extract attribute instead of text")

class ExtractConfig(BaseModel):
    """Configuration for content extraction"""
    title: Optional[TitleExtraction] = None
    content: Optional[ContentExtraction] = None
    metadata: Optional[List[str]] = Field(None, description="Meta tags to extract", example=["author", "date", "description"])
    customFields: Optional[List[CustomField]] = None

class ProcessingConfig(BaseModel):
    """Content processing configuration"""
    minContentLength: Optional[int] = Field(200, ge=0, description="Minimum content length")
    maxContentLength: Optional[int] = Field(40000, ge=100, description="Maximum content length")
    stripHtml: Optional[bool] = Field(False, description="Remove HTML tags")
    normalizeWhitespace: Optional[bool] = Field(True, description="Clean up whitespace")

class ScrapeRequest(BaseModel):
    """Request for scraping content from a page"""
    url: str = Field(..., description="Target URL to scrape", example="https://jamanetwork.com/journals/jama/fullarticle/123456")
    extract: Optional[ExtractConfig] = Field(None, description="Extraction configuration")
    processing: Optional[ProcessingConfig] = Field(None, description="Content processing options")
    options: Optional[CrawlOptions] = Field(None, description="Crawl behavior options")

# ============================================================================
# RESPONSE MODELS
# ============================================================================

class DiscoveredLink(BaseModel):
    """A discovered link"""
    url: str = Field(..., description="Absolute URL")
    text: str = Field(..., description="Link text")
    context: Optional[str] = Field(None, description="Surrounding text/snippet")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class DiscoverMetadata(BaseModel):
    """Metadata about the discovery operation"""
    crawlDuration: int = Field(..., description="Time taken in milliseconds")
    jsRendered: bool = Field(..., description="Whether JavaScript was rendered")
    totalLinksOnPage: int = Field(..., description="Total links found on page")

class DiscoverResponse(BaseModel):
    """Response from discover endpoint"""
    success: bool
    url: str
    linksFound: int
    links: List[DiscoveredLink]
    error: Optional[str] = None
    metadata: Optional[DiscoverMetadata] = None

class ScrapedData(BaseModel):
    """Scraped content data"""
    title: Optional[str] = None
    content: Optional[str] = None
    contentLength: int
    format: Literal["html", "markdown", "text"]
    metadata: Optional[Dict[str, str]] = None
    customFields: Optional[Dict[str, Any]] = None

class ScrapeMetadata(BaseModel):
    """Metadata about the scrape operation"""
    crawlDuration: int
    jsRendered: bool
    extractionMethod: Optional[str] = None

class ScrapeResponse(BaseModel):
    """Response from scrape endpoint"""
    success: bool
    url: str
    data: Optional[ScrapedData] = None
    error: Optional[str] = None
    metadata: Optional[ScrapeMetadata] = None

class HealthResponse(BaseModel):
    """Health check response"""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    uptime: Optional[int] = None
    browserAvailable: bool

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def matches_pattern(text: str, patterns: Optional[List[str]]) -> bool:
    """Check if text matches any of the regex patterns"""
    if not patterns:
        return True
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)

def extract_links_by_selectors(soup: BeautifulSoup, selectors: Optional[LinkSelectors], base_url: str) -> List[Dict[str, str]]:
    """Extract links using CSS or XPath selectors"""
    links = []
    seen = set()

    # Default: find all <a> tags with href
    elements = []
    if selectors and selectors.css:
        for css_selector in selectors.css:
            elements.extend(soup.select(css_selector))
    else:
        elements = soup.find_all('a', href=True)

    for element in elements:
        href = element.get('href')
        if not href:
            continue

        text = element.get_text(strip=True)

        # Make absolute URL
        if not href.startswith('http'):
            href = urljoin(base_url, href)

        # Skip duplicates
        if href in seen:
            continue
        seen.add(href)

        links.append({
            'url': href,
            'text': text,
            'element': element
        })

    return links

def apply_link_filters(
    links: List[Dict[str, str]],
    filters: Optional[LinkFilters],
    selectors: Optional[LinkSelectors],
    base_url: str
) -> List[Dict[str, str]]:
    """Apply filters to discovered links"""
    if not filters:
        filters = LinkFilters()

    filtered = []
    base_domain = urlparse(base_url).netloc

    for link in links:
        url = link['url']
        text = link['text']

        # Check minimum text length
        if len(text) < (filters.minTextLength or 0):
            continue

        # Check URL patterns
        if selectors and selectors.urlPatterns:
            if not matches_pattern(url, selectors.urlPatterns):
                continue

        # Check text patterns
        if selectors and selectors.textPatterns:
            if not matches_pattern(text, selectors.textPatterns):
                continue

        # Check exclude patterns
        if filters.excludePatterns:
            if matches_pattern(url, filters.excludePatterns):
                continue

        # Check external links
        if not filters.includeExternal:
            link_domain = urlparse(url).netloc
            if link_domain != base_domain:
                continue

        filtered.append(link)

        # Check max links limit
        if len(filtered) >= (filters.maxLinks or 100):
            break

    return filtered

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/", tags=["Info"])
async def root():
    """API information endpoint"""
    return {
        "service": "Crawl4AI Scraper Service",
        "version": "2.0.0",
        "description": "Project-agnostic web scraping service",
        "endpoints": {
            "discover": "POST /v1/discover - Discover links on a page with flexible selectors",
            "scrape": "POST /v1/scrape - Extract structured content from a page",
            "health": "GET /health - Service health check"
        },
        "documentation": "/docs"
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """
    Health check endpoint

    Returns the service status and availability
    """
    # TODO: Add actual browser availability check
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        browserAvailable=True
    )

@app.post("/v1/discover", response_model=DiscoverResponse, tags=["Discovery"], status_code=status.HTTP_200_OK)
async def discover_links(request: DiscoverRequest):
    """
    Discover links on a page using flexible selection criteria

    This endpoint crawls a page and extracts links based on:
    - CSS selectors
    - XPath selectors (coming soon)
    - URL regex patterns
    - Link text patterns
    - Custom filters

    **Example request for medical articles:**
    ```json
    {
        "url": "https://jamanetwork.com/channels/medical-news",
        "selectors": {
            "urlPatterns": ["/fullarticle/", "/article/"]
        },
        "filters": {
            "minTextLength": 10,
            "maxLinks": 50
        }
    }
    ```

    **Example request for blog posts:**
    ```json
    {
        "url": "https://example.com/blog",
        "selectors": {
            "css": ["article a", ".post-title a"],
            "urlPatterns": ["/blog/\\\\d{4}/"]
        }
    }
    ```
    """
    start_time = time.time()

    try:
        print(f"\n🔍 [DISCOVER] Request for: {request.url}")

        # Configure browser for Cloudflare bypass if requested
        bypass_cloudflare = request.options.bypassCloudflare if request.options else True

        if bypass_cloudflare:
            print("[DISCOVER] Using UndetectedAdapter for Cloudflare bypass")
            browser_config = BrowserConfig(
                headless=False,  # Headless mode more easily detected
                verbose=True,
                enable_stealth=True
            )
            adapter = UndetectedAdapter()
            strategy = AsyncPlaywrightCrawlerStrategy(
                browser_config=browser_config,
                browser_adapter=adapter
            )
            crawler_instance = AsyncWebCrawler(crawler_strategy=strategy)
        else:
            crawler_instance = AsyncWebCrawler()

        # Crawl the page
        async with crawler_instance as crawler:
            crawl_result = await crawler.arun(
                url=request.url,
                magic=True,
                simulate_user=bypass_cloudflare,  # Add realistic behavior when bypassing
                timeout=(request.options.timeout if request.options else 30000) / 1000
            )

            if not crawl_result.success:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=crawl_result.error_message or "Failed to crawl page"
                )

            soup = BeautifulSoup(crawl_result.html, 'html.parser')

            # Extract links
            links = extract_links_by_selectors(soup, request.selectors, request.url)
            total_links = len(links)
            print(f"[DISCOVER] Found {total_links} total links")

            # Apply filters
            filtered_links = apply_link_filters(links, request.filters, request.selectors, request.url)
            print(f"[DISCOVER] {len(filtered_links)} links after filtering")

            # Build response
            discovered_links = []
            for link in filtered_links:
                # Get context (surrounding text)
                element = link['element']
                parent = element.parent
                context = parent.get_text(strip=True)[:200] if parent else ""

                discovered_links.append(DiscoveredLink(
                    url=link['url'],
                    text=link['text'] or '[No title]',
                    context=context,
                    metadata={
                        "selector": "custom" if request.selectors and request.selectors.css else "default"
                    }
                ))

            duration = int((time.time() - start_time) * 1000)

            return DiscoverResponse(
                success=True,
                url=request.url,
                linksFound=len(discovered_links),
                links=discovered_links,
                metadata=DiscoverMetadata(
                    crawlDuration=duration,
                    jsRendered=request.options.executeJs if request.options else True,
                    totalLinksOnPage=total_links
                )
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [DISCOVER] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/v1/scrape", response_model=ScrapeResponse, tags=["Scraping"], status_code=status.HTTP_200_OK)
async def scrape_content(request: ScrapeRequest):
    """
    Extract structured content from a page

    This endpoint scrapes a page and extracts:
    - Title (using custom selectors or meta tags)
    - Main content (HTML, Markdown, or plain text)
    - Metadata (author, date, description, etc.)
    - Custom fields (using CSS selectors)

    **Example request:**
    ```json
    {
        "url": "https://example.com/article/123",
        "extract": {
            "title": {
                "selectors": ["h1.article-title"],
                "fallbackToMeta": true
            },
            "content": {
                "selectors": ["article", ".post-content"],
                "format": "markdown",
                "removeSelectors": [".ad", "nav"]
            },
            "metadata": ["author", "date"]
        },
        "processing": {
            "minContentLength": 500,
            "maxContentLength": 50000
        }
    }
    ```
    """
    start_time = time.time()

    try:
        print(f"\n📄 [SCRAPE] Request for: {request.url}")

        # Configure browser for Cloudflare bypass if requested
        bypass_cloudflare = request.options.bypassCloudflare if request.options else True

        if bypass_cloudflare:
            print("[SCRAPE] Using UndetectedAdapter for Cloudflare bypass")
            browser_config = BrowserConfig(
                headless=False,  # Headless mode more easily detected
                verbose=True,
                enable_stealth=True
            )
            adapter = UndetectedAdapter()
            strategy = AsyncPlaywrightCrawlerStrategy(
                browser_config=browser_config,
                browser_adapter=adapter
            )
            crawler_instance = AsyncWebCrawler(crawler_strategy=strategy)
        else:
            crawler_instance = AsyncWebCrawler()

        # Crawl the page
        async with crawler_instance as crawler:
            crawl_result = await crawler.arun(
                url=request.url,
                magic=True,
                simulate_user=bypass_cloudflare,  # Add realistic behavior when bypassing
                timeout=(request.options.timeout if request.options else 30000) / 1000
            )

            if not crawl_result.success:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=crawl_result.error_message or "Failed to scrape page"
                )

            soup = BeautifulSoup(crawl_result.html, 'html.parser')

            # Extract title
            title = None
            extraction_method = "default"

            if request.extract and request.extract.title:
                # Try custom selectors
                if request.extract.title.selectors:
                    for selector in request.extract.title.selectors:
                        element = soup.select_one(selector)
                        if element:
                            title = element.get_text(strip=True)
                            extraction_method = f"css:{selector}"
                            break

                # Fallback to meta tags
                if not title and request.extract.title.fallbackToMeta:
                    for candidate in [
                        soup.find('h1'),
                        soup.find('meta', property='og:title'),
                        soup.find('title')
                    ]:
                        if candidate:
                            if candidate.name == 'meta':
                                title = candidate.get('content', '')
                            else:
                                title = candidate.get_text(strip=True)
                            if title:
                                extraction_method = f"meta:{candidate.name}"
                                break
            else:
                # Default title extraction
                for candidate in [soup.find('h1'), soup.find('meta', property='og:title'), soup.find('title')]:
                    if candidate:
                        if candidate.name == 'meta':
                            title = candidate.get('content', '')
                        else:
                            title = candidate.get_text(strip=True)
                        if title:
                            break

            # Extract content
            content = None
            content_format = "markdown"

            if request.extract and request.extract.content:
                content_format = request.extract.content.format or "markdown"

                # Remove unwanted elements
                if request.extract.content.removeSelectors:
                    for selector in request.extract.content.removeSelectors:
                        for element in soup.select(selector):
                            element.decompose()

                # Try custom selectors
                if request.extract.content.selectors:
                    for selector in request.extract.content.selectors:
                        element = soup.select_one(selector)
                        if element:
                            if content_format == "html":
                                content = str(element)
                            elif content_format == "text":
                                content = element.get_text(strip=True)
                            else:  # markdown
                                # Use crawl4ai's markdown for the whole page, then extract
                                content = crawl_result.markdown.raw_markdown
                            extraction_method = f"css:{selector}"
                            break

            # Default: use crawl4ai's markdown
            if not content:
                if content_format == "markdown":
                    content = crawl_result.markdown.raw_markdown
                elif content_format == "html":
                    content = crawl_result.html
                else:
                    content = soup.get_text(strip=True)

            # Process content
            processing = request.processing or ProcessingConfig()

            if processing.normalizeWhitespace:
                content = ' '.join(content.split())

            if processing.stripHtml and content_format != "text":
                content = BeautifulSoup(content, 'html.parser').get_text(strip=True)

            # Apply length limits
            if len(content) > processing.maxContentLength:
                content = content[:processing.maxContentLength] + '...'

            # Validate minimum length
            if len(content) < processing.minContentLength:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Insufficient content extracted ({len(content)} chars, minimum {processing.minContentLength})"
                )

            # Extract metadata
            extracted_metadata = {}
            if request.extract and request.extract.metadata:
                for meta_name in request.extract.metadata:
                    meta_tag = soup.find('meta', attrs={'name': meta_name}) or soup.find('meta', property=f"og:{meta_name}")
                    if meta_tag:
                        extracted_metadata[meta_name] = meta_tag.get('content', '')

            # Extract custom fields
            custom_fields_data = {}
            if request.extract and request.extract.customFields:
                for field in request.extract.customFields:
                    element = soup.select_one(field.selector)
                    if element:
                        if field.attribute:
                            custom_fields_data[field.name] = element.get(field.attribute, '')
                        else:
                            custom_fields_data[field.name] = element.get_text(strip=True)

            duration = int((time.time() - start_time) * 1000)

            print(f"✅ [SCRAPE] Extracted {len(content)} chars via {extraction_method}")

            return ScrapeResponse(
                success=True,
                url=request.url,
                data=ScrapedData(
                    title=title,
                    content=content,
                    contentLength=len(content),
                    format=content_format,
                    metadata=extracted_metadata if extracted_metadata else None,
                    customFields=custom_fields_data if custom_fields_data else None
                ),
                metadata=ScrapeMetadata(
                    crawlDuration=duration,
                    jsRendered=request.options.executeJs if request.options else True,
                    extractionMethod=extraction_method
                )
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [SCRAPE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Legacy endpoints for backwards compatibility
@app.post("/fetch", include_in_schema=False)
async def legacy_fetch(request: DiscoverRequest):
    """Legacy endpoint - redirects to /v1/discover"""
    return await discover_links(request)

@app.post("/scrape", include_in_schema=False)
async def legacy_scrape(request: ScrapeRequest):
    """Legacy endpoint - redirects to /v1/scrape"""
    return await scrape_content(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
