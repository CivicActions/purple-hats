// for crawlers
exports.axeScript = 'node_modules/axe-core/axe.min.js';

exports.maxRequestsPerCrawl = 1000;
// exports.absoluteMaxRequestsPerCrawl = 5000; // I'd like to be able to override this at the command line.

exports.maxHTMLdisplay = 250;

// Not successfully adding time in crawlDomain.js
exports.waitTime = 0; // in seconds

// Only set higher with permission of site owner
exports.maxConcurrency = 1;

// Apify's pseudoUrls https://sdk.apify.com/docs/api/pseudo-url
exports.pseudoUrls = host => [
  // eslint-disable-next-line no-useless-escape
  `[.*(?<!mailto.*)]${host}[(?!.*\.(example|extension)).*]`,
];

exports.validateUrl = url => {
  invalidURLends = [
    '.gif',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.avif',
    '.svg',
    '.pdf',
    '.epub',
    '.mobi',
    '.doc',
    '.docx',
    '.css',
    '.svg',
    '.js',
    '.ts',
    '.xml',
    '.csv',
    '.txt',
    '.tgz',
    '.zip',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.ico',
    '.woff',
    '.mp3',
    '.mp4',
    '.mov',
    '.swf',
    '.xml',
    '.rss',
    '.atom',
  ];
  // This change fixes confusion between .js and .jsp pages.
  // let skip = invalidURLends.some(urlEnd => url.includes(urlEnd));
  if ((url.indexOf('?') > -1)) {
    url = url.substring(0, url.indexOf('?'));
  }
  if ((url.indexOf('#') > -1)) {
    url = url.substring(0, url.indexOf('#'));
  }
  let skip = invalidURLends.some(urlEnd => url.endsWith(urlEnd));
  return !skip;
};

exports.urlsCrawledObj = {
  scanned: [],
  invalid: [],
  outOfDomain: [],
};

// folder paths
const a11yStorage = '.a11y_storage';

exports.a11yStorage = a11yStorage;

exports.a11yDataStoragePath = `${a11yStorage}/datasets`;

exports.currentResultsFolderPath = 'results/current';

exports.allIssueFileName = 'all_issues';

exports.rootPath = __dirname;

// others
exports.impactOrder = {
  unknown: 0,
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4,
};

exports.wcagWebPage = 'https://www.w3.org/TR/WCAG21/';
exports.axeWebPage = 'https://dequeuniversity.com/rules/axe/4.3/';
