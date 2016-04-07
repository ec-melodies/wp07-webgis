module.exports = function (grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        packageModules: {
            dist: {
                src: 'package.json',
                dest: 'dist'
            }
        },
        copy: {
            dist: {
                files: [
                    {
                        dest: 'dist/',
                        src: ['server.js', 'proxies.conf']
                    }
                ]
            }
        },
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            'dist'
                        ]
                    }
                ]
            }
        }

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-package-modules');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('build', ['clean:dist', 'packageModules', 'copy:dist']);

};