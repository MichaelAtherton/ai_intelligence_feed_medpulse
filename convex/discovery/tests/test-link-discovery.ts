/**
 * Component 1: Link Discovery Test
 *
 * Tests the webFetch function from tools.ts
 * Input: Single source URL
 * Output: JSON array of article links found on that page
 *
 * HOW TO RUN:
 * npx tsx convex/discovery/tests/test-link-discovery.ts
 *
 * REQUIREMENTS:
 * - SCRAPER_SERVICE_URL environment variable (optional - defaults to Railway production)
 */

import { webFetch } from '../tools';

// Set Railway scraper URL for testing
process.env.SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'https://aiintelligencefeedmedpulse-production.up.railway.app';

async function testLinkDiscovery() {
  console.log('🧪 Testing Component 1: Link Discovery\n');
  console.log('═'.repeat(60));

  // Test configuration - add or modify URLs to test different sources
  const testSources = [
    {
      name: 'JAMA Medical News',
      url: 'https://jamanetwork.com/channels/medical-news'
    },
    // {
    //   name: 'Nature Medicine',
    //   url: 'https://www.nature.com/nm/'
    // }
  ];

  console.log('\n📋 Test Configuration:');
  console.log(`   Railway Service: ${process.env.SCRAPER_SERVICE_URL}`);
  console.log(`   Number of Sources: ${testSources.length}\n`);

  let totalSuccess = 0;
  let totalFailed = 0;

  // Test each source
  for (let i = 0; i < testSources.length; i++) {
    const source = testSources[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📍 Source ${i + 1}/${testSources.length}: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    console.log(`${'─'.repeat(60)}\n`);

    try {
      console.log('🚀 Fetching article links...');
      const startTime = Date.now();

      const result = await webFetch(source.url);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`⏱️  Completed in ${duration}s\n`);

      // Parse the result
      try {
        const parsedResult = JSON.parse(result);

        console.log('✅ SUCCESS\n');
        console.log('📊 Results:');
        console.log(`   URL: ${parsedResult.url}`);
        console.log(`   Articles Found: ${parsedResult.count || parsedResult.articles?.length || 0}`);

        // Show raw response for debugging
        console.log('📦 Raw Response Data:');
        console.log(`   Success: ${parsedResult.success ?? 'N/A'}`);
        console.log(`   Links Found: ${parsedResult.linksFound ?? 'N/A'}`);
        console.log(`   Articles Array Length: ${parsedResult.articles?.length ?? 0}`);
        console.log('');

        if (parsedResult.articles && parsedResult.articles.length > 0) {
          console.log(`\n📄 Sample Articles (first 5):\n`);

          const samplesToShow = Math.min(5, parsedResult.articles.length);
          for (let j = 0; j < samplesToShow; j++) {
            const article = parsedResult.articles[j];
            console.log(`${j + 1}. ${article.title || '[No title]'}`);
            console.log(`   URL: ${article.url}`);
            if (article.snippet) {
              const snippetPreview = article.snippet.length > 100
                ? article.snippet.slice(0, 100) + '...'
                : article.snippet;
              console.log(`   Snippet: ${snippetPreview}`);
            }
            console.log('');
          }

          if (parsedResult.articles.length > 5) {
            console.log(`   ... and ${parsedResult.articles.length - 5} more articles\n`);
          }

          // Show all URLs for reference
          console.log('🔗 All Discovered URLs:');
          parsedResult.articles.forEach((article: any, idx: number) => {
            console.log(`   ${idx + 1}. ${article.url}`);
          });
          console.log('');

          totalSuccess++;
        } else {
          console.log('⚠️  No articles found in response\n');
          console.log('Raw response:', result.slice(0, 500));
        }
      } catch (parseError) {
        console.log('⚠️  Could not parse JSON response\n');
        console.log('Raw response (first 500 chars):');
        console.log(result.slice(0, 500));

        // Check if it's an error message
        if (result.includes('Error')) {
          console.log('\n❌ Error message detected in response');
          totalFailed++;
        }
      }
    } catch (error) {
      console.log('❌ FAILED\n');
      console.log('Error:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.log('\nStack trace:');
        console.log(error.stack);
      }
      totalFailed++;
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('📈 FINAL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Successful: ${totalSuccess}/${testSources.length}`);
  console.log(`❌ Failed: ${totalFailed}/${testSources.length}`);
  console.log('');

  if (totalSuccess === testSources.length) {
    console.log('🎉 All tests passed!');
    return true;
  } else if (totalSuccess > 0) {
    console.log('⚠️  Some tests failed. Check the output above for details.');
    return false;
  } else {
    console.log('❌ All tests failed. Possible issues:');
    console.log('   - Railway Crawl4AI service may be down');
    console.log('   - Network connectivity issues');
    console.log('   - Source URLs may have changed or be blocking requests');
    console.log(`   - Verify service is running: ${process.env.SCRAPER_SERVICE_URL}/health`);
    return false;
  }
}

// Run the test
console.log('\n🔬 Component 1: Link Discovery Test Suite');
console.log('Testing: convex/discovery/tools.ts → webFetch()\n');

testLinkDiscovery()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
