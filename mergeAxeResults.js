/* eslint-disable no-console */
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');
const axeIssuesList = require('./constants/axeTypes.json');
const wcagList = require('./constants/wcagLinks.json');
const { allIssueFileName, impactOrder, maxHTMLdisplay } = require('./constants/constants');
const { getCurrentTime, getStoragePath } = require('./utils');

/* There's likely a good reason not to do this */
global.wcagCounts = [];
global.wcagIDsum = [];
global.orderCount = [];
global.id = 0;
global.criticalCount = 0;
global.seriousCount = 0;
global.moderateCount = 0;
global.minorCount = 0;

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
  try {
    JSON.parse(JSON.stringify(allissues));
    shortAllIssuesJSON = JSON.parse(JSON.stringify(allissues));
  } catch (e) {
    console.log(allissues);
  }



  /* Delete SVG images in copy of allissues */
  for (let i in shortAllIssuesJSON) {
   delete shortAllIssuesJSON[i].disabilityIcons;
  }

  /* Store the information about issue order totals (critical, serious, ...) */
  orderCount = [criticalCount, seriousCount, moderateCount, minorCount];

  /* Count the instances of each WCAG error in wcagIDsum and express that in wcagCounts which gets stored  */
  wcagIDsum.forEach(function (x) { wcagCounts[x] = (wcagCounts[x] || 0) + 1; });

    /* add information about environment to array. */
    if (wappalyzer_json != null) {
      var wappalyzer_array = ''
      try {
        JSON.parse(wappalyzer_json);
        wappalyzer_array = JSON.parse(wappalyzer_json);
      } catch (e) {
        console.log(wappalyzer_json);
      }

      let x = 0
      var wappalyzer_short = [];

      if (wappalyzer_array['technologies']) {
        while (x < wappalyzer_array['technologies'].length) {
          if (wappalyzer_array['technologies'][x].version == null) {
            wappalyzer_short.push(wappalyzer_array['technologies'][x].name)
          } else {
            wappalyzer_short.push(wappalyzer_array['technologies'][x].name + " (" + wappalyzer_array['technologies'][x].version + ")")
          }
          x++
        }
      }
    }

  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: allissues.length, domain: domainURL, countURLsCrawled, totalTime, orderCount, wcagCounts, wappalyzer_short, shortAllIssuesJSON },
    null,
    4,
  );
  await fs
    .writeFile(`${storagePath}/reports/compiledResults.json`, finalResultsInJson)
    .catch(writeResultsError => console.log('Error writing to file', writeResultsError));
};

