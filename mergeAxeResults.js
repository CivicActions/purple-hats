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
const writeResults = async (allissues, storagePath) => {

  /* Copy without reference to allissues array */
  var shortAllIssuesJSON = []
  try {
    JSON.parse(JSON.stringify(allissues));
    shortAllIssuesJSON = JSON.parse(JSON.stringify(allissues));
  } catch (e) {
    console.log(allissues);
  }

  console.log("Writing JSON countURLsCrawled " + countURLsCrawled + " and " + allissues.length + " errors found.");

  /* Delete SVG images in copy of allissues */
  for (let i in shortAllIssuesJSON) {
    delete shortAllIssuesJSON[i].disabilityIcons;
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
      shortAllIssuesJSON
    },
    null,
    4,
  );
  await fs
    .writeFile(`${storagePath}/reports/compiledResults.json`, finalResultsInJson)
    .catch(writeResultsError => console.log('Error writing to file', writeResultsError));
};

/* Write HTML from JSON to Mustache for whole page content */
const writeHTML = async (allissues, storagePath) => {

  // Sort by impact order (critical, serious, moderate, minor, unknown)
  allissues.sort(function (a, b) {
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

    var sentenceCount = fleschKincaidGrade = difficultWordsMax = 0;
    var page = allissues[i].page
    if (sentenceCountMax == 0 || allissues[i].sentenceCount > sentenceCountMax) {
      if (!((allissues[i].sentenceCount == null) || (allissues[i].sentenceCount == undefined) || (typeof allissues[i].sentenceCount !== 'number'))) {
        sentenceCount = allissues[i].sentenceCount;
        sentenceCountMax = sentenceCount;
      }
      var sentenceCountMaxText = "Most sentences on page: " + sentenceCountMax + " - <a href='" + domainURL + page + "'>" + page + "</a>";
    }
    if (fleschKincaidGradeMax == 0 || allissues[i].fleschKincaidGrade > fleschKincaidGradeMax) {
      if (!((allissues[i].fleschKincaidGrade == null) || (allissues[i].fleschKincaidGrade == undefined) || (typeof allissues[i].fleschKincaidGrade !== 'number'))) {
        fleschKincaidGrade = allissues[i].fleschKincaidGrade;
        fleschKincaidGradeMax = fleschKincaidGrade;
      }
      var fleschKincaidGradeMaxText = "Worst Flesch Kincaid score: " + fleschKincaidGradeMax + " - <a href='" + domainURL + page + "'>" + page + "</a>";
    }
    if ((difficultWordsMax == 0) || (allissues[i].difficultWords > difficultWordsMax)) {
      if (!((allissues[i].difficultWords == null) || (allissues[i].difficultWords == undefined) || (typeof allissues[i].difficultWords !== 'number'))) {
        difficultWords = allissues[i].difficultWords;
        difficultWordsMax = allissues[i].difficultWords;
      }
      if (allissues[i].difficultWords != 0) {
        var difficultWordsMaxText = "Most difficult words: " + difficultWordsMax + " - <a href='" + domainURL + page + "'>" + page + "</a>";
      }
    }

  } // END for (let i in allissues)

  /*
    I should be able to do the average score, with seomething like:
       var sentenceCountAverage = (sentenceCountTotal/countURLsCrawled);
    However this function hits errors, not pages, so it would be inflated
      var difficultWordsAverage = (difficultWordsTotal/countURLsCrawled);
    The URLsCrawled may also be inflated as some pages may be skipped or duplicated.
      var fleschKincaidGradeAverage = (fleschKincaidGradeTotal/countURLsCrawled);
  */

  console.log("Writing results to ./reports/allissues.csv");
  const ObjectsToCsv_a = require('objects-to-csv');
  (async () => {
    const csv_a = new ObjectsToCsv_a(allissues);

    // Save to file:
    await csv_a.toDisk(storagePath + "/reports/allissues.csv");
    // console.log(await csv_a.toString());
  })();

  /* Grading evaluations - */
  if (countURLsCrawled > 25) {
    var grade = message = "";
    var score = (minorCount + (moderateCount * 1.5) + (seriousCount * 2) + (criticalCount * 3)) / (countURLsCrawled * 5);
    console.log("score (minor) + moderate*1.5 + serious*2 + critical*3 / urls*5 = " + Math.round(score));


    console.log("Writing results to ./reports/count.csv");
    const ObjectsToCsv_c = require('objects-to-csv');
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
      const csv_c = new ObjectsToCsv_c(count_array);

      // Save to file:
      await csv_c.toDisk(storagePath + "/reports/count.csv");
      // console.log(await csv_c.toString());
    })();

    console.log("Writing HTML");

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
    grade = "?";
    message = "Not enough URLs to evaluate grade. Perhaps there was an error in the scan.";
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

  var wcagLinks = require('./constants/wcagLinks.json');
  var wcagsc2role = require('./constants/wcagsc2role.json');


  // Count the instances of each WCAG error in wcagIDsum and express that in wcagCounts which gets stored
  wcagCountsArray.forEach(function (x) {
    wcagCountsArray[x] = (wcagCountsArray[x] || 0) + 1;
  });
  var finalWCAGstring = '';
  const finalWCAGarray = [];
  let ii = wcagCountsTemp = 0;
  for (let i in wcagCountsArray) {
    if (typeof wcagCountsArray[i] !== 'function') {
      if (typeof wcagCountsArray[i] == "number") {
        wcagCountsTemp = wcagCountsArray[i];


// NOT TESTED ON AIRPLANE - https://www.freecodecamp.org/news/javascript-array-of-objects-tutorial-how-to-create-update-and-loop-through-objects-using-js-array-methods/
// let car = cars.find(car => car.color === "red");
// console.log(car);
// let wcag_id = cars.find(car => wcag_id.wcag === i);
// console.log(wcag_id);

/*
        var link = '';
        for(let j in wcagLinks) {
          if (wcagLinks[j].wcag == i) {
            link = wcagLinks[j].href;
          }
        }
        var name = '';
        console.log(typeof wcagsc2role);
        for(let k in wcagsc2role) {
          if (wcagsc2role[k] == i) {
            name = wcagsc2role[k];
          }
          // console.log(wcagsc2role.i);
          // console.log(name);
          // console.log(wcagsc2role.indexOf(k) + " indexOf");
        }
        // console.log(link + " plus " + name)
*/
// console.log(wcagLinks.indexOf(i) + " indexOf");
// console.log(wcagLinks.includes(i));
// var names = obj.wcagLinks.map(function (wcagLink) {
//  return wcagLink.wcag + ' ' + wcagLink.href;
// });
// console.log(names);

        if (wcagLinks.includes(i)) {
console.log("includes i " + i);
        }

        // console.log(wcagLinks.slice(i) + " slice")

        wcagCountsContent += "<li><b>" + i + ":</b> " + wcagCountsTemp + " "  + '</li>'; // + link
        let finalWCAGarrayTemp = {
          wcag: i,
          count: wcagCountsTemp
        };
        finalWCAGarray.push(finalWCAGarrayTemp);
        ++ii
        if (ii == 1) {
          wcagCountsContent = "WCAG Errors: " + wcagCountsContent;
        }
      }
    }
  }
  wcagCountsContent += "</ul>";

  console.log("Writing results to ./reports/wcagErrors.csv");
  const ObjectsToCsv_wc = require('objects-to-csv');
  (async () => {
    // finalWCAGarray.unshift("WCAG Errors", "Count")
    const csv_wc = new ObjectsToCsv_wc(finalWCAGarray);
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

    console.log("Writing results to ./reports/wappalyzer.csv");
    const ObjectsToCsv_wa = require('objects-to-csv');
    // Add if statement to avoid this error
    // node_modules/objects-to-csv/index.js:16
    //   throw new Error('The input to objects-to-csv must be an array of objects.');
    if ((typeof wappalyzer_array['technologies'] == 'array') && (wappalyzer_array['technologies'].length > 0)) {
      (async () => {
        const csv_wa = new ObjectsToCsv_wa(wappalyzer_array['technologies']);

        // Save to file:
        await csv_wa.toDisk(storagePath + "/reports/wappalyzer.csv");
        // console.log(await csv_wa.toString());
      })();
    }
  }


  var axeCountsDescription = "<b>Critical: " + criticalCount + ", Serious: " + seriousCount + "</b>, Moderate: " + moderateCount + ", Minor: " + minorCount + "";
  if (unknownCount > 0) {
    axeCountsDescription += "<i>Unknown: " + unknownCount + "</i>";
  }
  console.log(axeCountsDescription);
  var someOfErrors = criticalCount + seriousCount + moderateCount + minorCount;
  const axeCountContentArr = JSON.stringify({
      "criticalCount": criticalCount,
      "seriousCount": seriousCount,
      "moderateCount": moderateCount,
      "minorCount": minorCount,
      "criticalCountPercent": Math.round((criticalCount/someOfErrors)*100),
      "seriousCountPercent": Math.round((seriousCount/someOfErrors)*100),
      "moderateCountPercent": Math.round((moderateCount/someOfErrors)*100),
      "minorCountPercent": Math.round((minorCount/someOfErrors)*100),
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
      domain: domainURL,
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

        const ObjectsToCsv_d = require('objects-to-csv');
        (async () => {
          const csv_d = new ObjectsToCsv_d(plainLanguageIssues);

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
        languageSummary += sentenceCount + " sentences; ";
      }
      if (!((difficultWords == null) || (difficultWords == 'undefined') || (typeof difficultWords !== 'number') || (sentenceCount <= 2))) {
        languageSummary += difficultWords + " difficult words; ";
      }
      if (!((fleschKincaidGrade == null) || (fleschKincaidGrade == 'undefined') || (typeof fleschKincaidGrade !== 'number') || (fleschKincaidGrade < 0) || (sentenceCount <= 2))) {
        languageSummary += fleschKincaidGrade + " Flesch Kincaid Grade ";
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
    console.log("Writing issues to JSON & HTML.")
    await writeResults(allIssues, storagePath);
    await writeHTML(allIssues, storagePath);
  } else {
    console.log("No entities in allFiles.");
  }

  /*
    const host = getHostnameFromRegex(domainURL);
    // console.log(host);

    // console.log(domainURL);
    // const fs = require("fs")
    var rootDomainPath = "./results/" + host + "_reports/";
    // console.log(rootDomainPath + " 1!");
    // console.log(domainURL.replace('/', ''));
    // console.log(domainURL.substring(6));
    fs.readdir(rootDomainPath, (err, files) => { console.log(files) })
    var dateFolders = fs.readdirSync(rootDomainPath)

    // console.log("## " + dateFolders + " 1.5!")
    var date = "";
    const fs2 = require("fs")
    for (let i in dateFolders) {
      // console.log(" ## " + i + " " + dateFolders[i] + " 2!");
      date = dateFolders[i];
  //    console.log(" ## " + i + " " + date + " 2.5!")
  //   const currentDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      var rootDomainPathAndDate = rootDomainPath + "/" + date + "/reports";
      // console.log(" ## " + i + " " + rootDomainPathAndDate + " 3!");
      fs2.readdir(rootDomainPathAndDate, (err, files) => { console.log(files) })
      var dateFiles = fs2.readdirSync(rootDomainPathAndDate)
      // console.log(" ## " + i + " " + dateFiles + " 4!");
      // console.log(typeof dateFiles)

      for (let ii in dateFiles) {
        var element = {};
        var countArray = [];
        if (dateFiles[ii] == "count.csv") {
          console.log("We can get the number of axe errors");

          const fs3 = require('fs');
          var countCSV = rootDomainPathAndDate + "/count.csv";
          fs3.createReadStream(countCSV)
            .pipe(csv())
            .on('data', (row) => {

  // element.date = date;
  // element.count = row;
  // dailyCount.push(element);
              // console.log(row);
              countArray.push(row);
              console.log(countArray);

              // countArray.date = row;
              // console.log(countArray);
            })
            .on('end', () => {
              console.log('CSV file successfully processed');
            });

        }
        if (dateFiles[ii] == "wcagErrors.csv") {
          console.log("We can get the number of WCAG errors");
        }

        element[ date ] = countArray;
        console.log(element);
        console.log(countArray + " count array !!");

  console.log("not the very end")



      } // for (let ii in dateFiles)


      element[ date ] = countArray;
      console.log(element);
      console.log(countArray + " count array !!");

      console.log("very end")

    }

  */

};
