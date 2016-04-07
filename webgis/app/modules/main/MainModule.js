/**
 * Created by rf-santos on 22/01/2016.
 */
'use strict';

angular
    .module('MainModule', [
        'ngAnimate',
        'ngCookies',
        'ngResource',
        'ngRoute',
        'ngSanitize',
        'ngTouch',
        'pascalprecht.translate',
        'ngDialog',
        'OverviewModule'
    ])
    .config(function ($routeProvider, $translateProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'modules/overview/Overview.html',
                controller: 'overviewController',
                controllerAs: 'main'
            }).otherwise({
                redirectTo: '/'
            });
        $translateProvider.useStaticFilesLoader({
            files: [
                {
                    prefix: 'resources/locales/locale-',
                    suffix: '.json'
                }
            ]
        });
        $translateProvider.useSanitizeValueStrategy('sanitize');
        $translateProvider.preferredLanguage('en');

    });
