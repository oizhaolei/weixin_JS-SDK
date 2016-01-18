var config = require('../config.json');

var logger = require('log4js').getLogger('test/wxsettigns.js');
var path = require('path');
var fs = require("fs");

var readFile = function(filename) {
  var buf = fs.readFileSync(path.join(config.tmpdir, filename), "utf8");
  return buf;
};

var writeFile = function(filename, str) {
  fs.writeFileSync(path.join(config.tmpdir, filename), str, "utf8");
};
var nwSettings = require('node-weixin-settings');
var prefix = 'wx_';
nwSettings.registerSet(function(id, key, value, cb) {
  logger.debug('registerSet %s %s %s', id, key, JSON.stringify(value));
  writeFile(prefix + id + '_' + key, JSON.stringify(value));
  cb(null);
});
nwSettings.registerGet(function(id, key, cb) {
  var value = null;
  try{
    value = JSON.parse(readFile(prefix + id + '_' + key));
    logger.debug('registerGet %s %s %s', id, key, JSON.stringify(value));
  } catch (e) {
    logger.error(e);
  }
  cb(value);
});
