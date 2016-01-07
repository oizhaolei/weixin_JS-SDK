var assert = require('assert');

var async = require('async');
var request = require('request');
var fs = require("fs");

var oss = require('../lib/oss');

var sourceUrl = 'http://mc-cdn.myqcloud.com/img55cc637cb314c.jpg';
var dest = 'tmp/img55cc637cb314c.jpg';
var tempFile = '/' + dest;
var destUrl = 'http://file.tttalk.org/' + dest;

describe('oss', function () {
  it('normal', function (done) {
    async.waterfall([function(callback) {
      var file = fs.createWriteStream(tempFile);

      console.log('download');
      request({
        url: sourceUrl,
        timeout: 13000,
        method: 'get'
      })
        .on('error', function(err){
          logger.error(sourceUrl);
          returnFail(response);
        })
        .pipe(file);

      file.on('finish', function() {
        callback();
      });

    }, function(callback) {
      console.log('upload');
      oss.putObject(tempFile, dest, 'image/jpeg', 0, function(err, data) {
        callback();
      });
    }, function(callback) {
      console.log('check');
      request(destUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          callback();
        }
      });
    }, function(callback) {
      console.log('delete');
      oss.deleteObject(dest, function(err, data) {
        callback();
      });
    }], function(error, result) {
      done();
    });
  });

});
