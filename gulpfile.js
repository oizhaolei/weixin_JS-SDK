var gulp = require('gulp');

var less = require('gulp-less');
var path = require('path');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');

var jshint = require('gulp-jshint');

gulp.task('default', function() {
});

gulp.task('less', function () {
  return gulp.src('./less/**/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./public/stylesheets'));
});
gulp.task('pre-test', function () {
  return gulp.src(['./lib/*.js', './routes/*.js', './dao/*.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('default', ['pre-test'], function () {
  return gulp.src(['test/*.js'])
    .pipe(mocha())
    // Creating the reports after tests ran
    .pipe(istanbul.writeReports())
    // Enforce a coverage of at least 90%
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

gulp.task('lint', function() {
  return gulp.src(['./lib/*.js', './routes/*.js', './dao/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
