const Apify = require('apify');
const getPage = require('node-readability'); // https://www.npmjs.com/package/node-readability
const rs = require('text-readability'); // https://www.npmjs.com/package/text-readability
const {
  createApifySubFolders,
  gotoFunction,
  runAxeScript,
  handleFailedRequestFunction,
} = require('./commonCrawlerFunc');
const {
  maxRequestsPerCrawl,
  maxConcurrency,
  pseudoUrls,
  urlsCrawledObj,
} = require('../constants/constants');

exports.crawlDomain = async (url, randomToken, host) => {
  const urlsCrawled = { ...urlsCrawledObj };

  const { dataset, requestQueue } = await createApifySubFolders(randomToken);

  await requestQueue.addRequest({ url });
  var i = 0;
  const crawler = new Apify.PuppeteerCrawler({
    requestQueue,
    gotoFunction,
    handlePageFunction: async ({ page, request }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
      if (location.host.includes(host)) {
        const results = await runAxeScript(page, host);

        // Check readability of the page
        getPage(currentUrl, function(err, article, meta, callback) {
          try { 
            pageText = article.textBody; // Note article.title is also available
            var sentenceCount = difficultWords = fleschKincaidGrade = 0;
            sentenceCount = rs.sentenceCount(pageText);
            difficultWords = rs.difficultWords(pageText);
            fleschKincaidGrade = rs.fleschKincaidGrade(pageText);
            automatedReadabilityIndex = rs.automatedReadabilityIndex(pageText);

            // Optional values
            // var characterCount = pageText.length;
            // var syllableCount = rs.syllableCount(pageText, lang='en-US');
            // var lexiconCount = rs.lexiconCount(pageText, removePunctuation=true);
            // var readingEase = rs.fleschReadingEase(pageText);
            // var colemanLiauIndex = rs.colemanLiauIndex(pageText);
            // var daleChallReadabilityScore = rs.daleChallReadabilityScore(pageText);
            // var linsearWriteFormula = rs.linsearWriteFormula(pageText);
            // var gunningFog = rs.gunningFog(pageText);
            // var textStandard = rs.textStandard(pageText);

            readability = {sentenceCount, fleschKincaidGrade, automatedReadabilityIndex, difficultWords};
            article.close();
          } catch(e){
             console.log("YO",e)
          }
        });

        // Add readability values to results object
        if ( typeof readability !== 'undefined' && readability ) {
          let newResults = Object.assign(results, { readability: readability });
        }

        await dataset.pushData(results);
        urlsCrawled.scanned.push(currentUrl);

        // Provide output to console for progress
        ++i
        console.log("id: " + i + " errors " + results.errors.length + " url: " + currentUrl);
        await Apify.utils.enqueueLinks({
          page,
          selector: 'a',
          pseudoUrls: pseudoUrls(host),
          requestQueue,
        });
      } else {
        urlsCrawled.outOfDomain.push(currentUrl);
      }
    },
    handleFailedRequestFunction,
    maxRequestsPerCrawl,
    maxConcurrency,
  });

  await crawler.run();
  return urlsCrawled;
};
