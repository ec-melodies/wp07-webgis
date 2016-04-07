var express = require('express');
var proxy = require('express-http-proxy');
var fs = require('fs');
var request = require('request');
var bodyParser = require('body-parser');
var app = require('express')();
var store = require('json-fs-store')("../wps-jobs");

var proxies = {};
var geoserverUsername = "melodies-wp7";
var geoserverPassword = "changeme";

fs.readFile("proxies.conf", "utf8", function (error, data) {
    if (error !== null) {
        console.log(error);
    } else {
        var split = data.split(/\r\n|\r|\n/);
        console.log("Proxies:");
        for (var i = 0; i < split.length; i++) {
            var routeLine = split[i];
            if (!routeLine.startsWith("#")) {
                var routeParts = routeLine.split(" ");
                if (routeParts.length === 3) {
                    if (routeParts[1] === "=") {
                        var sourcePath = routeParts[0];
                        var targetPath = routeParts[2];
                        console.log(sourcePath + " -> " + targetPath + "\n");
                        proxies[sourcePath] = targetPath;
                        app.use(sourcePath, proxy(targetPath, {
                            forwardPath: function (req, res) {
                                return require('url').parse(req.url).path;
                            },
                            intercept: function (rsp, data, req, res, callback) {
                                if (rsp.statusCode !== undefined && rsp.statusCode == 307) {
                                    if (rsp.headers !== undefined && rsp.headers.location !== undefined) {
//                                        res.setHeader("content-disposition", "attachment");
                                        request(rsp.headers.location).pipe(res);
                                    }
                                } else {
                                    callback(null, data);
                                }
                            }
                        }));
                    }
                }
            }
        }
    }
});


app.use(express.static('../dist'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var router = express.Router();

router.route('/wps-jobs')

    .post(function (req, res) {
        var jobDefinition = req.body;

        if (jobDefinition !== undefined && jobDefinition.id && jobDefinition.creationTime && jobDefinition.statusLocation && jobDefinition.inputs) {
            store.list(function (err, jobs) {
                if (err) {
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.write("500 Internal server error.\n" + err);
                    res.end();
                } else {
                    for (var i = 0; i < jobs.length; i++) {
                        var wpsJobId = jobs[i].id;
                        if (wpsJobId === jobDefinition.id) {
                            res.writeHead(409, {"Content-Type": "text/plain"});
                            res.write("WPS JOB with id: " + wpsJobId + " already exists.\n");
                            res.end();
                            return;
                        }
                    }
                    var currentId = jobs.length;
                    jobDefinition.jobId = currentId + 1;
                    store.add(jobDefinition, function (err) {
                        if (err) {
                            res.writeHead(500, {"Content-Type": "text/plain"});
                            res.write("500 Internal server error.\n" + err);
                            res.end();
                        } else {
                            res.json(jobDefinition);
                        }
                    });
                }
            });
        } else {
            res.writeHead(400, {"Content-Type": "text/plain"});
            res.write("WPS JOB invalid.\n");
            res.end();
        }
    })

    .get(function (req, res) {
        store.list(function (err, objects) {
            if (err) {
                res.writeHead(500, {"Content-Type": "text/plain"});
                res.write("500 Internal server error.\n");
                res.end();
                console.log(err);
            } else {
                res.json(objects);
            }
        });
    });
router.route('/wps-jobs/:wps_job_id')
    .get(function (req, res) {
        if (req.params.wps_job_id) {
            store.load(req.params.wps_job_id, function (err, object) {
                if (err) {
                    res.writeHead(404, {"Content-Type": "text/plain"});
                    res.write("WPS JOB ID: " + req.params.wps_job_id + " not exist.\n");
                    res.end();
                    console.log(err);
                } else {
                    res.json(object);
                }
            });
        } else {
            res.writeHead(400, {"Content-Type": "text/plain"});
            res.write("WPS JOB ID invalid.\n");
            res.end();
        }
    });

router.route('/geoserver-delete/:workspace_id/:coverage_id')
    .delete(function (req, res) {
        if (req.params.coverage_id && req.params.workspace_id) {
            request
                .del(proxies["/melodies-geoserver"] + "/geoserver/rest/workspaces/" + req.params.workspace_id
                    + "/coveragestores/" + req.params.coverage_id + "?recurse=true&puge=all", {
                    'auth': {
                        'user': geoserverUsername,
                        'pass': geoserverPassword,
                        'sendImmediately': true
                    },
                    'recurse': true,
                    'purge': 'all'
                }).pipe(res);
        } else {
            res.writeHead(400, {"Content-Type": "text/plain"});
            res.write("COVERAGE ID and/or WORKSPACE ID invalid.\n");
            res.end();
        }
    });

app.use('/api', router);

app.listen(3000, function () {
    console.log('App listening on port 3000!');
});