var assert = require('assert');
var config = require('../config.json');

var logger = require('log4js').getLogger('test/weixin.js');
var path = require('path');
var fs = require("fs");

var async = require('async');

var readFile = function(filename) {
  var buf = fs.readFileSync(path.join(config.tmpdir, filename), "utf8");
  return buf;
};

var writeFile = function(filename, str) {
  fs.writeFileSync(path.join(config.tmpdir, filename), str, "utf8");
};
var nwSettings = require('node-weixin-settings');
var prefix = 'wx_';
nwSettings.registerSet(function(id, key, value) {
  logger.debug('registerSet %s %s %s', id, key, JSON.stringify(value));
  writeFile(prefix + id + '_' + key, JSON.stringify(value));
});
nwSettings.registerGet(function(id, key) {
  var value = null;
  try{
    value = JSON.parse(readFile(prefix + id + '_' + key));
    logger.debug('registerGet %s %s %s', id, key, JSON.stringify(value));
  } catch (e) {
    logger.error(e);
  }
  return  value;
});

var wxcard = require('../lib/wxcard');

describe('wxcard', function () {
  it('list', function (done) {
    var openid = process.env.APP_OPENID;
    var card_id = process.env.APP_CARD_ID;
    wxcard.list(openid, card_id, function(err, card_list) {
      assert(!err);

      async.each(card_list, function(card, callback) {
        var card_id = card.card_id;
        var code = card.code;
        wxcard.detail(card_id, code, function(err, card) {
          assert(!err);
          assert(card);
          wxcard._check_consume(card_id, code, function(err, results) {
            assert(!err);
            assert(results);
            wxcard.consume(card_id, code, card.reduce_cost, function(err, results) {
              assert(!err);
              assert(results);
              callback();
            });
          });
        });
      }, function(err) {
        assert(!err);
        done();
      });
    });
  });

});
