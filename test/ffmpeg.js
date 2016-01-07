var assert = require('assert');

var async = require('async');
var request = require('request');
var fs = require("fs");
var path = require('path');

var ffmpeg = require('../lib/ffmpeg');

var source = path.resolve(__dirname, 'sample.amr');
var dest = '/tmp/sample.mp3';

describe('ffmpeg', function () {
  it('normal', function (done) {
    async.waterfall([function(callback) {
      ffmpeg.soundToMP3(source, dest, function(err, file) {
        callback();
      });
    }], function(error, result) {
      done();
    });
  });

});
