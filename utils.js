const fs = require('fs-extra');
const {
  a11yDataStoragePath,
  allIssueFileName,
  invalidURLends
} = require('./constants/constants');

exports.getHostnameFromRegex = url => {
  // run against regex
  const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
  // extract hostname (will be null if no match is found)
  return matches && matches[1];
};

exports.getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

exports.getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getStoragePath = randomToken => {
  const date = new Date();
  const currentDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const storagePath = `results/${currentDate}/${randomToken}`;
  return storagePath;
};
exports.getStoragePath = getStoragePath;

exports.createAndUpdateFolders = async (scanDetails, randomToken) => {
  const storagePath = getStoragePath(randomToken);
  const logPath = `logs/${randomToken}`;

  await fs.ensureDir(`${storagePath}/reports`);
  console.log("Write details.json file.")
  await fs.writeFile(`${storagePath}/details.json`, JSON.stringify(scanDetails, 0, 2));
  await fs.copy(`${a11yDataStoragePath}/${randomToken}`, `${storagePath}/${allIssueFileName}`);

  console.log("Writing urls crawled to ./reports/urls.csv");
  var scannedURLs = scanDetails.urlsCrawled.scanned.join();
  // const fs = require('fs');
  console.log(scannedURLs);
  // await fs.writeFile(`${storagePath}/scannedURLs.csv`, scanDetails.urlsCrawled.scanned);
  const writeStream = fs.createWriteStream(`${storagePath}/reports/scannedURLs.csv`);
  writeStream.write(`urls \n`);
  writeStream.write( scannedURLs.replace(/,/g, '\n') );

  // update logs
  await fs.ensureDir(logPath);
  await fs.pathExists('errors.txt').then(async exists => {
    if (exists) {
      await fs.copy('errors.txt', `${logPath}/${randomToken}.txt`);
    }
  });
};
