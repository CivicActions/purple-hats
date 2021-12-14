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
  getStoragePath,
  getHostnameFromRegex
} = require('./utils');
const ObjectsToCsv = require('objects-to-csv');
const csv2 = require('csv');

var wcagCounts = [];
var orderCount = [];
var id = 0;
var criticalCount = 0;
var seriousCount = 0;
var moderateCount = 0;
var minorCount = 0;
var unknownCount = 0;
var domainURL = '';
var wappalyzer_json = '';

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
const writeResults = async (allissues, storagePath, htmlElementArray,  domainURL, wappalyzer_json, startTime, endTime, speed, totalTime, countURLsCrawled) => {

  console.log(`Running writeResults to generate JSON - URLs ${countURLsCrawled} & ${allissues.length} errors found.`);

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
          wappalyzer_short.push(`${wappalyzer_array['technologies'][x].name} (${wappalyzer_array['technologies'][x].version})`)
        }
        x++
      }
    }
  }

  /* Store the information about issue order totals (critical, serious, ...) */
  orderCount = [criticalCount, seriousCount, moderateCount, minorCount, unknownCount];

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
const writeHTML = async (allissues, storagePath, htmlElementArray, domainURL, wappalyzer_json, startTime, endTime, speed, totalTime, countURLsCrawled) => {

  var domain = getHostnameFromRegex(domainURL);

  // Cycle through WCAG CSV and put together master list.
  // TODO: WCAG 2.1 & 2.2 should be added here. These should be highlighted.
  var wcagLinks = require('./constants/wcagLinks.json');
  var wcagUKlinks = require('./constants/wcagUKlinks.json');
  var wcag21extras = require('./constants/wcag21extras.json');

  // Pull in WCAG name and W3C links
  let wcagIDval = "";
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
          desc = `${wcagUKlinks[b][1]} (<b>${wcagUKlinks[b][2]}</b>`;
        } else {
          desc = `${wcagUKlinks[b][1]} (${wcagUKlinks[b][2]}`;

        }
        if (wcagLinks[a].wcag21) {
          desc += ` - 2.1`
          console.log(`WCAG 2.1 error - ${wcagLinks[a]}`);
        }
        // wcagLinks[a].desc = desc + ") ";

        // If existing link to UK role based documentation, include it.
        wcagLinks[a].desc = `${desc}) `;
        if (wcagUKlinks[b][4] != undefined) {
          if (wcagLinks[a].role) {
            wcagLinks[a].role += `, <a href="${wcagUKlinks[b][3]}" target="_blank">${wcagUKlinks[b][4]}</a>`;
          } else {
            wcagLinks[a].role += `<a href="${wcagUKlinks[b][3]}" target="_blank">${wcagUKlinks[b][4]}</a>`;
          }
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
  var totalSentenceCount = totalFleschKincaidGrade = totalDifficultWords = 0;
  allissues_csv = [];
  for (let i in allissues) {
    var sentenceCount = fleschKincaidGrade = difficultWords = 0;
    var page = allissues[i].page

    if (allissues[i].disabilities != undefined) {
      allissues[i].disabilities = allissues[i].disabilities.toString().replace(/,/g, ' ').toLowerCase();
    } else {
      allissues[i].disabilities = "";
    }

    // Find longest sentences per page.
    if (!((allissues[i].sentenceCount == null) || (allissues[i].sentenceCount == undefined) || (typeof allissues[i].sentenceCount !== 'number'))) {
      totalSentenceCount += allissues[i].sentenceCount;
      // sentenceCountMax = longestSentence(totalSentenceCount, allissues[i].sentenceCount);
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
          // console.log(`Current max Flesch-Kincai: ${fleschKincaidGradeMax}`);
        }
      }
    }

    // Find page with most difficult words.
    if (!((allissues[i].difficultWords == null) || (allissues[i].difficultWords == undefined) || (typeof allissues[i].difficultWords !== 'number'))) {
      totalDifficultWords += allissues[i].difficultWords;
      if (allissues[i].difficultWords > difficultWordsMax) {
        difficultWords = allissues[i].difficultWords;
        difficultWordsMax = allissues[i].difficultWords;
        // console.log(`Current most number of difficult words: ${difficultWordsMaxText}`);
      }
    }

    // Find the number of instances for a given HTML error on a page.
    // TODO: Find page with the most axe errors.
    let htmlElement = allissues[i].htmlElement;
    for (let n in htmlElementArray) {
      if (htmlElementArray[n][0] == htmlElement) {
        if (htmlElementArray[n][1] > 1)
          allissues[i].htmlElementCount = htmlElementArray[n][1];
          // allissues[i].htmlElementCountMessage = `<p><b>${htmlElementArray[n][1]} duplicate errors.</b></p>`;
      }
    }

    // Optimize the array to be exported.
