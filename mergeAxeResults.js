/* eslint-disable no-console */
const fs = require('fs-extra');
const path = require('path');
const {
  parse
} = require('json2csv');
const csv = require('csv-parser');
const Mustache = require('mustache');
const axeIssuesList = require('./constants/axeTypes.json');
const wcagList = require('./constants/wcagLinks.json');
const {
  allIssueFileName,
  impactOrder,
  maxHTMLdisplay
} = require('./constants/constants');
const {
  getCurrentTime,
  getStoragePath
} = require('./utils');
const ObjectsToCsv = require('objects-to-csv');
var csv2 = require('csv');


/* There's likely a good reason not to do this */
global.wcagCounts = [];
global.wcagIDsum = [];
global.orderCount = [];
global.id = 0;
global.criticalCount = 0;
global.seriousCount = 0;
global.moderateCount = 0;
global.minorCount = 0;
global.unknownCount = 0;

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
      return Mustache.render(template, {
        impact
      });
    }),
  ).catch(iconError => console.log('Error fetching all icons', iconError));
};

/* Compile final JSON results */
const writeResults = async (allissues, storagePath, htmlElementArray) => {

  console.log("Running writeResults to generate JSON - URLs " + countURLsCrawled + " & " + allissues.length + " errors found.");

  /* Copy without reference to allissues array */
  var shortAllIssuesJSON = []
  try {
    JSON.parse(JSON.stringify(allissues));
    shortAllIssuesJSON = JSON.parse(JSON.stringify(allissues));
  } catch (e) {
    console.log(allissues);
  }

  /* Delete SVG images in copy of allissues and count instances of html errors. */
  let ii = iii = 0;
  for (let i in shortAllIssuesJSON) {
    delete shortAllIssuesJSON[i].disabilityIcons;

    // Count same errors
    var value = shortAllIssuesJSON[i].htmlElement;

    function exists(arr, search) {
      return arr.some(row => row.includes(search));
    }
    if (exists(htmlElementArray, value)) {
      index = htmlElementArray.map(function(x) {
        // return x[1];
        return x[0];
      }).indexOf(value);
      // ++htmlElementArray[index][2];
      ++htmlElementArray[index][1];
    } else {
      // ++iii;
      // htmlElementArray.push([iii, value, 1]);
      htmlElementArray.push([value, 1]);
    }
  }

  /* Store the information about issue order totals (critical, serious, ...) */
  orderCount = [criticalCount, seriousCount, moderateCount, minorCount, unknownCount];

  /* Count the instances of each WCAG error in wcagIDsum and express that in wcagCounts which gets stored  */
  // wcagIDsum.forEach(function (x) { wcagCounts[x] = (wcagCounts[x] || 0) + 1; });

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

  const finalResultsInJson = JSON.stringify({
      startTime: getCurrentTime(),
      count: allissues.length,
      domain: domainURL,
      countURLsCrawled,
      totalTime,
      speed,
      orderCount,
      wcagCounts,
      wappalyzer_short,
      shortAllIssuesJSON,
      htmlElementArray
    },
    null,
    4,
  );
  await fs
    .writeFile(`${storagePath}/reports/compiledResults.json`, finalResultsInJson)
    .catch(writeResultsError => console.log('Error writing to file', writeResultsError));
};

