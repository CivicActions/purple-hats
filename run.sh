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
EXCLUDEEXT=""                             # Exclude extensions
NUMBER=2000               # NOT WORKING WITH Apify - Maximum number of pages to crawl
WAPPALYZER=0                              # Set to 1 to enable wappalyzer
OPENBROWSER=1                             # By default open a browser after the script is run

# usage() {                                 # Function: Print a help message.
#  echo "Usage: $0 [ -d DOMAINNAME ] [ -s SCANTYPE ] [ -e EMAIL ]  [ -x EXCLUDEEXT ]  [ -n NUMBER ]" 1>&2
# }
#exit_abnormal() {                         # Function: Exit with error.
#  usage
#  exit 1
#}
while getopts ":d:s:t:e:o:x:w:n:" options; do         # Loop: Get the next option;
                                          # use silent error checking;
                                          # options n and t take arguments.
  case "${options}" in                    #
    d)                                    # If the option is d,
      DOMAINNAME=${OPTARG}                      # Set $DOMAINNAME to specified value.
      ;;
    s)
      SCANTYPE=${OPTARG}                      # Set $SCANTYPE to specified value.
      ;;
    t)
      TIME2WAIT=${OPTARG}                   # Set $TIME2WAIT between crawls: 0
      ;;
    e)
      EMAIL=${OPTARG}                      # Set $EMAIL to specified value.
      ;;
    o)
      OPENBROWSER=${OPTARG}                      # Disable launching browser: 0
      ;;
    x)
      EXCLUDEEXT=${OPTARG}                      # Set $EXCLUDEEXT to specified value.
      ;;
    w)
      WAPPALYZER=${OPTARG}                      # Enable wappalyzer: 1
      ;;
    n)                                    # If the option is n,
      NUMBER=${OPTARG}                     # Set $NUMBER to specified value.
      re_isanum='^[0-9]+$'                # Regex: match whole numbers only
      if ! [[ $NUMBER =~ $re_isanum ]] ; then   # if $TIMES not whole:
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

if [ -n "$DOMAINNAME" ] ; then

  page=$DOMAINNAME

  if [ "$SCANTYPE" = "sitemap" ] ; then
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

echo "Scanning website..."

if [[ $WAPPALYZER == 1 ]] ; then
    # optional ability to gather information about the frameworks involved
    echo "Wappalyzer enabled"
    if [ -f "wappalyzer/src/drivers/npm/cli.js" ]; then
    echo " and running on $page"
    cd wappalyzer
    # wappalyzer = $(node "src/drivers/npm/cli.js" "$page" | tee errors.txt)
    wappalyzer=$( node "src/drivers/npm/cli.js" "$page")
    cd ..
  else
    echo "Wappalyzer not installed in ./wappalyzer folder"
  fi
fi

URL="$page" LOGINID="$login_id" LOGINPWD="$login_pwd" IDSEL="$id_selector" PWDSEL="$pwd_selector" SUBMIT="$btn_selector" RANDOMTOKEN="$randomToken" TYPE="$crawler" TIME2WAIT="$TIME2WAIT" WAPPALYZER="$wappalyzer" NUMBER="$NUMBER" EMAIL="$EMAIL" EXCLUDEEXT="$EXCLUDEEXT"  node -e 'require("./combine").combineRun()' | tee errors.txt

# Verify that the newly generated directory exists
if [ -d "results/$currentDate/$randomToken" ]; then
  domain=$(echo "$page" | awk -F/ '{print $3}')

  # Add simlinks for simpler access
  ln -sfn "results/$currentDate/$randomToken" "last-test"
  cd results
  ln -sfn "$currentDate/$randomToken" "${domain}_last"
  cd "$currentDate"
  ln -sfn "$randomToken" "$domain"
  cd ../..

  # Compress most files and delete originals.
  tar -cjvf "last-test/all_issues.tar.bz2" "last-test/all_issues" 2>/dev/null
  rm -fr "last-test/all_issues"
  tar -cjvf "last-test/reports/compiledResults.json.tar.bz2" "last-test/reports/compiledResults.json" 2>/dev/null
  rm "last-test/reports/compiledResults.json"
  tar -cjvf "last-test/reports/report.html.tar.bz2" "last-test/reports/report.html" 2>/dev/null
  tar -cjvf "last-test/reports/report.csv.bz2" "last-test/reports/report.csv" 2>/dev/null
  ln  -sfn last-test/reports/report.html last-test/report.html

  # Make directory for domain and store prior scans
  cd results
  mkdir "${domain}_reports"
  cd "${domain}_reports"
  ln -sfn "$currentDate" "../$currentDate/$randomToken"
  cd ../..

  # Test for the command before attempting to open the report
  if [[ "$OPENBROWSER" == 1 ]]; then
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
      echo "Open in Firefox"
      firefox -url "last-test/reports/report.html"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
      echo "Open in default browser"
      open "last-test/reports/report.html"
    else
      echo "The scan has been completed."
      current_dir=$(pwd)
      reportPath="$current_dir/results/$currentDate/$randomToken/reports/report.html"
      echo "You can find the report in $reportPath"
    fi
  fi

  # Provide PDF version if available
  # NOTE: This should just be done with puppeteer which is already required - https://github.com/puppeteer/puppeteer/
  if command -v wkhtmltopdf &> /dev/null
  then
    # I should be able to use --print-media-type
    wkhtmltopdf -q --enable-javascript --javascript-delay 10000 last-test/reports/report.html last-test/reports/report.pdf
  else
    echo "If you want a PDF export, then install wkhtmltopdf, i.e. brew install wkhtmltopdf";
  fi

else
    echo "WARNING: An unexpected error has occurred. Please try again later."
fi
