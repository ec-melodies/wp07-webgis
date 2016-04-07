"use strict";
/* global $:true, ol:true, xml:true */

angular.module("OverviewModule").service("overviewMapService",
    function ($q, $interval, $http) {

        //map defaults
        var MIN_ZOOM_LEVEL = 3;
        var MAX_ZOOM_LEVEL = 19;
        var SOURCE_EPSG_CODE = "EPSG:4326";
        var MAP_EPSG_CODE = "EPSG:3857";

        var GEOSERVER_WORKSPACE = "melodies-wp7";
        var JOB_UUID_PARAM_NAME = "JobID";


        //configurations
        var GEOSERVER_HOST = '/melodies-geoserver';
        var BACKEND_WPS_JOBS_PATH = '/api/wps-jobs';
        var BACKEND_GEOSERVER_DELETE_PATH = '/api/geoserver-delete';

        var GEOSERVER_WMS_CAPABILITIES_PATH = GEOSERVER_HOST + '/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities';
        var GEOSERVER_WMS_LEGEND_PATH = GEOSERVER_HOST + '/geoserver/ows?service=WMS&version=1.3.0&request=GetLegendGraphic' +
            '&FORMAT=image/png&WIDTH=20&HEIGHT=20&TRANSPARENT=true' +
            '&LEGEND_OPTIONS=' +
            'fontColor:0xDEDEDE;' +
            'fontStyle:bold;' +
            'fontAntiAliasing:true;' +
            'forceLabels:on;' +
            'forceRule:True;' +
            'fontName:SansSerif' +
            '&LAYER=';

        var WPS_CAPABILITIES_PATH = '?service=wps&version=1.0.0&request=getCapabilities';
        var WPS_DESCRIBE_PROCESS_PATH = '?service=wps&version=1.0.0&request=DescribeProcess&identifier=';
        var WPS_EXECUTE_PROCESS_ASYNC_PATH = '?service=wps&version=1.0.0&ResponseDocument=result_distribution&storeExecuteResponse=true&status=true&request=Execute&identifier=';

        //variables
        var proxies = {};
        var wpsServices = {};
        var storedJobIds = {};

        var wmsLayers = [];
        var parser = new ol.format.WMSCapabilities();
        var map;
        var wmsFinish = false;
        var tileGridLayer;

        $http.get("/resources/data/proxies.conf").then(function (response) {
            var split = response.data.split(/\r\n|\r|\n/);
            for (var i = 0; i < split.length; i++) {
                var routeLine = split[i];
                if (!routeLine.startsWith("#")) {
                    var routeParts = routeLine.split(" ");
                    if (routeParts.length === 3) {
                        if (routeParts[1] === "=") {
                            var sourcePath = routeParts[0];
                            var targetPath = routeParts[2];
                            proxies[targetPath] = sourcePath;
                        }
                    }
                }
            }
        });

        $http.get("/resources/data/wps-services.conf").then(function (response) {
            var split = response.data.split(/\r\n|\r|\n/);
            for (var i = 0; i < split.length; i++) {
                var routeLine = split[i];
                if (!routeLine.startsWith("#")) {
                    var routeParts = routeLine.split(" ");
                    if (routeParts.length === 5) {
                        if (routeParts[1] === "=" && routeParts[3] === "=") {
                            var serviceId = routeParts[0];
                            var processId = routeParts[2];
                            var wpsUrl = routeParts[4];
                            wpsServices[serviceId] = {
                                processId: processId,
                                wpsUrl: wpsUrl
                            };
                        }
                    }
                }
            }
        });

        function replaceTargetPath(path) {
            var targetPaths = Object.keys(proxies);
            for (var i = 0; i < targetPaths.length; i++) {
                if (path.indexOf(targetPaths[i]) > -1) {
                    return path.replace(targetPaths[i], proxies[targetPaths[i]]);
                }
            }
            return path;
        }

        function getWmsLayers() {
            return wmsLayers;
        }

        function isMapInitialized() {
            var iterations = 0;
            if (map && wmsFinish) {
                return $q.when("Map is initialized.");
            }
            var deferred = $q.defer();
            var promise;

            var operation = function () {
                if (iterations === 3 && (map === undefined || !wmsFinish)) {
                    deferred.reject("Map is not initialized after " + iterations + " attempts.");
                    $interval.cancel(promise);
                }

                if (map && wmsFinish) {
                    deferred.resolve("Map is initialized.");
                    $interval.cancel(promise);
                }
                iterations++;
            };
            promise = $interval(operation, 1000, 5);
            return deferred.promise;
        }

        var styleFunction = function () {

            return function (feature) {
                var zoom = map.getView().getZoom();
                var styles = [];
                if (zoom > 7) {
                    styles.push(new ol.style.Style({
                        text: new ol.style.Text({
                            text: "PR " + feature.get('PR'),
                            textAlign: "center",
                            textBaseline: "middle",
                            font: "Bold 12px Roboto",
                            fill: new ol.style.Fill({color: '#FFFFFF'}),
                            stroke: new ol.style.Stroke({color: "transparent", width: 0})
                        })
                    }));
                }

                styles.push(new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#545454',
                        width: 1
                    }),
                    fill: new ol.style.Fill({
                        color: "rgba(96, 96, 96, 0.25)"
                    })
                }));

                return styles;

            };
        };

        function initMap() {
            // map controls
            var scaleLineControl = new ol.control.ScaleLine({
                className: 'maritime-ol-scale-line'
            });

            var zoomControl = new ol.control.Zoom({
                className: 'maritime-ol-zoom',
                zoomInLabel: '\uf067',
                zoomOutLabel: '\uf068'
            });

            var mousePositionControl = new ol.control.MousePosition({
                coordinateFormat: ol.coordinate.createStringXY(4),
                projection: 'EPSG:4326',
                className: 'maritime-ol-mouse-position',
                undefinedHTML: '&nbsp;'
            });

            var attributionControl = new ol.control.Attribution({
                className: "maritime-ol-attribution",
                target: "legend-body"
            });

            map = new ol.Map({
                controls: [ zoomControl, scaleLineControl, mousePositionControl, attributionControl],
                target: 'map',

                layers: [
                    new ol.layer.Tile({
                        minResolution: 0,
                        maxResolution: 75,
                        source: new ol.source.BingMaps({
                            key: 'AvTWKTLWtjFFPJ_vztdefK5KOmG-pjCIVsh03s-5VQH1rxMtAuRjRMQ4X6av17KW',
                            imagerySet: 'Aerial',
                            maxZoom: 19
                        }),
                        baseLayer: true
                    }),
                    new ol.layer.Tile({
                        minResolution: 75,
                        maxResolution: 20000,
                        source: new ol.source.MapQuest({layer: 'sat'}),
                        baseLayer: true
                    })],
                view: new ol.View({
                    center: ol.proj.transform([-9, 40], SOURCE_EPSG_CODE, MAP_EPSG_CODE),
                    zoom: 5,
                    minZoom: MIN_ZOOM_LEVEL,
                    maxZoom: MAX_ZOOM_LEVEL
                })
            });

            var tileGridSource = new ol.source.Vector({
                url: 'resources/data/WRS2-descending-new.geojson',
                format: new ol.format.GeoJSON()
            });
            tileGridLayer =
                new ol.layer.Image({
                    source: new ol.source.ImageVector({
                        source: tileGridSource,
                        style: styleFunction()
                    }),
                    visible: false,
                    zIndex: 1000,
                    baseLayer: true
                });


            map.addLayer(tileGridLayer);

            refreshInformation();
        }

        var retrieveExtent = function (layer) {
            var layerExtent;
            if (layer !== undefined) {
                var projection = ol.proj.get(MAP_EPSG_CODE);
                var projectionExtent = projection.getExtent();

                var boundingBox = layer.EX_GeographicBoundingBox;
                var leftBottomCorner = ol.proj.transform([boundingBox[0], boundingBox[1]], SOURCE_EPSG_CODE, MAP_EPSG_CODE);
                var rightTopCorner = ol.proj.transform([boundingBox[2], boundingBox[3]], SOURCE_EPSG_CODE, MAP_EPSG_CODE);

                layerExtent = [leftBottomCorner[0], leftBottomCorner[1], rightTopCorner[0], rightTopCorner[1]];

                layerExtent[0] = isNaN(layerExtent[0]) ? projectionExtent[0] : Math.max(layerExtent[0], projectionExtent[0]);
                layerExtent[1] = isNaN(layerExtent[1]) ? projectionExtent[1] : Math.max(layerExtent[1], projectionExtent[1]);
                layerExtent[2] = isNaN(layerExtent[2]) ? projectionExtent[2] : Math.min(layerExtent[2], projectionExtent[2]);
                layerExtent[3] = isNaN(layerExtent[3]) ? projectionExtent[3] : Math.min(layerExtent[3], projectionExtent[3]);
            }
            return layerExtent;
        };

        function refreshInformation() {
            refreshWMSInformation();

            var iterations = 0;
            if (map && wmsFinish) {
                return $q.when("Map already refreshed");
            }
            var deferred = $q.defer();
            var promise;

            var operation = function () {
                if (iterations === 3 && (map === undefined || !wmsFinish)) {
                    deferred.reject("Map is not refreshed after " + iterations + " attempts.");
                    $interval.cancel(promise);
                }

                if (map && wmsFinish) {
                    deferred.resolve("Map is initialized.");
                    $interval.cancel(promise);
                }
                iterations++;
            };

            promise = $interval(operation, 1000, 5);
            return deferred.promise;
        }


        function getMapLayersArray() {
            return map.getLayers().getArray().filter(function (layer) {
                return layer.get("baseLayer") === undefined;
            });
        }

        function refreshMapLayers() {
            var existOnServer;
            var existLocal;
            var serverLayerName;
            var localLayerName;
            var mapLayers = getMapLayersArray();
            for (var k = 0; k < mapLayers.length; k++) {
                existOnServer = false;
                localLayerName = mapLayers[k].get('name');
                for (var r = 0; r < wmsLayers.length; r++) {
                    serverLayerName = wmsLayers[r].Name;
                    if (localLayerName === serverLayerName) {
                        existOnServer = true;
                        break;
                    }
                }
                if (!existOnServer) {
                    map.removeLayer(mapLayers[k]);
                }
            }
            mapLayers = getMapLayersArray();

            for (var i = 0; i < wmsLayers.length; i++) {
                serverLayerName = wmsLayers[i].Name;

                existLocal = false;
                for (var j = 0; j < mapLayers.length; j++) {
                    localLayerName = mapLayers[j].get('name');
                    if (localLayerName === serverLayerName) {
                        existLocal = true;
                        break;
                    }
                }
                if (!existLocal) {
                    var attributions = [];

                    attributions.push(new ol.Attribution({
                            html: "<div>" + wmsLayers[i].Title + "<img id='GEOSERVER' src=" + GEOSERVER_WMS_LEGEND_PATH + wmsLayers[i].Name + "></div>"
                        }
                    ));
                    wmsLayers[i].instance = new ol.layer.Tile({
                        source: new ol.source.TileWMS({
                            url: GEOSERVER_HOST + '/geoserver/wms',
                            params: {
                                'FORMAT': 'image/png',
                                'VERSION': '1.3.0',
                                tiled: true,
                                STYLES: '',
                                TRANSPARENT: true,
                                ENV: "",
                                LAYERS: wmsLayers[i].Name,
                                CRS: MAP_EPSG_CODE
                            },
                            attributions: attributions
                        }),
                        visible: false,
                        extent: retrieveExtent(wmsLayers[i]),
                        zIndex: getMapLayersArray().length,
                        name: wmsLayers[i].Name
                    });
                    map.addLayer(wmsLayers[i].instance);
                }
            }

            mapLayers = getMapLayersArray();

            mapLayers = mapLayers.sort(function (a, b) {
                return (a.getZIndex() <= b.getZIndex()) ? -1 : 1;
            });

            for (var z = 0; z < mapLayers.length; z++) {
                mapLayers[z].setZIndex(z);
            }

        }

        function refreshWMSInformation() {
            wmsFinish = false;

            $http.get(BACKEND_WPS_JOBS_PATH).then(function (response) {
                var jobIds = response.data;
                for (var i = 0; i < jobIds.length; i++) {
                    storedJobIds[jobIds[i].id] = jobIds[i];
                }
                return  $http.get(GEOSERVER_WMS_CAPABILITIES_PATH);
            }).then(function (response) {

                var result = parser.read(response.data);
                var wmsLayersTmp = result.Capability.Layer.Layer;
                if (wmsLayersTmp !== undefined) {

                    wmsLayersTmp = wmsLayersTmp.filter(function (layer) {
                        return layer.Name.startsWith(GEOSERVER_WORKSPACE);
                    });

                    for (var i = wmsLayersTmp.length - 1; i >= 0; i--) {
                        var tmpLayerName = wmsLayersTmp[i].Name;
                        var exists = false;
                        for (var j = wmsLayers.length - 1; j >= 0; j--) {
                            var actualLayerName = wmsLayers[j].Name;
                            if (tmpLayerName === actualLayerName) {
                                exists = true;
                                break;
                            }
                        }
                        if (exists) {
                            wmsLayersTmp[i].instance = wmsLayers[j].instance;
                        }
                    }
                    wmsLayers = wmsLayersTmp;

                    for (var k = wmsLayers.length - 1; k >= 0; k--) {
                        var layerJobId = wmsLayers[k].Name;
                        layerJobId = layerJobId.replace(GEOSERVER_WORKSPACE + ":", "");
                        var split = layerJobId.split("--");
                        layerJobId = split[0];
                        wmsLayers[k].layerJobId = layerJobId;
                        wmsLayers[k].downloadAvailable = false;
                        wmsLayers[k].layerIdentifier = split[1];
                        wmsLayers[k].statusLocation = storedJobIds[layerJobId] !== undefined ? storedJobIds[layerJobId].statusLocation : undefined;
                        wmsLayers[k].processId = storedJobIds[layerJobId] !== undefined ? storedJobIds[layerJobId].jobId : undefined;
                    }
                }
                refreshMapLayers();
                wmsFinish = true;
            });
        }


        function executeWPSProcess(serviceId, inputs) {
            var deferred = $q.defer();

            var jobUuid = generateUUID();

            var dataInputs = "&dataInputs=";
            var inputIdentifiers = Object.keys(inputs);
            if (inputIdentifiers.length !== 0) {
                for (var i = 0; i < inputIdentifiers.length; i++) {
                    if (inputs[inputIdentifiers[i]] !== undefined) {
                        dataInputs = dataInputs + inputIdentifiers[i] + "=" + inputs[inputIdentifiers[i]].toString() + ";";
                    }
                }
            } else {
                dataInputs = "";
            }

            var dataInputsWithJobID = dataInputs + JOB_UUID_PARAM_NAME + "=" + jobUuid;

            var wpsUrl = wpsServices[serviceId].wpsUrl;
            var processId = wpsServices[serviceId].processId;

            $http.get(replaceTargetPath(wpsUrl + WPS_EXECUTE_PROCESS_ASYNC_PATH) + processId + dataInputsWithJobID)
                .success(function (data) {
                    var statusLocationPath;
                    var result = xml.xmlToJSON(data);

                    var exceptionReport = processWPSExceptionReport(result);
                    if (exceptionReport) {
                        deferred.reject({
                            id: undefined,
                            text: exceptionReport
                        });
                    }
                    if (result.ExecuteResponse !== undefined) {
                        var status = result.ExecuteResponse.Status;
                        if (status.ProcessAccepted) {
                            var statusLocation = result.ExecuteResponse["@statusLocation"];
                            statusLocationPath = replaceTargetPath(statusLocation);

                            var processExecuteResponse;
                            $http.get(statusLocationPath).then(function (response) {
                                var status = xml.xmlToJSON(response.data);
                                processExecuteResponse = processWPSExecuteResponse(status);
                                if (processExecuteResponse.status) {

                                    return $http.post(BACKEND_WPS_JOBS_PATH, {
                                        id: jobUuid,
                                        creationTime: processExecuteResponse.creationTime,
                                        statusLocation: statusLocationPath,
                                        inputs: dataInputs
                                    });

                                } else {
                                    deferred.reject({
                                        id: processExecuteResponse.id,
                                        text: processExecuteResponse.text
                                    });
                                }
                            }).then(function (response) {
                                    if (response !== undefined) {

                                        deferred.resolve({
                                            id: response.data.jobId,
                                            text: processExecuteResponse.text
                                        });
                                    } else {
                                        deferred.reject({
                                            id: processExecuteResponse.id,
                                            text: processExecuteResponse.text
                                        });
                                    }
                                }
                            );
                        }
                    }
                }).error(function (msg) {
                    deferred.reject(msg);
                });
            return deferred.promise;
        }

        function processWPSExceptionReport(object) {
            if (object.ExceptionReport !== undefined) {
                var exception = "";
                var exceptions = object.ExceptionReport.Exception;
                if ($.isArray(exceptions)) {
                    exception = exceptions[0];
                } else {
                    exception = exceptions;
                }

                var exceptionText = exception.ExceptionText;
                if (exceptionText !== undefined) {
                    exceptionText = exceptionText.replace("java.lang.RuntimeException: ", "");
                }
                return  exceptionText;
            }
        }

        function retrieveWPSResultLinks(layerStatusLocation, layerIdentifier) {
            var deferred = $q.defer();
            $http.get(layerStatusLocation)
                .then(function (response) {
                    var result = xml.xmlToJSON(response.data);
                    var resultsLink = result.ExecuteResponse.ProcessOutputs.Output.Data.ComplexData.Reference["@href"];
                    return $http.get(replaceTargetPath(resultsLink));
                }, function (msg) {
                    deferred.reject(msg);
                }).then(function (response) {
                    var resultLinks = [];
                    var result = xml.xmlToJSON(response.data);
                    var files = result.metalink.files.file;
                    for (var i = 0; i < files.length; i++) {
                        var filename = files[i]["@name"];
                        var layerIdentifierReplaced = layerIdentifier.replace("_gen", "");
                        if (filename.startsWith(layerIdentifierReplaced)) {
                            resultLinks.push({
                                name: filename,
                                link: replaceTargetPath(files[i].resources.url.Text)
                            });
                        }
                    }
                    deferred.resolve(resultLinks);

                });
            return deferred.promise;
        }

        function layerJobStatus(statusLocation, layerJobId) {
            $http.get(statusLocation)
                .then(function (response) {
                    var downloadAvailable = false;
                    var result = xml.xmlToJSON(response.data);
                    var wpsResponse = processWPSExecuteResponse(result);
                    var layerJobStatusText = wpsResponse.text;
                    if (wpsResponse.status) {
                        var processOutputs = result.ExecuteResponse.ProcessOutputs;
                        if (processOutputs !== undefined && processOutputs.Output !== undefined) {
                            var metalinkFolder = processOutputs.Output.Data.ComplexData.Reference["@href"];
                            if (metalinkFolder !== undefined) {
                                downloadAvailable = true;
                            }
                        }
                    }
                    for (var i = 0; i < wmsLayers.length; i++) {
                        if (layerJobId === wmsLayers[i].layerJobId) {
                            wmsLayers[i].downloadAvailable = downloadAvailable;
                            wmsLayers[i].layerJobStatus = layerJobStatusText;
                        }
                    }
                });
        }


        function retrieveJobInformation() {

            for (var i = 0; i < wmsLayers.length; i++) {
                if (wmsLayers[i].statusLocation !== undefined) {
                    layerJobStatus(wmsLayers[i].statusLocation, wmsLayers[i].layerJobId);
                }
            }
        }


        function processWPSExecuteResponse(object) {
            var resultOk = false;
            var resultText;
            var processId;
            var creationTime;
            if (object.ExecuteResponse !== undefined) {
                var statusLocation = object.ExecuteResponse["@statusLocation"];
                processId = statusLocation.split("id=")[1];
                var status = object.ExecuteResponse.Status;
                creationTime = status["@creationTime"];
                if (status.ProcessAccepted) {
                    resultOk = true;
                    resultText = "ProcessAccepted";
                } else if (status.ProcessStarted) {
                    resultOk = true;
                    resultText = "ProcessStarted";
                } else if (status.ProcessPaused) {
                    resultOk = true;
                    resultText = "ProcessPaused";
                } else if (status.ProcessFailed) {
                    resultOk = false;
                    resultText = processWPSExceptionReport(status.ProcessFailed);
                } else if (status.ProcessSucceeded) {
                    resultOk = true;
                    resultText = "ProcessSucceeded";
                } else {
                    resultOk = false;
                    resultText = "Unknown result type.";
                }
            }
            return {
                status: resultOk,
                text: resultText,
                id: processId,
                creationTime: creationTime
            };
        }

        function getWPSInformation(serviceId) {
            var deferred = $q.defer();
            var wpsService = wpsServices[serviceId];
            if(wpsService!==undefined){
                var wpsUrl = wpsService.wpsUrl;
                var processId = wpsService.processId;

                $http.get(replaceTargetPath(wpsUrl + WPS_CAPABILITIES_PATH))
                    .then(function (response) {
                        var processes = [];
                        var result = xml.xmlToJSON(response.data);
                        var capabilities = result.Capabilities;
                        var processOfferings = capabilities.ProcessOfferings;
                        var processesVar = processOfferings.Process;
                        if ($.isArray(processesVar)) {
                            processes = processesVar;
                        } else {
                            processes.push(processesVar);
                        }
                        var exists = false;
                        for (var i = 0; i < processes.length; i++) {
                            if (processId === processes[i].Identifier) {
                                exists = true;
                                break;
                            }
                        }

                        if (exists) {
                            return $http.get(replaceTargetPath(wpsUrl + WPS_DESCRIBE_PROCESS_PATH) + processes[i].Identifier);
                        }

                    }, function (msg) {
                        deferred.reject(msg);
                    }).then(function (response) {
                        var result = xml.xmlToJSON(response.data);
                        var processDescriptions = result.ProcessDescriptions;
                        var processDescription = processDescriptions.ProcessDescription;
                        var dataInputs = processDescription.DataInputs;
                        var input = dataInputs.Input;
                        var parameterArray = [];
                        for (var di = 0; di < input.length; di++) {
                            var inputDefinition = input[di];
                            var maxOccurs = inputDefinition["@maxOccurs"];
                            var literalData = inputDefinition.LiteralData;
                            if (JOB_UUID_PARAM_NAME !== inputDefinition.Identifier) {
                                parameterArray.push({
                                    identifier: inputDefinition.Identifier,
                                    title: inputDefinition.Title,
                                    abstract: inputDefinition.Abstract,
                                    defaultValues: literalData !== undefined ? literalData.DefaultValue : undefined,
                                    multiple: maxOccurs > 1
                                });
                            }
                        }
                        deferred.resolve(parameterArray);
                    });
            }else{
                deferred.reject("NOT IMPLEMENTED");
            }

            return deferred.promise;
        }

        function generateUUID() {
            /* jshint ignore:start */
            var d = new Date().getTime();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            /* jshint ignore:end */
        }

        function zoomToLayer(layerInstance) {
            var duration = 2000;
            var start = +new Date();
            var pan = ol.animation.pan({
                duration: duration,
                source: /** @type {ol.Coordinate} */ (map.getView().getCenter()),
                start: start
            });
            var zoom = ol.animation.zoom({
                duration: duration,
                resolution: map.getView().getResolution(),
                start: start
            });
            map.beforeRender(pan, zoom);
            map.getView().fit(layerInstance.getExtent(), map.getSize());
        }

        function deleteLayer(layer) {
            var coverageStoreId = layer.Name.replace(GEOSERVER_WORKSPACE + ":", "");
            return $http.delete(BACKEND_GEOSERVER_DELETE_PATH + "/" + GEOSERVER_WORKSPACE + "/" + coverageStoreId);
        }

        function moveLayer(arr, fromIndex, toIndex) {
            var fromLayer = arr[fromIndex];
            var toLayer = arr[toIndex];
            if (toLayer !== undefined) {
                var fromZIndex = fromLayer.instance.getZIndex();
                var toZIndex = toLayer.instance.getZIndex();
                fromLayer.instance.setZIndex(toZIndex);
                toLayer.instance.setZIndex(fromZIndex);
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, fromLayer);
            }
        }

        function getTileGridLayer() {
            return tileGridLayer;
        }

        function getMap() {
            return map;
        }

        return {
            initMap: initMap,
            isMapInitialized: isMapInitialized,
            getWmsLayers: getWmsLayers,
            refreshInformation: refreshInformation,
            zoomToLayer: zoomToLayer,
            deleteLayer: deleteLayer,
            getTileGridLayer: getTileGridLayer,
            getMap: getMap,
            moveLayer: moveLayer,
            getWPSInformation: getWPSInformation,
            executeWPSProcess: executeWPSProcess,
            retrieveWPSResultLinks: retrieveWPSResultLinks,
            retrieveJobInformation: retrieveJobInformation
        };
    }
);
