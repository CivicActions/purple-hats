const Apify = require('apify');
const axe = require('axe-core');
const { axeScript } = require('../constants/constants');

const filterAxeResults = (results, host) => {
  const { violations, url } = results;
  const page = url.split(host)[1];

  const errors = violations.map(violation => {
    const { id, nodes, help, impact, helpUrl, errorCount } = violation;
    const fixes = nodes.map(node => {
      return {
        htmlElement: node.html,
      };
    });
    return {
      id,
      description: help,
      impact,
      helpUrl,
      fixes,
    };
  });
  return {
    url,
    page,
    errors,
    errorCount: results.violations.length,
  };
};

exports.runAxeScript = async (page, host) => {
  await Apify.utils.puppeteer.injectFile(page, axeScript);
  const results = await page.evaluate(() => {
    axe.configure({
      branding: {
        application: 'purple-hats',
      },
      reporter: 'no-passes',
    });
    return axe.run({
      resultTypes: ['violations'],
    });
  });
  return filterAxeResults(results, host);
};

exports.createApifySubFolders = async randomToken => {
  const dataset = await Apify.openDataset(randomToken);
  const requestQueue = await Apify.openRequestQueue(randomToken);
  return { dataset, requestQueue };
};

exports.gotoFunction = async ({ request, page }) => {

  // reduce duplication of redirects - https://github.com/puppeteer/puppeteer/issues/1132#issuecomment-393724933
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.isNavigationRequest() && request.redirectChain().length)
      request.abort();
    else
      request.continue();
  });

  return page.goto(request.url, { waitUntil: 'networkidle2' }, { timeout: 30000 });
};

exports.handleFailedRequestFunction = async ({ request }) => {
  Apify.utils.log.error(`Failed Request - ${request.url}: ${request.errorMessages}`);
};
