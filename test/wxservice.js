var assert = require('assert');
var config = require('../config.json');

var logger = require('log4js').getLogger('test/weixin.js');
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

var wxservice = require('../lib/wxservice');

describe('wxservice', function () {
  it('text', function (done) {
    var openid = process.env.APP_OPENID;
    wxservice.text(openid, 'hello', function(err, data) {
      assert(!err);
      assert.equal(data.errcode, 0);
      done();
    });
  });
  it('wxcard', function (done) {
    var openid = process.env.APP_OPENID;
    var card_id = process.env.APP_CARD_ID;
    wxservice.wxcard(openid, card_id, 0, function(err, data) {
      assert(!err);
      assert.equal(data.errcode, 0);
      done();
    });
  });

});
