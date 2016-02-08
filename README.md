# Apache Server Exporter

Prometheus exporter for Apache server metrics. Uses [mod_status](http://httpd.apache.org/docs/2.2/mod/mod_status.html) to scrape the data.

## Running

    npm install
    node apache_exporter http://localhost?server-status
    
## Usage

    Usage: apache_exporter <scrapeURLs> [options]
    
    Options:
      -p, --port  Server port                                        [default: 9112]
      -h, --help  Show help                                                [boolean]
    
    Examples:
      apache_exporter                           Scrape
      "http://localhost?server-status" -p 9010  http://localhost?server-status
    