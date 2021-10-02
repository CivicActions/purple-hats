/* eslint-disable no-console */
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');
const axeIssuesList = require('./constants/axeTypes.json');
const wcagList = require('./constants/wcagLinks.json');
const { allIssueFileName, impactOrder, maxHTMLdisplay } = require('./constants/constants');
const { getCurrentTime, getStoragePath } = require('./utils');

const extractFileNames = async directory => {
  const allFiles = await fs
    .readdir(directory)
    .catch(readdirError => console.log('Error reading file', readdirError));
  return allFiles.filter(file => path.extname(file).toLowerCase() === '.json');
};

const parseContentToJson = async rPath => {
  const content = await fs
    .readFile(rPath, 'utf8')
    .catch(parseError => console.log('Error parsing JSON string', parseError));
  return JSON.parse(content);
};

const fetchIcons = async (disabilities, impact) => {
  return Promise.all(
    disabilities.map(async disability => {
      const template = await fs
        .readFile(path.join(__dirname, `/static/${disability}.mustache`), 'utf8')
        .catch(iconError => console.log('Error fetching icon', iconError));
      return Mustache.render(template, { impact });
    }),
  ).catch(iconError => console.log('Error fetching all icons', iconError));
};

/* Compile final JSON results */
const writeResults = async (allissues, storagePath) => {

  /* Copy without reference to allissues array */
  var shortAllIssuesJSON = []
  shortAllIssuesJSON = JSON.parse(JSON.stringify(allissues));

  /* Delete SVG images in copy of allissues */
  for (let i in shortAllIssuesJSON) {
   delete shortAllIssuesJSON[i].disabilityIcons;
  }

  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: allissues.length, domain: domainURL, countURLsCrawled, totalTime, shortAllIssuesJSON },
    null,
    4,
  );
  await fs
    .writeFile(`${storagePath}/reports/compiledResults.json`, finalResultsInJson)
    .catch(writeResultsError => console.log('Error writing to file', writeResultsError));
};

/* Write HTML from JSON to Mustache for whole page content */
const writeHTML = async (allissues, storagePath) => {

  /* Sort by impact order (critical, serious, moderate, minor)  */
  allissues.sort(function (a, b) {
    return b.order - a.order;
  });

  /* Replace array of disabilities for string of disabilities for HTML */
  /* NOTE THIS SHOULD NOT CHANGE IN THE COMPILED JSON FILE BUT DOES! */

  for (let i in allissues) {
    allissues[i].disabilities = allissues[i].disabilities.toString().replace(/,/g, ' ').toLowerCase();
  }

  /* Count impactOrder, url  */
  let criticalCount = seriousCount = moderateCount = minorCount = order = 0;
  for (var i in allissues) {
    order = allissues[i].order;
    if (order == 3) { ++criticalCount;  }
    else if (order == 2) { ++seriousCount; }
    else if (order == 1) { ++moderateCount; }
    else if (order == 0) { ++minorCount; }
    else { }
    allissues[i].id = i;
  }
  i++;

  if (allissues.length > maxHTMLdisplay) allissues.length = maxHTMLdisplay;

  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: i, htmlCount: allissues.length, domain: domainURL, countURLsCrawled, totalTime, criticalCount, seriousCount, moderateCount, minorCount, allissues },
    null,
    4,
  );
  const musTemp = await fs
    .readFile(path.join(__dirname, '/static/report.mustache'))
    .catch(templateError => console.log('Error fetching template', templateError));
  const output = Mustache.render(musTemp.toString(), JSON.parse(finalResultsInJson));
  await fs.writeFile(`${storagePath}/reports/report.html`, output);
};

const flattenAxeResults = async rPath => {
  const parsedContent = await parseContentToJson(rPath);

  const flattenedIssues = [];
  var id = 1;
  const { url, page, errors } = parsedContent;
  errors.forEach(error => {
    error.fixes.forEach(item => {
      const { id: errorId, impact, description, helpUrl } = error;
      const { disabilityIcons, disabilities, wcag } = axeIssuesList.find(obj => obj.id === errorId) || {};

      var wcagID = '';
      wcagID = JSON.parse(JSON.stringify(wcag)).toString();

      const wcagLinks = wcag
        ? wcag.map(element => wcagList.find(obj => obj.wcag === element) || { wcag: element })
        : null;
      ++id;

      flattenedIssues.push({
        id,
        url,
        page,
        description,
        impact,
        helpUrl,
        htmlElement: item.htmlElement,
        order: impactOrder[impact],
        wcagID,
        wcagLinks,
        disabilities,
        disabilityIcons,
      });
    });
  });

  return Promise.all(
    flattenedIssues.map(async issue => {
      const { disabilityIcons, disabilities, impact, ...rest } = issue;
      const icons = disabilities ? await fetchIcons(disabilities, impact) : null;
      return { ...rest, impact, disabilities, disabilityIcons: icons };
    }),
  );
};

exports.mergeFiles = async randomToken => {
  const storagePath = getStoragePath(randomToken);
  const directory = `${storagePath}/${allIssueFileName}`;
  let allIssues = [];
  const allFiles = await extractFileNames(directory);

  await Promise.all(
    allFiles.map(async file => {
      const rPath = `${directory}/${file}`;
      const flattenedIssues = await flattenAxeResults(rPath);

      allIssues = allIssues.concat(flattenedIssues);

    }),
  ).catch(flattenIssuesError => console.log('Error flattening all issues', flattenIssuesError));

  await writeResults(allIssues, storagePath);
  await writeHTML(allIssues, storagePath);
};
