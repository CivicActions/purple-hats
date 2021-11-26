const Apify = require('apify');
const path = require('path');
// const url = require('url');
const getPage = require('node-readability'); // https://www.npmjs.com/package/node-readability
const rs = require('text-readability'); // https://www.npmjs.com/package/text-readability

// How do we optinally include these other readability tools?
// The approach below didn't work and there aren't any clear nodeJS examples
// const rs = require('retext-readability');

// Maybe from:
// https://github.com/retextjs/retext-keywords/issues/13#issue-265258949
// var retext = require('retext');
// var keywords = require('retext-keywords');

// https://www.npmjs.com/package/retext
// https://www.npmjs.com/package/retext-readability
// https://www.npmjs.com/package/retext-simplify
// https://www.npmjs.com/package/retext-profanities
// https://www.npmjs.com/package/retext-sentence-spacing
// https://www.npmjs.com/package/etext-contractions
// https://www.npmjs.com/package/retext-diacritics
// https://www.npmjs.com/package/retext-passive
// https://www.npmjs.com/package/retext-readability
// https://www.npmjs.com/package/retext-intensify
// https://www.npmjs.com/package/retext-repeated-words
// https://www.npmjs.com/package/retext-indefinite-article
// https://www.npmjs.com/package/retext-equality
// https://www.npmjs.com/package/retext-keywords
// https://www.npmjs.com/package/retext-passive
// https://www.npmjs.com/package/retext-spell

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
  validateUrl,
  waitTime,
} = require('../constants/constants');

exports.crawlDomain = async (url, randomToken, host, excludeExtArr, excludeMoreArr, excludeQuery, storagePath) => {
  const urlsCrawled = {
    ...urlsCrawledObj
  };

  const {
    dataset,
    requestQueue
  } = await createApifySubFolders(randomToken);

  await requestQueue.addRequest({
    url
  });

  var i = ii = iii = 0;
  var pdfs = [];
  const crawler = new Apify.PuppeteerCrawler({
    requestQueue,
    gotoFunction,
    handlePageFunction: async ({
      page,
      request
    }) => {
      const currentUrl = request.url;
      const location = await page.evaluate('location');
      if (location.host.includes(host)) {
        var start = Date.now();

        // Skip elements defined in CLI
        // Presently not catching .asp#video or .asp?dnum=3&isFlash=0
        var skip = false;
        if(excludeExtArr[0] !== '') {
          skip = excludeExtArr.includes(path.extname(currentUrl).substring(1));
        }
        if (skip) {
          console.log(`Blocked (excludeExtArr) ${path.extname(currentUrl)}`); // + `${skip} ${currentUrl`);
          console.log(excludeExtArr);
        } else { // Test for excludeMoreArr
          if (excludeExtArr[0] !== '') {
            var skipElement = '';
            excludeMoreArr.forEach(function(element) {
              if (!skip) {
                skip = currentUrl.includes(element);
                skipElement = element;
              }
            });
          }
          if (skip) {
            console.log(`Blocked (excludeMoreArr) ${skipElement}`);
            console.log(excludeMoreArr);
          } else {

            // Check for missing extensions, ie: .asp#video or .asp?dnum=3&isFlash=0
            if(excludeExtArr[0] !== '') {
              excludeExtArr.forEach(function(element) {
                if (!skip) {
                  skip = currentUrl.includes(element);
                  skipElement = element;
                }
              });
            }
            if (skip) {
              console.log(`Blocked (excludeExtArr - plus) ${skipElement} `);
            } else {

              // This should be enabled from the CLI and not hard coded.
              if ((typeof currentUrl == 'string') && (excludeQuery ==1)) {

                let url_parts = require('url').parse(currentUrl, true);
                let query = JSON.stringify(url_parts.query);

                if (query !== '{}') {
                  skip = true;
                  console.log("Block query strings - ? & # ");
                }
              }
            }
          }
        }

        if (validateUrl(currentUrl) && !skip) {

          const results = await runAxeScript(page, host);
          // console.log(results); - This doesn't give me more information -> fixes: [Array]

          // Check readability of the page
          getPage(currentUrl, function (err, article, meta, callback) {
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

              readability = {
                sentenceCount,
                fleschKincaidGrade,
                automatedReadabilityIndex,
                difficultWords
              };
              article.close();
            } catch (e) {
              console.log("YO", e)
            }
          });
          var stop = Date.now()

          // Add readability values to results object
          if (typeof readability !== 'undefined' && readability) {
            let newResults = Object.assign(results, {
              readability: readability,
              time: (stop - start)/1000
            });
            // console.log(results);
            // console.log(newResults);
          }



          // I'm not sure this is working but it should
          if (waitTime > 0) {
            const timer = ms => new Promise( res => setTimeout(res, ms));
            (async function(){
             await timer(waitTime * 1000);
             console.log(`Waiting ${waitTime} seconds.`);
           })()
          }

          // Provide output to console for progress
          ++i;
          console.log(`id: ${i}, Errors: ${results.errors.length}, URL: ${currentUrl} Time to load: ${(stop - start)/1000} seconds`);

          await dataset.pushData(results);
          urlsCrawled.scanned.push(currentUrl);

        } else {
          ++ii;
          console.log(`Skipped id: ${ii}, URL: ${currentUrl}`);
console.log(`Valid url? ${validateUrl(currentUrl)}`);
console.log(`Skip url? ${skip}`);
          if (currentUrl.includes(".pdf")) {
            ++iii;
            console.log(`Number of PDFs: ${iii}`);
            pdfs[iii] = currentUrl;
          }
          urlsCrawled.invalid.push(currentUrl);
        }

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

  // How to best return this value?
  if (pdfs.length > 0) {
    console.log("We should be saving this list of PDFs.")
    console.log(pdfs);
  }

  /*
  This isn't right. It should be appending like - https://attacomsian.com/blog/nodejs-append-data-to-file
  console.log(`Writing list of PDFs to ${storagePath}/reports/pdf.csv`);
  const ObjectsToCsv = require('objects-to-csv'); // Just needs to be defined once at top of page
  (async () => {
    const csv_p = new ObjectsToCsv(pdfs);

    // Save to file:
    await csv_p.toDisk(`${storagePath}/reports/pdf.csv`);
    // console.log(await csv_a.toString());
  })();
  */

  await crawler.run();
  return urlsCrawled;
};
