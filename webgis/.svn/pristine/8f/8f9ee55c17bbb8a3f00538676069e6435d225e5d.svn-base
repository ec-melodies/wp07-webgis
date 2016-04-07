'use strict';

angular.module('OverviewModule')
    .controller('overviewLULCDialogController', function ($scope, overviewMapService, ngDialog) {

        var processIdentifier = $scope.ngDialogData.processIdentifier;

        $scope.values = {};
        $scope.errorMessage = "";
        $scope.addValues = {};

        overviewMapService.getWPSInformation(processIdentifier).then(function (result) {
            $scope.parameters = result;
            for (var i = 0; i < $scope.parameters.length; i++) {
                $scope.values[$scope.parameters[i].identifier] = [];

                var defaultValues = $scope.parameters[i].defaultValues;
                if (defaultValues) {
                    var split = defaultValues.split(",");
                    if (split.length > 1 && $scope.parameters[i].multiple) {
                        for (var p = 0; p < split.length; p++) {
                            $scope.values[$scope.parameters[i].identifier].push(split[p]);
                        }
                    } else {
                        $scope.addValues[$scope.parameters[i].identifier] = defaultValues;
                    }
                }

                if ($scope.parameters[i].identifier === "tiles") {
                    if ($scope.$parent.tileIds !== undefined && $scope.$parent.tileIds.length > 0) {
                        $scope.values[$scope.parameters[i].identifier] = [];
                        for (var j = 0; j < $scope.$parent.tileIds.length; j++) {
                            $scope.values[$scope.parameters[i].identifier].push($scope.$parent.tileIds[j].toString());
                        }
                    }
                }

            }
        }, function (msg) {
            $scope.serviceError = msg;
        });

        $scope.addValue = function (parameterIdentifier) {

            for (var j = 0; j < $scope.parameters.length; j++) {
                var parameter = $scope.parameters[j];
                if (parameterIdentifier === parameter.identifier && !parameter.multiple) {
                    return;
                }
            }
            $scope.values[parameterIdentifier].push($scope.addValues[parameterIdentifier]);
            $scope.addValues[parameterIdentifier] = '';
            $scope.errorMessage = "";
        };

        $scope.removeValue = function (parameterIdentifier, index) {
            $scope.values[parameterIdentifier].splice(index, 1);
            $scope.errorMessage = "";
        };

        $scope.runProcess = function () {
            $scope.errorMessage = "";
            var values = {};
            var identifiers = Object.keys($scope.values);
            for (var i = 0; i < identifiers.length; i++) {
                values[identifiers[i]] = $scope.values[identifiers[i]].filter(Boolean);
                if (values[identifiers[i]].length === 0) {
                    delete values[identifiers[i]];
                }
            }

            for (var j = 0; j < $scope.parameters.length; j++) {
                var parameter = $scope.parameters[j];
                if (!parameter.multiple) {
                    values[parameter.identifier] = $scope.addValues[parameter.identifier];
                }
            }

            overviewMapService.executeWPSProcess(processIdentifier, values).then(function (result) {
                ngDialog.closeAll();
                ngDialog.open({
                    template: 'modules/overview/OverviewProcessSuccessDialog.html',
                    data: {
                        processId: result.id
                    },
                    className: "ngdialog-theme-default menu-lulc-confimation-dialog"
                });

            }, function (reason) {
                $scope.errorMessage = reason.text;
            });
        };

    });