const {
  crawlSitemap
} = require('./crawlers/crawlSitemap');
const {
  crawlDomain
} = require('./crawlers/crawlDomain');

const {
  mergeFiles
} = require('./mergeAxeResults');
const {
  getHostnameFromRegex,
  createAndUpdateFolders
} = require('./utils');
const {
  a11yStorage
} = require('./constants/constants');

process.env.APIFY_LOCAL_STORAGE_DIR = a11yStorage;
process.env.APIFY_HEADLESS = 1;

exports.combineRun = async details => {
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

  const excludeExtArr = excludeExt.substring(1).split('.');
  console.log("Exclude: ");
  console.log(excludeExtArr);
  const excludeMoreArr = excludeMore.substring(1).split('|');
  console.log(excludeMoreArr);

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
    urlsCrawled = await crawlSitemap(url, randomToken, host, excludeExtArr, excludeMoreArr);
    break;

  case 'crawlDomain':
    urlsCrawled = await crawlDomain(url, randomToken, host, excludeExtArr, excludeMoreArr);
    break;

  default:
    break;
  }

  scanDetails.endTime = new Date().getTime();
  scanDetails.urlsCrawled = urlsCrawled;
  global.endTime = scanDetails.endTime;
  var totalTimeSeconds = Math.round((endTime - startTime) / 1000);
  var hours = (totalTimeSeconds / 3600);
  var rhours = Math.floor(hours);
  var minutes = (hours - rhours) * 60;
  var rminutes = Math.round(minutes);
  var seconds = (minutes - rminutes) * 60;
  var rseconds = Math.abs(Math.round(seconds));

  global.totalTime = rhours + "h " + rminutes + "m " + rseconds + "s ";
  global.countURLsCrawled = urlsCrawled['scanned'].length;
  await createAndUpdateFolders(scanDetails, randomToken);
  await mergeFiles(randomToken);
};