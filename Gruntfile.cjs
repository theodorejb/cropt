module.exports = function (grunt) {
    grunt.initConfig({
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: "node_modules/bootstrap/dist/js",
                        src: "bootstrap.bundle.min.*",
                        dest: "demo/build",
                    },
                    {
                        expand: true,
                        cwd: "",
                        src: ["cropt.js", "cropt.css"],
                        dest: "demo/build",
                    },
                ],
            },
        },
        sass: {
            dist: {
                options: {
                    style: "expanded",
                },
                files: {
                    "demo/build/bs-custom.css": "demo/styles.scss",
                },
            },
        },
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-sass");
    grunt.registerTask("default", ["copy", "sass"]);
};
