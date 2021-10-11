// for crawlers
exports.axeScript = 'node_modules/axe-core/axe.min.js';

exports.maxRequestsPerCrawl = 500;
// exports.absoluteMaxRequestsPerCrawl = 5000; // I'd like to be able to override this at the command line.

exports.maxHTMLdisplay = 250;

exports.waitTime = 0;

exports.maxConcurrency = 5;

// CHECK - utils.js has very similar const invalidURLends.
exports.pseudoUrls = host => [
  // eslint-disable-next-line no-useless-escape
  `[.*(?<!mailto.*)]${host}[(?!.*\.(gif|jpg|jpeg|png|webp|avif|pdf|epub|mobi|doc|docx|css|svg|js|ts|xml|csv|tgz|zip|xls|xlsx|ppt|pptx|ico|woff)).*]`,
];

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
