#! /bin/bash

# For common shell function
. shell_functions/commonShellFunctions.sh

# For Apify environment settings
. shell_functions/settings.sh

# Check if installer script is executed beforehand
check_installer_status

# Delete .a11y_storage and results/current to remove previous scan data
clean_up

#0 == SUCCESS, 1 == FAIL
_valid_url=1

echo "Welcome to CivicActions' Purple Hats Accessibility Testing Tool!"

DOMAINNAME=""                             # https://www.example.com
SCANTYPE=""                               # domain or sitemap
EMAIL=""                                  # Send HTML email to on completion
WAPPALYZER=0                              # Set to 1 to enable wappalyzer
EXCLUDEEXT=""                             # Exclude by file extension (include .)
EXCLUDEMORE=""                            # Exclude by string separated by ","
EXCLUDEQUERY=0                            # Set to 1 to exclude URLs with queries

NUMBER=2000               # NOT WORKING WITH Apify - Maximum number of pages to crawl
OPENBROWSER=1                             # By default open a browser after the script is run

# usage() {                                 # Function: Print a help message.
#  echo "Usage: $0 [ -d DOMAINNAME ] [ -s SCANTYPE ] [ -e EMAIL ]  [ -x EXCLUDEEXT ]  [ -n NUMBER ]" 1>&2
# }
#exit_abnormal() {                         # Function: Exit with error.
#  usage
#  exit 1
#}
while getopts ":d:s:t:e:o:w:x:y:z:n:" options; do         # Loop: Get the next option;
                                          # use silent error checking;
                                          # options n and t take arguments.
  case "${options}" in                    #
    d)                                    # If the option is d,
      DOMAINNAME=${OPTARG}                      # Set $DOMAINNAME to specified value.
      ;;
    s)
      SCANTYPE=${OPTARG}                        # Set $SCANTYPE to specified value.
      ;;
    t)
      TIME2WAIT=${OPTARG}                       # Set $TIME2WAIT between crawls: 0
      ;;
    e)
      EMAIL=${OPTARG}                           # Set $EMAIL to specified value.
      ;;
    o)
      OPENBROWSER=${OPTARG}                     # Disable launching browser: 0
      ;;
    w)
      WAPPALYZER=${OPTARG}                      # Enable wappalyzer: 1
      ;;
    x)
      EXCLUDEEXT=${OPTARG}                      # Set $EXCLUDEEXT to specified file extension.
      ;;
    y)
      EXCLUDEMORE=${OPTARG}                     # Set $EXCLUDEMORE to string in the URL.
      ;;
    z)
      EXCLUDEQUERY=${OPTARG}                    # Exclude queries (like ?q=40) with: 1
      ;;

    n)                                    # If the option is n,
      NUMBER=${OPTARG}                     # Set $NUMBER to specified value.
      re_isanum='^[0-9]+$'                # Regex: match whole numbers only
      if ! [[ $NUMBER =~ $re_isanum ]]; then   # if $TIMES not whole:
        echo "Error: NUMBER must be a positive, whole number."
        exit_abnormal
        exit 1
      elif [ $NUMBER -eq "0" ]; then       # If it's zero:
        echo "Error: NUMBER must be greater than zero."
 #       exit_abnormal                     # Exit abnormally.
      fi
      ;;
    :)                                    # If expected argument omitted:
      echo "Error: -${OPTARG} requires an argument."
#      exit_abnormal                       # Exit abnormally.
      ;;
    *)                                    # If unknown (any other) option:
 #     exit_abnormal                       # Exit abnormally.
      ;;
  esac
done

echo "$DOMAINNAME was submitted."

if [ -n "$DOMAINNAME" ]; then

  page=$DOMAINNAME

  if [ "$SCANTYPE" = "sitemap" ]; then
    scanType="sitemap"
    crawler="crawlSitemap"
  else
    scanType="website"
    crawler="crawlDomain"
  fi

# Without variables provide prompt message
else

  echo "You can specify a website crawl & URL through the command line with:"
  echo "    $ bash ./run website https://example.com/"

  echo "What would you like to scan today?"

  options=("sitemap file containing links" "website")


  # Get information related to scan type as well as the URL for URL validation
  select opt in "${options[@]}"
  do
      case $opt in
        "sitemap file containing links")
            scanType="sitemap"
            crawler=crawlSitemap
            prompt_message="Please enter URL to sitemap: "
            break;;

        "website")
            prompt_website
            break;;

        "exit")
            exit;;

        *)
            echo "Invalid option $REPLY";;

    esac

  done

  # Prompt for URL (Common across all scan types)
  read -p "$prompt_message" page

fi

# URL validation
while [ "$_valid_url" != 0 ]
do
    check_url

    if [ "$page" = "exit" ]; then
        exit
    elif [ -n $check_url_status ] && [ $check_url_status = 0 ]; then
        _valid_url=0
    else
        # Prompt error message to rectify error for URL
        if [ $scanType = "sitemap" ]; then
            sitemap_error
        else
            website_error
        fi

    fi

done

# Run the crawler
randomToken=$(date +%s)$(openssl rand -hex 5)
currentDate=$(date '+%Y-%-m-%-d')

echo "Scanning website $page ... "

if [[ $WAPPALYZER == 1 ]]; then
    # optional ability to gather information about the frameworks involved
    echo "Wappalyzer enabled"
    if [ -f "wappalyzer/src/drivers/npm/cli.js" ]; then
    echo " and running on $page"
    cd wappalyzer
    # wappalyzer = $(node "src/drivers/npm/cli.js" "$page" | tee errors.txt)
    wappalyzer=$( node "src/drivers/npm/cli.js" "$page")
    cd ..
  else
    echo "Wappalyzer not installed in ./wappalyzer folder."
  fi
