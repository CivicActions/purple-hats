library(reshape2)
library(dplyr)
library(stringr)
library(ggplot2)
library(lubridate)

create_summary <- function(directory) {
    file_names <- list.files(directory) 
    summary_files <- unique(file_names[grepl("-count.csv", file_names)])
    
    sum_dat <- data.frame()
    for(file in summary_files){
        file_location <- paste0(directory, file)
        dat <- read.csv(file_location)
        dat <- dcast(dat, 1 ~ level, value.var = "count")
        names(dat) <- c("site_name", names(dat)[2:7])
        dat$site_name <- gsub("\\-\\d+\\-\\d+\\-\\d+\\-count\\.csv",
                              "", file)
        dat$scan_date <- str_match(file, "\\d+\\-\\d+\\-\\d+")
        dat$scan_date <- as_date(dat$scan_date)
        dat <- dat[, c("site_name", "countURLs", "critical", 
                       "serious", "moderate", "minor", "score",
                       "scan_date")]
        sum_dat <- bind_rows(sum_dat, dat)
    }
    
    sum_dat$score <- ((sum_dat$critical * 3) + 
        (sum_dat$serious * 2) + 
        (sum_dat$moderate * 1.5) + 
        (sum_dat$minor)) / (sum_dat$countURLs * 5)
    
    return(sum_dat)
}

summary_data <- create_summary("~/Documents/purple-hats/data/")

# ARE WE GETTING MORE ACCESSIBLE OVER TIME? 
# WHO ARE THE REALLY GOOD ONES? WHAT APPROACHES ARE THEY USING?
# ARE THERE ANY REALLY BIG IMPROVEMENTS? 

sum_by_day <- summary_data %>% 
    group_by(scan_date) %>% 
    summarise(avg = mean(score))

ggplot(sum_by_day, aes(x = scan_date, y = avg, group = 1)) + 
    geom_line() + 
    theme(legend.position = "none")
