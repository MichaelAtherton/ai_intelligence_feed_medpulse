/**
 * Railway Service Test - No Filtering
 *
 * Tests Railway without URL pattern filtering to see ALL links on the page
 *
 * HOW TO RUN:
 * npx tsx convex/discovery/tests/test-railway-no-filter.ts
 */

const SCRAPER_SERVICE_URL = 'https://aiintelligencefeedmedpulse-production.up.railway.app';

async function testRailwayNoFilter() {
  console.log('🧪 Testing Railway Crawl4AI - Show ALL Links (No Filtering)\n');
  console.log('═'.repeat(60));

  const testUrl = 'https://jamanetwork.com/channels/medical-news';

  console.log(`\n📍 Test URL: ${testUrl}`);
  console.log(`🚂 Railway Service: ${SCRAPER_SERVICE_URL}\n`);

  // Request with NO urlPatterns filter - should return all links
  const requestBody = {
    url: testUrl,
    selectors: {
      // No urlPatterns - return all links
    },
    filters: {
      minTextLength: 0,        // No minimum text
      maxLinks: 200,           // Get more links
      includeExternal: true    // Include external links too
    },
    options: {
      timeout: 60000,
      executeJs: true,
      waitForSelector: 'a'     // Wait for links to load
    }
  };

  console.log('📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n🚀 Calling /v1/discover endpoint...\n');

  try {
    const response = await fetch(`${SCRAPER_SERVICE_URL}/v1/discover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(70000),
    });

    console.log(`📡 HTTP Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      console.log('❌ Request failed');
      const text = await response.text();
      console.log('Response:', text);
      return;
    }

    const result = await response.json();

    console.log('📊 Response Summary:');
    console.log(`   success: ${result.success}`);
    console.log(`   linksFound: ${result.linksFound}`);
    console.log(`   links array length: ${result.links?.length ?? 0}`);
    console.log(`   totalLinksOnPage (metadata): ${result.metadata?.totalLinksOnPage ?? 'N/A'}`);
    console.log(`   error: ${result.error ?? 'none'}\n`);

    if (result.links && result.links.length > 0) {
      console.log(`📄 ALL Links Found (showing all ${result.links.length}):\n`);

      result.links.forEach((link: any, i: number) => {
        console.log(`${i + 1}. ${link.text || '[No text]'}`);
        console.log(`   URL: ${link.url}`);

        // Check if it matches our patterns
        const patterns = ['/fullarticle/', '/article/', '/articles/', '/news/', '/blog/', '/post/'];
        const matches = patterns.filter(p => link.url.includes(p));
        if (matches.length > 0) {
          console.log(`   ✅ MATCHES: ${matches.join(', ')}`);
        }
        console.log('');
      });

      // Analyze patterns
      console.log('\n📈 Pattern Analysis:');
      const patterns = ['/fullarticle/', '/article/', '/articles/', '/news/', '/blog/', '/post/'];
      patterns.forEach(pattern => {
        const count = result.links.filter((l: any) => l.url.includes(pattern)).length;
        console.log(`   ${pattern}: ${count} matches`);
      });

    } else {
      console.log('⚠️  No links found on page');
      console.log('\n📥 Full Response:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.log('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

testRailwayNoFilter()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
