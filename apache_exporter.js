var _ = require('underscore');
var async = require('async');
var request = require('request');

var Prometheus = require("prometheus-client");
var express = require('express');
var argv = require('yargs')
    .usage('Usage: $0 <scrapeURLs> [options]')
    .example('$0 \"http://localhost?server-status\" -p 9010', 'Scrape http://localhost?server-status')
    .alias('p', 'port')
    .alias('h', 'help')
    .default('p', 9112)
    .describe('p', 'Server port')
    .demand(1)
    .help('h')
    .argv;

var scrapeURLs = argv._;
var serverPort = argv.p;

var prometheus = new Prometheus();

// Create stats gauges
var up = prometheus.newGauge({
    namespace: "apache",
    name: "up",
    help: "Server is up"
});

var uptime = prometheus.newGauge({
    namespace: "apache",
    name: "uptime",
    help: "Uptime"
});

var total_accesses = prometheus.newGauge({
    namespace: "apache",
    name: "total_accesses",
    help: "Total Accesses"
});

var total_kbytes = prometheus.newGauge({
    namespace: "apache",
    name: "total_kbytes",
    help: "Total kBytes"
});

var requests_per_second = prometheus.newGauge({
    namespace: "apache",
    name: "requests_per_second",
    help: "Requests per second"
});

var bytes_per_second = prometheus.newGauge({
    namespace: "apache",
    name: "bytes_per_second",
    help: "Bytes per second"
});

var bytes_per_request = prometheus.newGauge({
    namespace: "apache",
    name: "bytes_per_request",
    help: "Bytes per request"
});

var busy_workers = prometheus.newGauge({
    namespace: "apache",
    name: "busy_workers",
    help: "Busy workers"
});

var idle_workers = prometheus.newGauge({
    namespace: "apache",
    name: "idle_workers",
    help: "Idle workers"
});


function scrape(req, res, next) {

    var scrapeFunctions = [];

    _.each(scrapeURLs, function(url){

        var serverIdObj = { url: url };

        scrapeFunctions.push(function(callback){

            console.log('Requesting ' + url);
            request(url, function (error, response, body) {

                if (error || response.statusCode != 200 || !body) {

                    up.set(serverIdObj, 0);
                    callback(error || { error: 'Invalid response', body: body });
                    return;
                }

                var entries = body.trim().split("\n");
                var stats = {};

                _.each(entries, function(entry){

                    var entryParts = entry.split(':');
                    if(entryParts.length != 2){
                        return;
                    }

                    var key = entryParts[0].trim();
                    stats[key] = entryParts[1].trim();
                });

                up.set(serverIdObj, 1);

                var uptimeValue = stats['Uptime'];
                uptime.set(serverIdObj, uptimeValue ? parseInt(uptimeValue) : 0);

                var totalAccessesValue = stats['Total Accesses'];
                total_accesses.set(serverIdObj, totalAccessesValue ? parseInt(totalAccessesValue) : 0);

                var totalKbytesValue = stats['Total kBytes'];
                total_kbytes.set(serverIdObj, totalKbytesValue ? parseInt(totalKbytesValue) : 0);

                var reqPerSecondValue = stats['ReqPerSec'];
                requests_per_second.set(serverIdObj, reqPerSecondValue ? parseFloat(reqPerSecondValue) : 0);

                var bytesPerSecValue = stats['BytesPerSec'];
                bytes_per_second.set(serverIdObj, bytesPerSecValue ? parseFloat(bytesPerSecValue) : 0);

                var bytesPerReqValue = stats['BytesPerReq'];
                bytes_per_request.set(serverIdObj, bytesPerReqValue ? parseFloat(bytesPerReqValue) : 0);

                var busyWorkersValue = stats['BusyWorkers'];
                busy_workers.set(serverIdObj, busyWorkersValue ? parseInt(busyWorkersValue) : 0);

                var idleWorkersValue = stats['IdleWorkers'];
                idle_workers.set(serverIdObj, idleWorkersValue ? parseInt(idleWorkersValue) : 0);

                callback();
            });
        })
    });

    async.series(scrapeFunctions, function(error){

        if(error){
            console.error(error);
        }

        console.log('Done');
        next();
    });
}


// START
var app = express();
app.get("/metrics", scrape, prometheus.metricsFunc());

app.listen(serverPort, function() {
    console.log('Server listening at port ' + serverPort + '...');
});
app.on("error", function(err) {
    return console.error("Metric server error: " + err);
});