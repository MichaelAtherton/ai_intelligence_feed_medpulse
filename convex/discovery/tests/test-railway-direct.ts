/**
 * Direct Railway Service Test
 *
 * Tests the Railway Crawl4AI service directly to see raw responses
 *
 * HOW TO RUN:
 * npx tsx convex/discovery/tests/test-railway-direct.ts
 */

const SCRAPER_SERVICE_URL = 'https://aiintelligencefeedmedpulse-production.up.railway.app';

async function testRailwayDirect() {
  console.log('🧪 Testing Railway Crawl4AI Service Directly\n');
  console.log('═'.repeat(60));

  const testUrl = 'https://jamanetwork.com/channels/medical-news';

  console.log(`\n📍 Test URL: ${testUrl}`);
  console.log(`🚂 Railway Service: ${SCRAPER_SERVICE_URL}\n`);

  const requestBody = {
    url: testUrl,
    selectors: {
      urlPatterns: [
        "/fullarticle/",
        "/article/",
        "/articles/",
        "/news/",
        "/blog/",
        "/post/",
      ]
    },
    filters: {
      minTextLength: 5,
      maxLinks: 100,
      includeExternal: false
    },
    options: {
      timeout: 60000,
      executeJs: true
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
      return;
    }

    const result = await response.json();

    console.log('📥 Raw Response:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');

    console.log('📊 Response Analysis:');
    console.log(`   success: ${result.success}`);
    console.log(`   linksFound: ${result.linksFound}`);
    console.log(`   links array length: ${result.links?.length ?? 0}`);
    console.log(`   error: ${result.error ?? 'none'}`);

    if (result.links && result.links.length > 0) {
      console.log('\n📄 Sample Links (first 3):');
      result.links.slice(0, 3).forEach((link: any, i: number) => {
        console.log(`\n${i + 1}.`);
        console.log(`   URL: ${link.url}`);
        console.log(`   Text: ${link.text}`);
        console.log(`   Context: ${link.context?.slice(0, 100)}...`);
      });
    }

  } catch (error) {
    console.log('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

testRailwayDirect()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