/*
    // Broken if there are multiple wcag results.
    console.log(allissues[i].wcagID);
    if (allissues[i].wcagID) {
      if (wcagLinks.find((el) => el.wcag === allissues[i].wcagID) === 'undefined') {
        console.log(`Something's wrong with ${allissues[i].wcagID}`);
      } else {

        // This seems to be opposite of what I need, but seems to work.
        // Failure seems to occur when an error has more than one WCAG error associated with it.
        if(wcagLinks.find((el) => el.wcag === allissues[i].wcagID) === 'undefined') {
          // console.log(wcagLinks.find((el) => el.wcag === allissues[i].wcagID).href);
          var wcagLinkHref = wcagLinks.find((el) => el.wcag === allissues[i].wcagID).href;

          if (wcagLinks.find((el) => el.wcag === allissues[i].wcagID).wcag21 === 1) {
            wcagLink21 = "2.1"
          } else {
            wcagLink21 = "2.0"
          }

        } else { // Single value
          console.log("Testing 123 " + allissues[i].wcagID)
          console.log(wcagLinks.find((el) => el.wcag === allissues[i].wcagID));
        }

      }
      // TODO: Clean up output so that we can include the description of the WCAG violation & links
      // The the role/desc could be combined if we strip out the URL & strip out the HTML.
      // let wcagLinkRole = wcagLinks.find((el) => el.wcag === allissues[i].wcagID).role;
      // let wcagLinkDesc = wcagLinks.find((el) => el.wcag === allissues[i].wcagID).desc;

    } else {
      var wcagLinkHref = wcagLink21 = "";
    }
    // console.log(wcagLinkHref + " " + wcagLink21);
*/

    allissues_csv[i] = {
      URL:`=HYPERLINK("${allissues[i].url}", "${allissues[i].page}")`,
      error_description:`=HYPERLINK("${allissues[i].helpUrl}", "${allissues[i].description}")`,
      html_error:allissues[i].htmlElement,
      errors_in_page:allissues[i].errorsPerURL,
      duplicate_errors:allissues[i].htmlElementCount,
      // wcag_id:`=HYPERLINK("${wcagLinkHref}", "${allissues[i].wcagID}")`, // dependent on multiple wcag results above being resolved.
      wcag_id:allissues[i].wcagID,
      impact:allissues[i].impact,
      disabilities_affected:allissues[i].disabilities,
      // wcag_version:wcagLink21, // dependent on multiple wcag results above being resolved.
      sentence_count:allissues[i].sentenceCount,
      difficult_words:allissues[i].difficultWords,
      flesch_kincaid_grade:allissues[i].fleschKincaidGrade,
      scan_id:allissues[i].id,
      file_ext:allissues[i].fileExtension
    };

    // console.log("Can we provide a list of up to 10 links with the same error? ");
    // console.log(htmlElementArray);

  } // END for (let i in allissues)

  // console.log(allissues_csv);

  // Write CSV file of all issues - Make function
  // Possibly call from writeResults to have cleaner results
  console.log("Writing results to ./reports/allissues.csv");
  (async () => {
    // const csv_a = new ObjectsToCsv(allissues);
    const csv_a = new ObjectsToCsv(allissues_csv);

    // Save to file:
    await csv_a.toDisk(`${storagePath}/reports/allissues.csv`);
    // console.log(await csv_a.toString());
  })();

  // Create text for HTML report.
  var sentenceCountMaxText = `Average sentences per page:  ${Math.round((totalSentenceCount / allissues.length))} <b>Most sentences on page: <a href="${domainURL + page}" target="_blank">${sentenceCountMax}</a></b>`;
  var fleschKincaidGradeMaxText = `Average Flesch–Kincaid grade: ${Math.round((totalFleschKincaidGrade / allissues.length))} <b>Page with worst Flesch–Kincaid grade: <a href="${domainURL + page}" target="_blank">${Math.round(fleschKincaidGradeMax)}</a></b>`;
  var difficultWordsMaxText = `Average difficult words per page: ${Math.round(totalDifficultWords / allissues.length)} <b>Most difficult words on a page: <a href="${domainURL + page}" target="_blank">${difficultWordsMax}</a></b>`;

  // This should be written for every crawl - Make function
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
    await csv_c.toDisk(`${storagePath}/reports/count.csv`);
    // console.log(await csv_c.toString());
  })();

  console.log(`Writing HTML report for ${domain}`);

  // Calculate score to 2 decimal places - Make function
  var score = Math.round((criticalCount*3 + seriousCount*2 + moderateCount*1.5 + minorCount) / (countURLsCrawled*5)*100) / 100;
  console.log(`Score (critical*3 + serious*2 + moderate*1.5 + minor)/ urls*5:  ((${criticalCount})*3 + (${seriousCount})*2 + (${moderateCount})*1.5  + (${minorCount})) / (${countURLsCrawled})*5 = ${score}`);

  var axeCounts1 = `Critical: ${criticalCount}, Serious: ${seriousCount} `;
  var axeCounts2 = `Moderate: ${moderateCount}, Minor: ${minorCount}`;
  var axeCounts3 = "";
  if (unknownCount > 0) {
    axeCounts3 = `, Unknown: ${unknownCount}`;
  }
  var axeCountsDescription = `<b>${axeCounts1}</b>, ${axeCounts2}<i>${axeCounts3}</i>`;


  var message = `${axeCounts1}, ${axeCounts2} ${axeCounts3} in ${countURLsCrawled} `;
  message += `<br>(${criticalCount*3} + ${seriousCount*2} + ${moderateCount*1.5} + ${minorCount}) / ${countURLsCrawled*5} = ${score} <br>`;

  // Give grades if enough URLs have been called - Make function
  // Possibly define in the constant.js file.
  if (countURLsCrawled > 25) {
    var grade = '';

    // Scoring for grade
    // Score  = (critical*3 + serious*2 + moderate*1.5 minor) / urls*5
    // A+ = 0 ; A <= 0.1 ; A- <= 0.3 ;
    // B+ <= 0.5 ; B <= 0.7 ; B- <= 0.9 ;
    // C+ <= 2 ; C <= 4 C- <= 6 ;
    // D+ <= 8 ; D <= 10 ; D- <= 13 ;
    // F+ <= 15 ; F <= 20 ; F- >= 20 ;
    switch (true) {
      case score == 0: // Jump by .25
        grade = "A+";
        message += "No axe errors, great! Have you tested with a screen reader?"
        break;
      case score <= 0.25:
        grade = "A";
        message += "Very few axe errors left! Don't forget manual testing."
        break;
      case score <= 0.5:
        grade = "A-";
        message += "So close to getting the automated errors! Remember keyboard only testing."
        break;
      case score <= 0.75: // Jump by 1.5
        grade = "B+";
        message += "More work to eliminate automated testing errors. Have you tested zooming the in 200% with your browser."
        break;
      case score <= 2.25:
        grade = "B";
        message += "More work to eliminate automated testing errors. Are the text alternatives meaningful?"
        break;
      case score <= 5.25:
        grade = "B-";
        message += "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 5.25: // Jump by 2
        grade = "C+";
        message += "More work to eliminate automated testing errors. Have you tested in grey scale to see color isn't conveying meaning?"
        break;
      case score <= 7.25:
        grade = "C";
        message += "More work to eliminate automated testing errors. Have you checked if gradients or background images making it difficult to read text?"
        break;
      case score <= 9.25:
        grade = "C-";
        message += "More work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 11:  // Jump by 3 (and round down to 11)
        grade = "D+";
        message += "A lot more work to eliminate automated testing errors. Most WCAG success criterion can be fully automated."
        break;
      case score <= 14:
        grade = "D";
        message += "A lot more work to eliminate automated testing errors. Don't forget manual testing."
        break;
      case score <= 17:
        grade = "D-";
        message += "A lot more work to eliminate automated testing errors. Can users navigate your site without using a mouse?"
        break;
      case score <= 20:  // Jump by 4
        grade = "F+";
        message += "A lot more work to eliminate automated testing errors. Are there keyboard traps that stop users from navigating the site?"
        break;
      // case score <= 24: grade = "F-";
      default:
        grade = "F";
        message += "A lot more work to eliminate automated testing errors. Considerable room for improvement."
        break;
    }
  } else {
    grade = 'NA';
    message += "Not enough URLs to evaluate grade or perhaps there was an error in the scan.";
  }
  console.log(`Grade (v2) ${grade} - ${message}`)

  // Count the number of errors per WCAG SC - Make function
  // TODO - Document how this works.
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
            var displayWCAGlink = `<a href="${wcagLinks[c].href}" target='_blank'><b>${i}:</b> ${wcagLinks[c].desc} [${wcagLinks[c].role}]</a> - <b>${wcagCountsTemp}</b>`;
            // console.log(displayWCAGlink);
          }
        }
        wcagCountsContent += `<li>${displayWCAGlink}</li>`;

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

  console.log(`Writing ${domain} results to ./reports/wcagErrors.csv`);
  (async () => {
    // finalWCAGarray.unshift("WCAG Errors", "Count")
    const csv_wc = new ObjectsToCsv(finalWCAGarray);
    // Save to file:
    await csv_wc.toDisk(`${storagePath}/reports/wcagErrors.csv`);
    // console.log(await csv_wc.toString());
  })();

  if (allissues.length > maxHTMLdisplay) allissues.length = maxHTMLdisplay;

  // Add information about environment if possible - Make function
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
          wappalyzer_string += `${wappalyzer_array['technologies'][x].name} (${wappalyzer_array['technologies'][x].version})`;
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
        console.log(`Writing ${domain} results to ./reports/wappalyzer.csv`);
        await csv_wa.toDisk(`${storagePath} /reports/wappalyzer.csv`);
        // console.log(await csv_wa.toString());
      })();
    }
  }

  // console.log(`${axeCounts1}, ${axeCounts2}${axeCounts3} Score: ${Math.round(score * 100)/100}`);
  var sumOfErrors = criticalCount + seriousCount + moderateCount + minorCount;
  const axeCountContentArr = JSON.stringify({
      "criticalCount": criticalCount,
      "seriousCount": seriousCount,
      "moderateCount": moderateCount,
      "minorCount": minorCount,
      "criticalCountPercent": Math.round((criticalCount / sumOfErrors) * 100),
      "seriousCountPercent": Math.round((seriousCount / sumOfErrors) * 100),
      "moderateCountPercent": Math.round((moderateCount / sumOfErrors) * 100),
      "minorCountPercent": Math.round((minorCount / sumOfErrors) * 100),
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
  var reportPath = `${storagePath}/reports/report.html`;
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

      // TODO: strip characters after ? * #
      // fileExtension = fileExtension.substring(0, fileExtension.indexOf('?'));
      // fileExtension = fileExtension.substring(0, fileExtension.indexOf('#'));
      // fileExtension = limit(fileExtension, 6);

      console.log(`File extension: ${fileExtension}`);
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
          console.log(`Issue loading wcag JSON string in ${id} when looking up wcag value ${wcag} on ${page}`);
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
        // console.log(`${pageNew} new and ${page} page`);
        pageNew = page;

        plainLanguageIssues.push([url, page, sentenceCount, difficultWords, fleschKincaidGrade]);

        (async () => {
          const csv_d = new ObjectsToCsv(plainLanguageIssues);

          // Save to file:
          await csv_d.toDisk(`${storagePath}/reports/plainLanguage.csv`, {
            append: true
          });
          // console.log(await csv_d.toString());
        })();

      }

      // Count difficult works for eacy page and add to error link
      var languageSummary = '';
      // console.log(`${page} page ${fleschKincaidGrade} fk ${difficultWords} dw ${sentenceCount}`);
      if (!((sentenceCount == null) || (sentenceCount == 'undefined') || (typeof sentenceCount !== 'number') || (sentenceCount <= 2))) {
        languageSummary += `${sentenceCount} sentences evaluated. `;
      }
      if (!((difficultWords == null) || (difficultWords == 'undefined') || (typeof difficultWords !== 'number') || (sentenceCount <= 2))) {
        if ((difficultWords / sentenceCount) > 3) {
          languageSummary += "There a lot of difficult words in this page. ";
        }
        // languageSummary += `${difficultWords} difficult words; `;
      }
      if (!((fleschKincaidGrade == null) || (fleschKincaidGrade == 'undefined') || (typeof fleschKincaidGrade !== 'number') || (fleschKincaidGrade < 0) || (sentenceCount <= 2))) {
        if (fleschKincaidGrade > 10) {
          languageSummary += "Please <a href='https://hemingwayapp.com/'>review</a> this page for <a href='https://www.plainlanguage.gov/'>plain language</a>. "
        }
        // languageSummary += `${fleschKincaidGrade} Flesch Kincaid Grade `;
      }
      // console.log(`${id} id ${page} page & language summary ${languageSummary}`);

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

exports.mergeFiles = async (randomToken, domainURL, wappalyzer_json, startTime, endTime, speed, totalTime, countURLsCrawled) => {
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
    console.log(`Writing issues to JSON & HTML for: ${domainURL}`)
    var htmlElementArray = [];
    await writeResults(allIssues, storagePath, htmlElementArray, domainURL, wappalyzer_json, startTime, endTime, speed, totalTime, countURLsCrawled);
    await writeHTML(allIssues, storagePath, htmlElementArray, domainURL, wappalyzer_json, startTime, endTime, speed, totalTime, countURLsCrawled); // should be able to eliminate getHostnameFromRegex(domainURL)
  } else {
    console.log("No entities in allFiles.");
  }

  // Get historical scans for the domain if available.
  const host = getHostnameFromRegex(domainURL);
  var rootDomainPath = `./results/${host}_reports/`;

  if (fs.existsSync(rootDomainPath)) {
    console.log(`The ${rootDomainPath} directory exists, so this scan has been run before.`);

        fs.readdir(rootDomainPath, (err, files) => {
          console.log("Display directories.");
          console.log(files);
        })
        var dateFolders = fs.readdirSync(rootDomainPath)

        console.log("Search for prior axe scans. ");
        var date = "";
        const countArray = wcagArray = dateScore = totalArrayAxe2 = totalArrayWCAG2 = [];
        const totalArrayAxe = totalArrayWCAG = [];
        var aggregateAxeCount = aggregateWCAG = [];
        for (let i in dateFolders) {
          date = dateFolders[i];  // Note thate date isn't updating
          var rootDomainPathAndDate = `${rootDomainPath}/${date}/reports`;
          fs.readdir(rootDomainPathAndDate, (err, files) => {
            // console.log(`${err} ${files}`);
          });

          var dateFiles = fs.readdirSync(rootDomainPathAndDate);
          for (let ii in dateFiles) {
            // if (dateFiles[ii].endsWith('csv')) { console.log(dateFiles[ii]); }

            // Load prior axe errors.
            if (dateFiles[ii] == "count.csv") {
              var countCSV = `${rootDomainPathAndDate}/count.csv`;
              console.log(`Found prior axe errors - ${countCSV}`);

              fs.readFile(countCSV, 'utf8', function (err, data) {
                if (data != undefined) {
                  var dataArray = data.split(/\r?\n/);
                  aggregateAxeCount[date] = [
                    dataArray[1].slice(6), // 'minor,58',
                    dataArray[2].slice(9), // 'moderate,1309',
                    dataArray[3].slice(8), // 'serious,1015',
                    dataArray[4].slice(9), // 'critical,2',
                    dataArray[5].slice(9), // 'countURLs,995',
                    dataArray[6].slice(6) // 'score,0.8155778894472362',
                  ];
                  console.log(`Date: ${date}`);
                  console.log(`Parsed array: ${dataArray}`);
                  console.log(`Aggregated aray: ${aggregateAxeCount}`);
                }
              });
            }

            // Load prior axe errors.
            if (dateFiles[ii] == "wcagErrors.csv") {
              var wcagErrorsCSV = `${rootDomainPathAndDate}/wcagErrors.csv`;
              console.log(`Found prior WCAG errors - ${wcagErrorsCSV}`);

              fs.readFile(wcagErrorsCSV, 'utf8', function (err2, data2) {
                if (data2 != undefined) {
                  var dataArray2 = data2.split(/\r?\n/);
                  aggregateWCAG[date] = [dataArray2];
                  console.log(`Date: ${date}`);
                  console.log(`Parsed wcag array: ${dataArray2}`);
                  console.log(`Aggregated wcag aray: ${aggregateWCAG}`);
                }
              });
            }


/* This probably isn't needed
              var parser3 = csv2.parse({delimiter: ','}, function(err, data) {
                  console.log(data);
                  console.log(err);
                  let lastRowDataCount = data.length-1
                  var lastRow = data[lastRowDataCount];
                  let scoreColunnCount = lastRow.length-1
                  var score = lastRow[scoreColunnCount];
                  totalArrayAxe.push(dateFolders[i], data);
                  console.log(totalArrayAxe);
                  console.log(`Date: ${dateFolders[i]} Score: ${Math.round(score * 100)/100}`);
                  // Writing aggregated value to disk
                  console.log("Writing history results to ./reports/axeHistoricalErrors.csv");
                  (async () => {
                     finalWCAGarray.unshift("WCAG Errors", "Count")
                     const csv_aH = new ObjectsToCsv(aggregateAxeCount);
                     // Save to file:
                     await csv_aH.toDisk(`${storagePath}/reports/axeHistoricalErrors.csv`);
                     console.log(await csv_wc.toString());
                   })();
              });
            */

/*
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
              console.log(dateFiles[ii]);
              var wcagCSV = `${rootDomainPathAndDate}/wcagErrors.csv`;
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
                    // await csv_wcH.toDisk(`${storagePath}/reports/wcagHistoricalErrors.csv`);
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

        console.log(`Number of prior folders: ${dateFolders.length}`);

  } else {
      console.log(`The ${rootDomainPath} directory does not exist, so this is a new domain.`);
  }
}
