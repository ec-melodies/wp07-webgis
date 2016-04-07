'use strict';

angular.module('OverviewModule')
    .controller('overviewController', function ($scope, $interval, ngDialog, overviewMapService) {


        overviewMapService.initMap();

        overviewMapService.isMapInitialized().then(function () {
            $scope.layers = overviewMapService.getWmsLayers();
            $scope.sortLayers();
            overviewMapService.retrieveJobInformation();
        });

        $scope.isLayerVisible = function (layer) {
            return layer.instance.getVisible();
        };

        $scope.setLayerVisible = function ($event, layer) {
            var checkbox = $event.target;
            layer.instance.setVisible(checkbox.checked);
        };

        $scope.zoomToLayer = function (layer) {
            overviewMapService.zoomToLayer(layer.instance);
        };
        $scope.deleteLayer = function (layer) {

            ngDialog.openConfirm({
                template: 'modules/overview/OverviewConfirmationDialog.html',
                data: {
                    itemName: layer.Title
                },
                className: 'ngdialog-theme-default general-confimation-dialog'
            }).then(function () {
                overviewMapService.deleteLayer(layer).then(
                    function () {
                        $scope.refreshLayers();
                    }
                );
            });
        };

        $scope.downloadLayer = function (layer) {
            overviewMapService.retrieveWPSResultLinks(layer.statusLocation, layer.layerIdentifier).then(function (result) {
                if (result !== undefined) {
                    var link = document.createElement('a');

                    link.style.display = 'none';

                    document.body.appendChild(link);

                    for (var i = 0; i < result.length; i++) {
                        link.setAttribute('download', result[i].name);
                        link.setAttribute('href', result[i].link);
                        link.click();
                    }
                    document.body.removeChild(link);
                }
            });

        };

        $scope.moveLayerDown = function (index) {
            overviewMapService.moveLayer($scope.layers, index, index + 1);
        };

        $scope.moveLayerUp = function (index) {
            overviewMapService.moveLayer($scope.layers, index, index - 1);
        };

        $scope.sortLayers = function () {
            $scope.layers = $scope.layers.sort(function (a, b) {
                return (a.instance.getZIndex() <= b.instance.getZIndex()) ? 1 : -1;
            });
        };
        $scope.openHelpDialog = function () {
            ngDialog.open({
                template: 'modules/overview/OverviewHelpDialog.html',
                controller: 'overviewHelpDialogController',
                className: 'ngdialog-theme-default menu-dialog-help'
            });
        };

        $scope.openProcessInvokeDialog = function (processIdentifier, processTitle, tileIds) {
            ngDialog.closeAll();
            $scope.tileIds = tileIds;
            var dialog = ngDialog.open({
                template: 'modules/overview/OverviewProcessDialog.html',
                controller: 'overviewLULCDialogController',
                className: 'ngdialog-theme-default',
                data: {
                    processIdentifier: processIdentifier,
                    processTitle: processTitle
                },
                scope: $scope
            });
            dialog.closePromise.then(function () {
                $scope.tileIds = undefined;
            });
        };

        $scope.openTileSelectionDialog = function (processIdentifier, processTitle) {
            if ($scope.tileSelectionDialogId === undefined || !ngDialog.isOpen($scope.tileSelectionDialogId)) {
                var dialog = ngDialog.open({
                    template: 'modules/overview/OverviewTileSelectionDialog.html',
                    controller: 'overviewTileSelectionController',
                    className: 'ngdialog-theme-default menu-dialog-tile-selection-light',
                    scope: $scope,
                    trapFocus: false,
                    closeByDocument: false,
                    overlay: false,
                    data: {
                        processIdentifier: processIdentifier,
                        processTitle: processTitle
                    }
                });
                $scope.tileSelectionDialogId = dialog.id;
                dialog.closePromise.then(function () {
                    $scope.tileSelectionDialogId = undefined;
                });
            }

        };

        $scope.refreshLayers = function () {
//            console.log("retrieving new layers...");
            overviewMapService.refreshInformation().then(function () {
                $scope.layers = overviewMapService.getWmsLayers();
                $scope.sortLayers();
                overviewMapService.retrieveJobInformation();
            });
        };

        $interval($scope.refreshLayers, 30000);
    });