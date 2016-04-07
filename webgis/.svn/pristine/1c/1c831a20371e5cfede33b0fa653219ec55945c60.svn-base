'use strict';
/* global ol:true */
angular.module('OverviewModule')
    .controller('overviewTileSelectionController', function ($scope, overviewMapService) {

        $scope.dialogId = $scope.ngDialogId;
        var addInteraction = function () {

            angular.element("#map").addClass("default-tile-selection-cursor");

            overviewMapService.getTileGridLayer().setVisible(true);

            $scope.selectInteraction = new ol.interaction.Select({
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#DEDEDE',
                        width: 1
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.6)'
                    })
                })
            });
            overviewMapService.getMap().addInteraction($scope.selectInteraction);

            var selectedFeatures = $scope.selectInteraction.getFeatures();

            // a DragBox interaction used to select features by drawing boxes
            $scope.dragBoxInteraction = new ol.interaction.DragBox({
            });

            overviewMapService.getMap().addInteraction($scope.dragBoxInteraction);


            $scope.dragBoxInteraction.on('boxend', function () {
                // features that intersect the box are added to the collection of
                // selected features, and their names are displayed in the "info"
                // div
                var extent = $scope.dragBoxInteraction.getGeometry().getExtent();
                overviewMapService.getTileGridLayer().getSource().getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
                    selectedFeatures.push(feature);
                });

                angular.element("#proceed-button").focus();
            });

            // clear selection when drawing a new box and when clicking on the map
            $scope.dragBoxInteraction.on('boxstart', function () {
                selectedFeatures.clear();
            });
            overviewMapService.getMap().on('click', function () {
                selectedFeatures.clear();
            });
        };

        var removeInteraction = function () {
            overviewMapService.getTileGridLayer().setVisible(false);
            overviewMapService.getMap().removeInteraction($scope.selectInteraction);
            overviewMapService.getMap().removeInteraction($scope.dragBoxInteraction);
            angular.element("#map").removeClass("default-tile-selection-cursor");
        };

        $scope.selectedTiles = function () {
            var features = $scope.selectInteraction.getFeatures().getArray();
            var tileIds = [];
            for (var i = 0; i < features.length; i++) {
                tileIds.push(features[i].get('PR'));
            }
            return tileIds;
        };

        addInteraction();

        $scope.$on('ngDialog.closing', function (e, $dialog) {
            if ($scope.dialogId === $dialog.attr('id')) {
                removeInteraction();
            }
        });

    });