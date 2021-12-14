#purple-hats
----

purple-hats is a customisable, automated accessibility testing tool that allows software development teams to assess whether their products are user-friendly to persons with disabilities (PWDs).

## Technology Stack
1. Apify (Puppeteer)
2. Axe-core
3. NodeJS (NPM)


## Installations
purple-hats includes installer scripts which automates the installation of the required components used by purple-hats. Currently, it is supported on macOS and Linux (Red Hat, Centos, Ubuntu, OpenSuse/Suse).

<details>
  <summary>Instructions for changing file permissions</summary>
  
  #### Commands to modify file permissions
  In the event you cannot access the files due to running the installer scripts with elevated privileges previously, you can modify the file permissions to the appropriate owner and group.

```shell
# Linux/Unix: The user id (uid) and group id (gid) by default should be the same
# MacOS: The uid and gid may differ, if the user group doesn't exist, set the group as staff

# You can check the current user's uid and gid with the following command
id

# Update permissions for files
# Can provide the name or numerical id
sudo chown <user:group> <filename>

# Update permissions for directories
sudo chown -R <user:group> <filename>
```
</details>


### MacOS
As MacOS does not have a builtin package manager. Node Version Manager (NVM) will be used to install NodeJS. Please run the installer script *mac-installer.sh*

```shell
# Navigate into the directory, if not done so
cd purple-hats/installers

# Run the installer script for MacOS with admin privileges
bash mac-installer.sh
```

```shell
# If you cannot run the script due to insufficient permission, assign execute permission to the file
chmod +x mac-installer.sh

# Run the script again
bash mac-isntaller.sh
```

### Linux
Depending on the Linux Distro, the builtin package manager (YUM, APT or Zypper) will be used for the respective Linux Distro to install NodeJS. Please run the installer script *linux-installer.sh*

```shell
# If you cannot run the script due to insufficient permission, assign execute permission to the file
chmod +x linux-installer.sh

# Run the script again
bash linux-installer.sh
```

## Features
purple-hats can perform the following functions to crawl the target URI. Results will be generated in JSON format before being compiled into a HTML file. To start using purple-hats, run the following command(s)

```shell
# Navigate into the directory, if not done so
cd purple-hats

# Execute run.sh with admin privileges to start using purple-hats
bash run.sh
```

> NOTE: An online test-site by Web Scraper is used to demonstrate purple-hats' features.


### 1. Crawling of sitemap
The crawler will then generate the results based on the links found **within the provided URL**.

**Required inputs**
- URL linking to the sitemap file
- Examples of valid sitemap format
  - XML (Recommended): https://www.sitemaps.org/sitemap.xml
  - RSS: https://itunes.apple.com/gb/rss/customerreviews/id=317212648/xml
  - Text: https://www.xml-sitemaps.com/urllist.txt  
- For more information on sitemap: https://www.sitemaps.org/protocol.html

**Sample Output**

```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats %  bash run.sh
Welcome to HAT's Accessibility Testing Tool!
We recommend using Chrome browser for the best experience.

What would you like to scan today?
1) sitemap.xml file containing links
2) public domain URL
#? 1
Please enter file link: https://webscraper.io/test-sites/e-commerce/allinone
Scanning website...

#The crawler will then start scraping from the file link provided above.
#Console results

user@user-MacBook-Pro purple-hats %
```

### 2. Crawling of Domain
The crawler will recursively visit the links to generate the results from **all the pages found from the input domain**. This will take a longer time depending on the number of links and pages that are being transversed.

Under this feature, it will also take into consideration the presence of a login page.


#### 2. Crawling of PublicDomain w/o Login Page
**Required inputs**
- A website URL

**Sample Output**
```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats %  bash run.shwebsite https://example.com/
```
  
Alternatively:
  
```console
user@user-MacBook-Pro  Desktop % cd purple-hatsuser@user-MacBook-Pro purple-hats %  bash run.sh
Welcome to HATS Accessibility Testing Tool!
You can specify a website crawl & URL through the command line with:
    $ bash ./run website https://example.com/
What would you like to scan today?
1) sitemap file containing links
2) website
#? 2
Please enter URL of website: ttps://example.com/
```

### 3. Command line scans

Scripts can now be run from the command line with `bash ./run.sh -o 0 -w 1 -d https://example.com` and strung together for simple automation

`bash ./run.sh -o 0 -w 1 -d https://example.com bash ./run.sh -o 0 -w 1 -d simple.example.com bash ./run.sh -o 0 -w 1 -d http://www.example.com bash ./run.sh -o 0 -w 0 -d https://code.example.com`



## Also see related monitoring projects:
- https://github.com/CivicActions/purple-hats (The original code for this project)
- https://github.com/alphagov/accessibility-monitoring
- https://github.com/MSU-NatSci/DomainAccessibilityAudit
- https://github.com/benbalter/Site-Inspector
- https://github.com/accessibility-luxembourg ([simplA11yMonit](https://github.com/accessibility-luxembourg/simplA11yMonit), [simplA11yGenReport](https://github.com/accessibility-luxembourg/simplA11yGenReport), [simplA11yPDFCrawler](https://github.com/accessibility-luxembourg/simplA11yPDFCrawler))

Also for PDFs checking out http://verapdf.org/
