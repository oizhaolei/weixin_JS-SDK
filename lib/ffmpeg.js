"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/ffmpeg.js');

var ffmpeg = require('ffmpeg');

exports.soundToMP3 = function(source, dest, callback) {
  try {
    var process = new ffmpeg(source);
    process.then(function (video) {
      // Callback mode
      video.fnExtractSoundToMP3(dest, function (err, file) {
        if (err) logger.error(err);
        callback(err, file);
      });
    }, function (err) {
      if (err) logger.error(err);
    });
  } catch (e) {
    logger.error(e);
  }
};