fi

URL="$page" LOGINID="$login_id" LOGINPWD="$login_pwd" IDSEL="$id_selector" PWDSEL="$pwd_selector" SUBMIT="$btn_selector" RANDOMTOKEN="$randomToken" TYPE="$crawler" TIME2WAIT="$TIME2WAIT" WAPPALYZER="$wappalyzer" NUMBER="$NUMBER" EMAIL="$EMAIL" EXCLUDEEXT="$EXCLUDEEXT" EXCLUDEMORE="$EXCLUDEMORE" EXCLUDEQUERY="$EXCLUDEQUERY" node -e 'require("./combine").combineRun()' | tee errors.txt

# Verify that the newly generated directory exists
if [ -d "results/$currentDate/$randomToken" ]; then
  domain=$(echo "$page" | awk -F/ '{print $3}')

  # Add simlinks for simpler access
  echo "Adding symbolic link to last scan of $domain in run.sh."
  ln -sfn "results/$currentDate/$randomToken" "last-scan"
  cd results

  # Copy over other links only if the .html report is successfully written
  if ls "$currentDate/$randomToken/reports/report.html" >> /dev/null 2>&1; then
    echo "Adding symbolic links for date and domain."
    ln -sfn "$currentDate/$randomToken"
    cd "$currentDate"
    ln -sfn "$randomToken" "$domain"
    cd ../..

    # Compress most files and delete originals.
    echo "Compressing files."
    cd last-scan
    tar -cjf "$domain-$currentDate-all_issues.tar.bz2" "all_issues" 2>/dev/null
    rm -fr "all_issues"
    cd reports
    tar -cjvf "$domain-$currentDate-compiledResults.json.tar.bz2" "compiledResults.json" 2>/dev/null
    rm "compiledResults.json"
    tar -cjvf "$domain-$currentDate-report.html.tar.bz2" "report.html" 2>/dev/null
    tar -cjvf "$domain-$currentDate-allissues.csv.bz2" "allissues.csv" 2>/dev/null
    zip "$domain-$currentDate-allissues.csv.zip" "allissues.csv" 2>/dev/null
    rm "allissues.csv"
    tar -cjvf "$domain-$currentDate-plainLanguage.csv.bz2" "plainLanguage.csv" 2>/dev/null
    rm "plainLanguage.csv"
    pwd
    cp "$domain-$currentDate-allissues.csv.bz2" ../../../../data/
    cp "$domain-$currentDate-report.html.tar.bz2" ../../../../data/
    cp "$domain-$currentDate-plainLanguage.csv.bz2" ../../../../data/
    cd ../..
    pwd

    # Make directory for domain and store prior scans
    echo "Adding domain tracking - $domain."
    cd results
    ln -sfn "$currentDate/$randomToken" "last-scan"

    if [ -d "${domain}_reports" ]; then
      echo "Using existing ${domain}_reports directory."
    else
      echo "Making ${domain}_reports directory."
      mkdir "${domain}_reports"
    fi

    cd "${domain}_reports"
    ln -sfn "../$currentDate/$randomToken" "$currentDate"

    echo "Renaming reports to make it easier to access from last-scan."
    cd ../last-scan/reports
    ls count.csv
    mv report.html "$domain-$currentDate-report.html"
    mv count.csv "$domain-$currentDate-count.csv"
    mv wcagErrors.csv "$domain-$currentDate-wcagErrors.csv"
    ln -sfn "$domain-$currentDate-report.html" report.html
    ln -sfn "$domain-$currentDate-count.csv" count.csv
    ln -sfn "$domain-$currentDate-wcagErrors.csv" wcagErrors.csv
    pwd
    # ls ../../../../data/
    cp "$domain-$currentDate-count.csv" ../../../../data/
    cp "$domain-$currentDate-wcagErrors.csv" ../../../../data/
    cd ..
    ln  -sfn "reports/$domain-$currentDate-report.html" report.html
    cd ../..

    # Add to Git report
    # Todo: This should be something that is explicitly set from the command line
    pwd

    # This isn't working properly
    # git checkout -B new_data_branch
    # git add "./data/$domain-$currentDate-count.csv"
    # git add "data/$domain-$currentDate-wcagErrors.csv data/$domain-$currentDate-allissues.csv.bz2 data/$domain-$currentDate-report.html.tar.bz2 data/$domain-$currentDate-plainLanguage.csv.bz2"
    # git commit -m "updated data"
    # git push
    # git push --setupstream origin main

    # Test for the command before attempting to open the report
    if [[ "$OPENBROWSER" == 1 ]]; then
      if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Open report in Firefox."
        firefox -url "last-scan/report.html"
      elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Open report in default browser"
        open "last-scan/report.html"
    else
        echo "The scan has been completed."
        current_dir=$(pwd)
        reportPath="$current_dir/results/$currentDate/$randomToken/reports/report.html"
        echo "You can find the report in $reportPath."
    fi # End [[ "$OPENBROWSER" == 1 ]]; then
fi
  else
    echo "No report.html file for $domain in run.sh."
  fi


  # Provide PDF version if available
  # NOTE: This should just be done with puppeteer which is already required - https://github.com/puppeteer/puppeteer/
  if command -v wkhtmltopdf &> /dev/null; then
    # I should be able to use --print-media-type
    wkhtmltopdf -q --enable-javascript --javascript-delay 10000 "last-scan/reports/report.html" "last-scan/reports/$domain-$currentDate-report.pdf"
  else
    echo "If you want a PDF export, then install wkhtmltopdf - i.e. brew install wkhtmltopdf.";
  fi # End command -v wkhtmltopdf

else
    echo "WARNING: An unexpected error has occurred. Please try again later."
fi