/* Write HTML from JSON to Mustache for whole page content */
const writeHTML = async (allissues, storagePath, htmlElementArray, domain) => {

  // Cycle through WCAG CSV and put together master list.
  // TODO: WCAG 2.1 & 2.2 should be added here. These should be highlighted.
  var wcagLinks = require('./constants/wcagLinks.json');
  var wcagUKlinks = require('./constants/wcagUKlinks.json');
  var wcag21extras = require('./constants/wcag21extras.json');

  // Pull in WCAG name and W3C links
  let wcagIDval = "";
  var totalSentenceCount = totalFleschKincaidGrade = totalDifficultWords = 0;
  for (let a in wcagLinks) {
    wcagIDval = wcagLinks[a].wcag;

    wcagLinks[a].wcag21 = 0;
    for (let c in wcag21extras) {
      if (wcag21extras[c][0] == wcagIDval) {
        console.log("WCAG 2.1")
        wcagLinks[a].wcag21 = 1;
      }
    }
    // Add UK link & role information
    for (let b in wcagUKlinks) {
      if (wcagUKlinks[b][0] == wcagIDval) {
        let desc = "";
        if (wcagUKlinks[b][2] == 'A') {
          desc = wcagUKlinks[b][1] + " (<b>" + wcagUKlinks[b][2] + "</b>";
        } else {
          desc = wcagUKlinks[b][1] + " (" + wcagUKlinks[b][2];
        }
        if (wcagLinks[a].wcag21) {
          desc += " - 2.1"
        }
        wcagLinks[a].desc = desc + ") ";
        if (wcagLinks[a].role) {
          wcagLinks[a].role += ", " + '<a href="' + wcagUKlinks[b][3] + '" target="_blank">' + wcagUKlinks[b][4] + "</a>";
        } else {
          wcagLinks[a].role = '<a href="' + wcagUKlinks[b][3] + '" target="_blank">' + wcagUKlinks[b][4] + "</a>";
        }
      }
    }
  }

  // Sort by impact order (critical, serious, moderate, minor, unknown)
  allissues.sort(function(a, b) {
    return b.order - a.order || b.errorCount - a.errorCount;
  });

  // Replace array of disabilities for string of disabilities for HTML
  var sentenceCountMax = fleschKincaidGradeMax = automatedReadabilityMax = difficultWordsMax = 0;
  for (let i in allissues) {
    if (allissues[i].disabilities != undefined) {
      allissues[i].disabilities = allissues[i].disabilities.toString().replace(/,/g, ' ').toLowerCase();
    } else {
      allissues[i].disabilities = "";
    }

    var sentenceCount = fleschKincaidGrade = difficultWords = 0;
    var page = allissues[i].page

    // Find longest sentences per page.
    if (!((allissues[i].sentenceCount == null) || (allissues[i].sentenceCount == undefined) || (typeof allissues[i].sentenceCount !== 'number'))) {
      totalSentenceCount += allissues[i].sentenceCount;
      if (sentenceCountMax == 0 || allissues[i].sentenceCount > sentenceCountMax) {
        if (!((allissues[i].sentenceCount == null) || (allissues[i].sentenceCount == undefined) || (typeof allissues[i].sentenceCount !== 'number'))) {
          sentenceCount = allissues[i].sentenceCount;
          sentenceCountMax = sentenceCount;
          // console.log("Current max sentence count: " + sentenceCountMax);
        }
      }
    }

    // Find most complicated page.
    if (!((allissues[i].fleschKincaidGrade == null) || (allissues[i].fleschKincaidGrade == undefined) || (typeof allissues[i].fleschKincaidGrade !== 'number'))) {
      totalFleschKincaidGrade += allissues[i].fleschKincaidGrade;
      if (fleschKincaidGradeMax == 0 || allissues[i].fleschKincaidGrade > fleschKincaidGradeMax) {
        if (!((allissues[i].fleschKincaidGrade == null) || (allissues[i].fleschKincaidGrade == undefined) || (typeof allissues[i].fleschKincaidGrade !== 'number'))) {
          fleschKincaidGrade = allissues[i].fleschKincaidGrade;
          fleschKincaidGradeMax = fleschKincaidGrade;
          // console.log("Current max Flesch-Kincai: " + fleschKincaidGradeMax);
        }
      }
    }

    // Find page with most difficult words.
    if (!((allissues[i].difficultWords == null) || (allissues[i].difficultWords == undefined) || (typeof allissues[i].difficultWords !== 'number'))) {
      totalDifficultWords += allissues[i].difficultWords;
      if (allissues[i].difficultWords > difficultWordsMax) {
        difficultWords = allissues[i].difficultWords;
        difficultWordsMax = allissues[i].difficultWords;
        // console.log("Current most number of difficult words: " + difficultWordsMaxText);
      }
    }

    // Find the number of instances for a given HTML error on a page.
    // TODO: Find page with the most axe errors.
    let htmlElement = allissues[i].htmlElement;
    for (let n in htmlElementArray) {
      if (htmlElementArray[n][0] == htmlElement) {
        if (htmlElementArray[n][1] > 1)
          allissues[i].htmlElementCount = "<p><b>" + htmlElementArray[n][1] + " duplicate axe errors. </b>" + "</p>";
      }
    }
    // console.log("Can we provide a list of up to 10 links with the same error? ");
    // console.log(htmlElementArray);
  } // END for (let i in allissues)

  // Create text for HTML report.
  var sentenceCountMaxText = "Average sentences per page: " + Math.round((totalSentenceCount / allissues.length)) + " <b>Most sentences on page: <a href='" + domainURL + page + "' target='_blank'>" + sentenceCountMax + "</a></b>";
  var fleschKincaidGradeMaxText = "Average Flesch–Kincaid grade: " + Math.round((totalFleschKincaidGrade / allissues.length)) + " <b>Page with worst Flesch–Kincaid grade: <a href='" + domainURL + page + "' target='_blank'>" + Math.round(fleschKincaidGradeMax) + "</a></b>";
  var difficultWordsMaxText = "Average difficult words per page: " + Math.round(totalDifficultWords / allissues.length) + " <b>Most difficult words on a page: <a href='" + domainURL + page + "' target='_blank'>" + difficultWordsMax + "</a></b>";

  console.log("Writing results to ./reports/allissues.csv");
  (async () => {
    const csv_a = new ObjectsToCsv(allissues);

    // Save to file:
    await csv_a.toDisk(storagePath + "/reports/allissues.csv");
    // console.log(await csv_a.toString());
  })();

  /* Grading evaluations - */
  if (countURLsCrawled > 25) {
    var grade = message = "";
    var score = (minorCount + (moderateCount * 1.5) + (seriousCount * 2) + (criticalCount * 3)) / (countURLsCrawled * 5);
    console.log("Score (minor) + moderate*1.5 + serious*2 + critical*3 / urls*5 = " + Math.round(score * 100)/100);


    console.log("Writing results to ./reports/count.csv");
    (async () => {
      let count_array = [{
        level: 'minor',
        count: minorCount
      }, {
        level: 'moderate',
        count: moderateCount
      }, {
        level: 'serious',
        count: seriousCount
      }, {
        level: 'critical',
        count: criticalCount
      }, {
        level: 'countURLs',
        count: countURLsCrawled
      }, {
        level: 'score',
        count: score
      }];
      const csv_c = new ObjectsToCsv(count_array);

      // Save to file:
      await csv_c.toDisk(storagePath + "/reports/count.csv");
      // console.log(await csv_c.toString());
    })();

    console.log("Writing HTML report for " + domain);

    // Scoring for grade
    // Score number = score (minor) + moderate*1.5 + serious*2 + critical*3 / urls*5
    // A+ = 0 ; A <= 0.1 ; A- <= 0.3 ; B+ <= 0.5 ; B <= 0.7 ; B- <= 0.9 ; C+ <= 2 ;
    // C <= 4 C- <= 6 ; D+ <= 8 ; D <= 10 ; D- <= 13 ; F+ <= 15 ; F <= 20 ; F- >= 20
    switch (true) {
      case score == 0:
        grade = "A+";
        message = "No axe errors, great! Don't forget manual testing."
        break;
      case score <= 0.1:
        grade = "A";
        message = "Very few axe errors left! Don't forget manual testing."
        break;
      case score <= 0.3:
        grade = "A-";
        message = "So close to getting the automated errors! Don't forget manual testing."
        break;
      case score <= 0.5:
        grade = "B+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 0.7:
        grade = "B";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 0.9:
        grade = "B-";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 2:
        grade = "C+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 4:
        grade = "C";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 6:
        grade = "C-";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 8:
        grade = "D+";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 10:
        grade = "D";
        message = "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 13:
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
    grade = message = "";
    // grade = "?";
    // message = "Not enough URLs to evaluate grade. Perhaps there was an error in the scan.";
  }

  // TODO - Document what this is doing.
  // console.log(wcagCounts)
  var wcagCountsContent = '<ul>';
  var wcagCountsArray = [];
  var wcagCountsArray2 = [];
  for (let ii in wcagCounts) {
    if (wcagCounts[ii].includes(",")) {
      let wcagCountsSplit = wcagCounts[ii].split(",");
      for (let iii in wcagCountsSplit) {
        wcagCountsArray.push(wcagCountsSplit[iii]);
      }
    } else {
      wcagCountsArray.push(wcagCounts[ii]);
    }
  }

  // Count the instances of each WCAG error in wcagIDsum and express that in wcagCounts which gets stored
  wcagCountsArray.forEach(function(x) {
    wcagCountsArray[x] = (wcagCountsArray[x] || 0) + 1;
  });
  var finalWCAGstring = '';
  const finalWCAGarray = [];
  let ii = wcagCountsTemp = 0;
  for (let i in wcagCountsArray) {
    if (typeof wcagCountsArray[i] !== 'function') {
      if (typeof wcagCountsArray[i] == "number") {
        wcagCountsTemp = wcagCountsArray[i];

        // Loop through WCAG errors to provide links & context.
        for (let c in wcagLinks) {
          if (wcagLinks[c].wcag == i) {
            var displayWCAGlink = "<a href ='" + wcagLinks[c].href + "' target='_blank'><b>" + i + ":</b> " + wcagLinks[c].desc + " [" + wcagLinks[c].role + "]</a> - <b>" + wcagCountsTemp + "</b>";
            // console.log(displayWCAGlink);
          }
        }
        wcagCountsContent += "<li>" + displayWCAGlink + '</li>';

        let finalWCAGarrayTemp = {
          wcag: i,
          count: wcagCountsTemp
        };
        finalWCAGarray.push(finalWCAGarrayTemp);
        ++ii
        if (ii == 1) {
          wcagCountsContent = "<h2>WCAG Errors</h2> " + wcagCountsContent;
        }
      }
    }
  }
  wcagCountsContent += "</ul>";

  console.log("Writing " + domain + " results to ./reports/wcagErrors.csv");
  (async () => {
    // finalWCAGarray.unshift("WCAG Errors", "Count")
    const csv_wc = new ObjectsToCsv(finalWCAGarray);
    // Save to file:
    await csv_wc.toDisk(storagePath + "/reports/wcagErrors.csv");
    // console.log(await csv_wc.toString());
  })();

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
        if (wappalyzer_string != "Built with: ") {
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

    // Add if statement to avoid this error
    // node_modules/objects-to-csv/index.js:16
    //   throw new Error('The input to objects-to-csv must be an array of objects.');
    if ((typeof wappalyzer_array['technologies'] == 'array') && (wappalyzer_array['technologies'].length > 0)) {
      (async () => {
        const csv_wa = new ObjectsToCsv(wappalyzer_array['technologies']);

        // Save to file:
        console.log("Writing " + domain + " results to ./reports/wappalyzer.csv");
        await csv_wa.toDisk(storagePath + "/reports/wappalyzer.csv");
        // console.log(await csv_wa.toString());
      })();
    }
  }


  let axeCounts1 = "Critical: " + criticalCount + ", Serious: " + seriousCount;
  let axeCounts2 = "Moderate: " + moderateCount + ", Minor: " + minorCount;
  let axeCounts3 = "";
  if (unknownCount > 0) {
    axeCounts3 = ", Unknown: " + unknownCount;
  }
  axeCountsDescription = "<b>" + axeCounts1 + "</b>, " + axeCounts2 + "<i>" + axeCounts3 + "</i>";

  // score is repeated above but I'm not getting the value without redevinging it.
  var score = (minorCount + (moderateCount * 1.5) + (seriousCount * 2) + (criticalCount * 3)) / (countURLsCrawled * 5);
  console.log(axeCounts1 + ", " + axeCounts2 + axeCounts3 + " Score: " + Math.round(score * 100)/100);
  var someOfErrors = criticalCount + seriousCount + moderateCount + minorCount;
  const axeCountContentArr = JSON.stringify({
      "criticalCount": criticalCount,
      "seriousCount": seriousCount,
      "moderateCount": moderateCount,
      "minorCount": minorCount,
      "criticalCountPercent": Math.round((criticalCount / someOfErrors) * 100),
      "seriousCountPercent": Math.round((seriousCount / someOfErrors) * 100),
      "moderateCountPercent": Math.round((moderateCount / someOfErrors) * 100),
      "minorCountPercent": Math.round((minorCount / someOfErrors) * 100),
      "axeCountsDescription": axeCountsDescription,
    },
    null,
    4,
  );
  const mustacheWCAGbarchart = await fs
    .readFile(path.join(__dirname, '/static/WCAGbarchart.mustache'))
    .catch(templateError => console.log('Error fetching template', templateError));
  const axeCountsContent = Mustache.render(mustacheWCAGbarchart.toString(), JSON.parse(axeCountContentArr));

  const finalResultsInJson = JSON.stringify({
      startTime: getCurrentTime(),
      count: id,
      htmlCount: allissues.length,
      domain,
      countURLsCrawled,
      totalTime,
      speed,
      axeCountsContent,
      wcagCounts,
      grade,
      message,
      wappalyzer_string,
      wcagCountsContent,
      sentenceCountMaxText,
      fleschKincaidGradeMaxText,
      difficultWordsMaxText,
      allissues
    },
    null,
    4,
  );

  const musTemp = await fs
    .readFile(path.join(__dirname, '/static/report.mustache'))
    .catch(templateError => console.log('Error fetching template', templateError));
  const output = Mustache.render(musTemp.toString(), JSON.parse(finalResultsInJson));

  // Test both the read and write permissions
  var reportPath = storagePath + "/reports/report.html"
  fs.access(storagePath, (err) => {
    console.log(`${err ? 'Directory does not exist' : ''}`);
  });

  await new Promise(resolve => setTimeout(resolve, 1000));
  await fs.writeFile(reportPath, output);
};

const flattenAxeResults = async (rPath, storagePath) => {
  const parsedContent = await parseContentToJson(rPath);

  if (typeof parsedContent.readability !== 'undefined' && parsedContent.readability) {
    var sentenceCount = parsedContent.readability.sentenceCount;
    var fleschKincaidGrade = parsedContent.readability.fleschKincaidGrade;
    var difficultWords = parsedContent.readability.difficultWords;
  }

  const flattenedIssues = [];
  const {
    url,
    page,
    errors
  } = parsedContent;
  var plainLanguageIssues = [];
  var fileExtension = pageNew = '';

  errorsPerURL = errors.length;

  errors.forEach(error => {

    /* pull out file extension from path */
    if (page.includes(".") && !page.includes("@")) {
      fileExtension = page.split('.').pop();
      fileExtension = fileExtension.substring(0, fileExtension.indexOf('?'));
      fileExtension = fileExtension.substring(0, fileExtension.indexOf('#'));
      // fileExtension = limit(fileExtension, 6);
    }

    error.fixes.forEach(item => {
      const {
        id: errorId,
        impact,
        description,
        helpUrl
      } = error;
      const {
        disabilityIcons,
        disabilities,
        wcag
      } = axeIssuesList.find(obj => obj.id === errorId) || {};

      ++id;

      /* Get string from wcagID */
      var wcagID = '';
      if (wcag !== undefined) {
        try {
          JSON.parse(JSON.stringify(wcag).toString());
          wcagID = JSON.parse(JSON.stringify(wcag)).toString();
        } catch (e) {
          console.log("Issue loading wcag JSON string in " + id + " when looking up wcag value " + wcag + " on " + page);
          console.log(wcag);
        }
      }

      /* Get links to WCAG */
      const wcagLinks = wcag ?
        wcag.map(element => wcagList.find(obj => obj.wcag === element) || {
          wcag: element
        }) : null;

      /* Count impactOrder, url  */
      if (impactOrder[impact] == 4) {
        ++criticalCount;
      } else if (impactOrder[impact] == 3) {
        ++seriousCount;
      } else if (impactOrder[impact] == 2) {
        ++moderateCount;
      } else if (impactOrder[impact] == 1) {
        ++minorCount;
      } else if (impactOrder[impact] == 0) {
        ++unknownCount;
      } else {
        console.log(impactOrder[impact])
      }

      /* Count number of WCAG issues */
      if (wcagID.length > 0) {
        wcagCounts.push(wcagID);
      }

      // Aggregate plain language issues
      if ((page != pageNew)) {
        // console.log(pageNew + " new and " + page + "page ");
        pageNew = page;

        plainLanguageIssues.push([url, page, sentenceCount, difficultWords, fleschKincaidGrade]);

        (async () => {
          const csv_d = new ObjectsToCsv(plainLanguageIssues);

          // Save to file:
          await csv_d.toDisk(storagePath + "/reports/plainLanguage.csv", {
            append: true
          });
          // console.log(await csv_d.toString());
        })();

      }

      // Count difficult works for eacy page and add to error link
      var languageSummary = '';
      // console.log(page + " page " + fleschKincaidGrade + " fk " + difficultWords  + " dw " + sentenceCount);
      if (!((sentenceCount == null) || (sentenceCount == 'undefined') || (typeof sentenceCount !== 'number') || (sentenceCount <= 2))) {
        languageSummary += sentenceCount + " sentences evaluated. ";
      }
      if (!((difficultWords == null) || (difficultWords == 'undefined') || (typeof difficultWords !== 'number') || (sentenceCount <= 2))) {
        if ((difficultWords / sentenceCount) > 3) {
          languageSummary += "There a lot of difficult words in this page. ";
        }
        // languageSummary += difficultWords + " difficult words; ";
      }
      if (!((fleschKincaidGrade == null) || (fleschKincaidGrade == 'undefined') || (typeof fleschKincaidGrade !== 'number') || (fleschKincaidGrade < 0) || (sentenceCount <= 2))) {
        if (fleschKincaidGrade > 10) {
          languageSummary += "Please <a href='https://hemingwayapp.com/''>review</a> this page for <a href='https://www.plainlanguage.gov/'>plain language</a>. "
        }
        // languageSummary += fleschKincaidGrade + " Flesch Kincaid Grade ";
      }
      // console.log(id + " id " + page + " page & language summary " +  languageSummary);

      /* Build array with all of the issues */
      flattenedIssues.push({
        id,
        url,
        page,
        languageSummary,
        sentenceCount,
        difficultWords,
        fleschKincaidGrade,
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
        errorsPerURL
      });

    }); // End error.fixes.forEach
  }); // errors.forEach(error

  return Promise.all(
    flattenedIssues.map(async issue => {
      const {
        disabilityIcons,
        disabilities,
        impact,
        ...rest
      } = issue;
      const icons = disabilities ? await fetchIcons(disabilities, impact) : null;
      return {
        ...rest,
        impact,
        disabilities,
        disabilityIcons: icons
      };
    }),
  );
};

exports.mergeFiles = async randomToken => {
  const {
    getCurrentTime,
    getHostnameFromRegex
  } = require('./utils');
  const storagePath = getStoragePath(randomToken);
  const directory = `${storagePath}/${allIssueFileName}`;
  let allIssues = [];
  const allFiles = await extractFileNames(directory);

  await Promise.all(
    allFiles.map(async file => {
      const rPath = `${directory}/${file}`;
      const flattenedIssues = await flattenAxeResults(rPath, storagePath);

      allIssues = allIssues.concat(flattenedIssues);

    }),
  ).catch(flattenIssuesError => console.log('Error flattening all issues', flattenIssuesError));

  /* Write the JSON then the HTML - Order Matters */
  if (allFiles.length > 0) {
    console.log("Writing issues to JSON & HTML for: " + domainURL)
    var htmlElementArray = [];
    await writeResults(allIssues, storagePath, htmlElementArray);
    await writeHTML(allIssues, storagePath, htmlElementArray, getHostnameFromRegex(domainURL));
  } else {
    console.log("No entities in allFiles.");
  }

  // Get historical scans for the domain if available.
  const host = getHostnameFromRegex(domainURL);
  var rootDomainPath = "./results/" + host + "_reports/";

  if (fs.existsSync(rootDomainPath)) {
    console.log('The ' + rootDomainPath + ' directory exists, so this scan has been run before.');


        fs.readdir(rootDomainPath, (err, files) => {
          console.log("Display files in each directory.");
          console.log(files);
        })
        var dateFolders = fs.readdirSync(rootDomainPath)

        console.log("Search for prior axe scans. ");
        var date = "";
        const countArray = wcagArray = dateScore = totalArrayAxe2 = totalArrayWCAG2 = [];
        const totalArrayAxe = totalArrayWCAG = [];
        for (let i in dateFolders) {
          date = dateFolders[i];  // Note thate date isn't updating
          var rootDomainPathAndDate = rootDomainPath + "/" + date + "/reports";
          fs.readdir(rootDomainPathAndDate, (err, files) => {
            // console.log(err + " " + files);
          });
          var dateFiles = fs.readdirSync(rootDomainPathAndDate);
          for (let ii in dateFiles) {
            console.log(dateFiles[ii])
/*
            // Load prior axe errors.
            if (dateFiles[ii] == "count.csv") {
              var countCSV = rootDomainPathAndDate + "/count.csv";

              var parser3 = csv2.parse({delimiter: ','}, function(err, data){
                  let lastRowDataCount = data.length-1
                  var lastRow = data[lastRowDataCount];
                  let scoreColunnCount = lastRow.length-1
                  var score = lastRow[scoreColunnCount];
                  totalArrayAxe.push(dateFolders[i], data);
                  console.log("Date: " + dateFolders[i] + " Score: " +  Math.round(score * 100)/100);


                  // Writing aggregated value to disk
                  // console.log("Writing history results to ./reports/axeHistoricalErrors.csv");
                  // (async () => {
                    // finalWCAGarray.unshift("WCAG Errors", "Count")
                    // const csv_aH = new ObjectsToCsv(totalArrayAxe);
                    // Save to file:
                    // await csv_aH.toDisk(storagePath + "/reports/axeHistoricalErrors.csv");
                    // console.log(await csv_wc.toString());
                  })();


              });
// B - Spitting out error to console - Error: ENOENT: no such file or directory, open './results/eng-hiring.18f.gov_reports//2021-11-17/reports/count.csv'

              // try {
              // fs.createReadStream(countCSV).pipe(parser3);
          //  }
            //} catch (e) {
            //  console.log("entering catch block");
            //  console.log(e);
            //  console.log("leaving catch block");
            // }

            }
            // console.log(totalArrayAxe);

            // Load prior WCAG errors.
            if (dateFiles[ii] == "wcagErrors.csv") {
              var wcagCSV = rootDomainPathAndDate + "/wcagErrors.csv";
              var parser4 = csv2.parse({delimiter: ','}, function(err, data){
                  let lastRowDataWCAG = data.length-1
                  var lastRow = data[lastRowDataWCAG];
                  if (lastRow) {
                    let scoreColunnWCAG = lastRow.length-1
                    var score = lastRow[scoreColunnWCAG];
                    totalArrayWCAG.push(dateFolders[i], data);
                  }


                  // Writing aggregated value to disk
                  // console.log("Writing history results to ./reports/wcagHistoricalErrors.csv");
                  // (async () => {
                    // finalWCAGarray.unshift("WCAG Errors", "Count")
                    // const csv_wcH = new ObjectsToCsv(totalArrayWCAG);
                    // Save to file:
                    // await csv_wcH.toDisk(storagePath + "/reports/wcagHistoricalErrors.csv");
                    // console.log(await csv_wc.toString());
                  // })();


              });
              // This is coming up null and overwriting the file.
              // fs.createReadStream(wcagCSV).pipe(parser4);
            }
*/

          } // for (let ii in dateFiles)

          // console.log(totalArrayWCAG2);
          // console.log(totalArrayAxe2);

        } // end of - for (let i in dateFolders)

        if (date === "") {
          console.log("No prior scans found.")
        }

        console.log("Number of prior folders: " + dateFolders.length);

  } else {
      console.log('The ' + rootDomainPath + ' directory does not exist, so this is a new domain.');
  }
}
