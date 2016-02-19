"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/map.js');

var curl = require('curlrequest');
var Map = function() {
};
// 创建用户
Map.prototype = {
  geocoder : function(latitude, longitude, callback) {
    var map_url = "http://apis.map.qq.com/ws/geocoder/v1/?location=" + latitude
        + "," + longitude + "&key=MRJBZ-K5HW4-XDFUI-X3Z4L-RIXT3-IOFGY";
    logger.debug('curl: %s', map_url);
    curl.request({
      url : map_url,
      method : 'GET'
    }, function(err, results) {
      try {
        if (err) {
          logger.debug('geocoder  %s', err);
          callback(err);
        } else {
          logger.debug('geocoder results %s', results);
          results = JSON.parse(results);
          if (results.status == 0) {
            callback(null, results.result);
          } else {
            callback(results.message);
          }
        }
      } catch (e) {
        logger.error(e);
        callback(e);
      }
    });
  }
};

module.exports = new Map();
