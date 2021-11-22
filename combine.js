const csv = require('csv-parser');
const {
  crawlSitemap
} = require('./crawlers/crawlSitemap');
const {
  crawlDomain
} = require('./crawlers/crawlDomain');

const {
  mergeFiles,
  storagePath
} = require('./mergeAxeResults');
const {
  getHostnameFromRegex,
  createAndUpdateFolders,
} = require('./utils');
const {
  a11yStorage
} = require('./constants/constants');

process.env.APIFY_LOCAL_STORAGE_DIR = a11yStorage;
process.env.APIFY_HEADLESS = 1;

exports.combineRun = async (details, storagePath) => {
  let envDetails = {
    ...details
  };

  if (typeof details === 'undefined') {
    envDetails = {
      type: process.env.TYPE,
      url: process.env.URL,
      randomToken: process.env.RANDOMTOKEN,
      wappalyzer: process.env.WAPPALYZER,
      email: process.env.EMAIL,
      excludeExt: process.env.EXCLUDEEXT,
      excludeMore: process.env.EXCLUDEMORE,
      excludeQuery: process.env.EXCLUDEQUERY,
      number: process.env.NUMBER,
    };
  }

  const {
    type,
    url,
    randomToken,
    wappalyzer,
    email,
    excludeExt,
    excludeMore,
    excludeQuery,
    number
  } = envDetails;

  const host = getHostnameFromRegex(url);

  const scanDetails = {
    startTime: new Date().getTime(),
    crawlType: type,
    requestUrl: url,
  };

  global.domainURL = scanDetails.requestUrl;
  global.startTime = scanDetails.startTime;
  global.wappalyzer_json = wappalyzer;
  global.email = email;
  // global.maxRequestsPerCrawl = number; // Not getting passed along

  // Highlight if strings or extensions are being excluded
  const excludeExtArr = excludeExt.substring(1).split('.');
  const excludeMoreArr = excludeMore.split(',');
  if ((excludeExtArr[0] !== '') || (excludeMoreArr[0] !== '') || (excludeQuery == 1)) console.log("Exclude: ");
  if (excludeExtArr[0] !== '') console.log(excludeExtArr);
  if (excludeMoreArr[0] !== '') console.log(excludeMoreArr);
  if (excludeQuery == 1) console.log("Exclude queries ");

  /* I couldn't override the constant.js and avoid a "ApifyClientError: Parameter "options.maxRequestsPerCrawl" of type Maybe Number" error
    var maxRequestsPerCrawl = 0;
    if (number > absoluteMaxRequestsPerCrawl ) {
      maxRequestsPerCrawl=absoluteMaxRequestsPerCrawl;
    } else {
      maxRequestsPerCrawl=number;
    }
    exports.maxRequestsPerCrawl;
  */

  let urlsCrawled;
  switch (type) {
  case 'crawlSitemap':
    urlsCrawled = await crawlSitemap(url, randomToken, host, excludeExtArr, excludeMoreArr, excludeQuery);
    break;

  case 'crawlDomain':
    urlsCrawled = await crawlDomain(url, randomToken, host, excludeExtArr, excludeMoreArr, excludeQuery, storagePath);
    break;

  default:
    break;
  }

  scanDetails.urlsCrawled = urlsCrawled;
  scanDetails.endTime = new Date().getTime();
  global.endTime = scanDetails.endTime;
  var totalTimeSeconds = Math.round((endTime - startTime) / 1000);
  var hours = (totalTimeSeconds / 3600);
  var rhours = Math.floor(hours);
  var minutes = (hours - rhours) * 60;
  var rminutes = Math.round(minutes);
  var seconds = (minutes - rminutes) * 60;
  var rseconds = Math.abs(Math.round(seconds));
  var speedExact = (urlsCrawled.scanned.length / totalTimeSeconds);
  global.speed = speedExact.toPrecision(2);
  global.totalTime = rhours + "h " + rminutes + "m " + rseconds + "s ";
  global.countURLsCrawled = urlsCrawled['scanned'].length;
  await createAndUpdateFolders(scanDetails, randomToken);
  await mergeFiles(randomToken);
};
