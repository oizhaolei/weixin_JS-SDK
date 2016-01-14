var gulp = require('gulp');

var less = require('gulp-less');
var path = require('path');

var mocha = require('gulp-mocha');
var gutil = require('gulp-util');

var jshint = require('gulp-jshint');

gulp.task('less', function () {
  return gulp.src('./less/**/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./public/stylesheets'));
});

gulp.task('default', function() {
  return gulp.src(['test/*.js'], { read: false })
    .pipe(mocha({
      reporter: 'spec',
      globals: {
        should: require('should')
      }
    }));
});

gulp.task('mocha', function() {
  return gulp.src(['test/*.js'], { read: false })
    .pipe(mocha({ reporter: 'list' }))
    .on('error', gutil.log);
});

gulp.task('watch-mocha', function() {
  gulp.watch(['dao/**', 'lib/**', 'test/*.js'], ['mocha']);
});

gulp.task('lint', function() {
  return gulp.src(['./lib/*.js', './routes/*.js', './dao/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
