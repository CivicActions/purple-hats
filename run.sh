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

echo "Welcome to HATS Accessibility Testing Tool!"

# Allow website / sitemap to be entered at command prompt
if [ ! -z "$1" ] && [ ! -z "$2" ]; then
  if [ $1 = "sitemap" ] ; then
    scanType="sitemap"
    crawler=crawlSitemap
  elif [ $1 = "website" ] ; then
    scanType="website"
    crawler=crawlDomain
  fi
  page=$2

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

# optional ability to gather information about the frameworks involved
if [[ -f "wappalyzer/src/drivers/npm/cli.js" ]]; then
  cd wappalyzer
  # wappalyzer = $(node "src/drivers/npm/cli.js" "$page" | tee errors.txt)
  wappalyzer=$( node "src/drivers/npm/cli.js" "$page")
  cd ..
fi

URL="$page" LOGINID="$login_id" LOGINPWD="$login_pwd" IDSEL="$id_selector" PWDSEL="$pwd_selector" SUBMIT="$btn_selector" RANDOMTOKEN="$randomToken" TYPE="$crawler" WAPPALYZER="$wappalyzer" node -e 'require("./combine").combineRun()' | tee errors.txt

# Verify that the newly generated directory exists
if [ -d "results/$currentDate/$randomToken" ]; then
  domain=$(echo "$page" | awk -F/ '{print $3}')
  ln -sfn "results/$currentDate/$randomToken" "results/$currentDate/$domain"
  ln -sfn "results/$currentDate/$randomToken" "results/$domain"
  ln -sfn "results/$currentDate/$randomToken" "last-test"
  tar -cjvf "results/$currentDate/$randomToken/all_issues.tar.bz2" "results/$currentDate/$randomToken/all_issues"
  rm -fr "results/$currentDate/$randomToken/all_issues"

  # Test for the command before attempting to open the report
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    firefox "results/$currentDate/$randomToken/reports/report.html &"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    open "results/$currentDate/$randomToken/reports/report.html &"
  else
    echo "The scan has been completed."
    current_dir=$(pwd)
    reportPath="$current_dir/results/$currentDate/$randomToken/reports/report.html"
    echo "You can find the report in $reportPath"
  fi

  # Provide PDF version if available
  if command -v wkhtmltopdf &> /dev/null
  then
    # I should be able to use --print-media-type
    wkhtmltopdf -q --enable-javascript --javascript-delay 1000 last-test/reports/report.html last-test/reports/report.pdf
  else
    echo "If you want a PDF export, then install wkhtmltopdf, i.e. brew install wkhtmltopdf";
  fi

else
    echo "WARNING: An unexpected error has occurred. Please try again later."
fi