/* Write HTML from JSON to Mustache for whole page content */
const writeHTML = async (allissues, storagePath) => {

  /* Sort by impact order (critical, serious, moderate, minor)
  TODO: Would be good to add to the sort order to rank based on errors per page as well as seriousness */
  allissues.sort(function (a, b) {
    return b.order - a.order;
  });

  /* Replace array of disabilities for string of disabilities for HTML */
  for (let i in allissues) {
    if(allissues[i].disabilities != undefined) {
      allissues[i].disabilities = allissues[i].disabilities.toString().replace(/,/g, ' ').toLowerCase();
    } else {
      allissues[i].disabilities = "";
    }
  }

  console.log("countURLsCrawled " + countURLsCrawled);
  console.log("score " + score);

  /* Grading evaluations - */
  if (countURLsCrawled > 25) {
  var grade = message = "";
  var score = (minorCount + (moderateCount * 1.5) + (seriousCount * 2) + (criticalCount * 3)) / (countURLsCrawled * 5);
  switch (true) {
    case score == 0:
        grade = "A+";
        message = "No axe errors, great! Don't forget manual testing."
        break;
    case score <= 0.1:
        grade = "A";
        message = "Very few axe errors left! Don't forget manual testing."
        break;
    case score <= 0.2:
        grade = "A-";
        message = "So close to getting the automated errors! Don't forget manual testing."
        break;
    case score <= 0.3:
        grade = "B+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 0.4:
        grade = "B";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 0.5:
        grade = "B-";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 1:
        grade = "C+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 2:
        grade = "C";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 3:
        grade = "C-";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 4:
        grade = "D+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 5:
         grade = "D";
         message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 10:
        grade = "D-";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 15:
        grade = "F+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    case score <= 20:
        grade = "F";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
    default:
        grade = "F-";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
    }
  } else {
    grade = "?";
    message = "Not enough URLs to evaluate grade. Perhaps there was an error in the scan.";
  }

  /* Mustache needs to somehow spit out wcagCounts info maybe in - {{wcagCounts}} {{{.}}} {{/wcagCounts}} */

  if (allissues.length > maxHTMLdisplay) allissues.length = maxHTMLdisplay;

    /* add information about environment if possible. */
    if (wappalyzer_json != null) {
      var wappalyzer_array = ''
      try {
        JSON.parse(wappalyzer_json);
        wappalyzer_array = JSON.parse(wappalyzer_json);
      } catch (e) {
        console.log(wappalyzer_json);
      }

      /* Define string of libraries used. */
      let x = 0
      if (wappalyzer_array['technologies']) {
        var wappalyzer_string = "Built with: "
        while (x < wappalyzer_array['technologies'].length) {
          if(wappalyzer_string != "Built with: ") {
            wappalyzer_string += ", "
          }
          if (wappalyzer_array['technologies'][x].version == null) {
            wappalyzer_string += wappalyzer_array['technologies'][x].name
          } else {
            wappalyzer_string += wappalyzer_array['technologies'][x].name + " (" + wappalyzer_array['technologies'][x].version + ")"
          }
          x++
        }
      }
    }

  const finalResultsInJson = JSON.stringify(
    { startTime: getCurrentTime(), count: id, htmlCount: allissues.length, domain: domainURL, countURLsCrawled, totalTime, criticalCount, seriousCount, moderateCount, minorCount, wcagCounts, grade, message, wappalyzer_string, allissues },
    null,
    4,
  );
  const musTemp = await fs
    .readFile(path.join(__dirname, '/static/report.mustache'))
    .catch(templateError => console.log('Error fetching template', templateError));
  const output = Mustache.render(musTemp.toString(), JSON.parse(finalResultsInJson));
  fs.access(storagePath, (err) => {
    console.log(`Directory ${err ? 'does not exist' : 'exists'}`);
  });

  // await new Promise(resolve => setTimeout(resolve, 5000));
  var reportPath = storagePath + "/reports/report.html"

  await fs.writeFile(reportPath, output);

/* Test both the read and write permissions
> fs.access(reportPath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
>   console.log('\n> Checking Permission for reading" + " and writing to file');
>   if (err)
>     console.error('No Read and Write access');
>   else
>     await fs.writeFile(reportPath, output);
>   });
337,338d356
<   } else {
<     console.log("No entities in allFiles");
*/

};


const flattenAxeResults = async rPath => {
  const parsedContent = await parseContentToJson(rPath);
  const flattenedIssues = [];
  const { url, page, errors } = parsedContent;
  errors.forEach(error => {

    /* pull out file extension from path */
    var fileExtension = '';
    if (page.includes(".") && !page.includes("@")) {
       fileExtension = page.split('.').pop();
       fileExtension = fileExtension.substring(0, fileExtension.indexOf('?'));
       fileExtension = fileExtension.substring(0, fileExtension.indexOf('#'));
       // fileExtension = limit(fileExtension, 6);
    }

    error.fixes.forEach(item => {
      const { id: errorId, impact, description, helpUrl } = error;
      const { disabilityIcons, disabilities, wcag } = axeIssuesList.find(obj => obj.id === errorId) || {};

      ++id;

      // If an array needs to be excluded, skip to the next one.
      if (!excludeExtArr.includes(fileExtension)) {

        /* Get string from wcagID */
        var wcagID = '';
        try {
          JSON.parse(JSON.stringify(wcag).toString());
          wcagID = JSON.parse(JSON.stringify(wcag)).toString();
        } catch (e) {
          console.log("WCAG ID JSON Issue " + id + " " + wcagID + " " + page);
        }

        /* Get links to WCAG */
        const wcagLinks = wcag
          ? wcag.map(element => wcagList.find(obj => obj.wcag === element) || { wcag: element }) : null;

        /* Count impactOrder, url  */
        if (impactOrder[impact] == 3) { ++criticalCount; }
        else if (impactOrder[impact] == 2) { ++seriousCount; }
        else if (impactOrder[impact] == 1) { ++moderateCount; }
        else if (impactOrder[impact] == 0) { ++minorCount; }
        else { console.log(impactOrder[impact]) }

        /* Count number of WCAG issues */
        if (wcagID.length > 0 ) {
          wcagCounts.push(wcagID);
        }

        /* Build array with all of the issues */
        flattenedIssues.push({
          id,
          url,
          page,
          fileExtension,
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
      }
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

  /* Write the JSON then the HTML - Order Matters */
  if(allFiles.length > 0) {
    console.log("Writing issues to JSON & HTML.")
    await writeResults(allIssues, storagePath);
    await writeHTML(allIssues, storagePath);
  } else {
    console.log("No entities in allFiles.");
  }

};
