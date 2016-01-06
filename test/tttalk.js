var assert = require('assert');

var async = require('async');

var tttalk = require('../lib/tttalk');
var moment = require("moment");
var seed = moment().unix() ;

var username = 'username' + seed;
var from_lang = 'CN';
var to_lang = 'KR';

var content = '呵呵';
var to_content = '하하';
var fee = 23;

describe('tttalk', function () {
  it('normal', function (done) {
    async.waterfall([function(callback) {
      tttalk.createAccount(username, function(err, account) {
        console.log(account);
        assert(!err);
        assert(account.username == username);
        callback();
      });
    }, function(callback) {
      tttalk.requestTranslate(from_lang, to_lang, content, username, function(err, newId) {
        console.log(err);
        console.log(newId);
        assert(!err);
        assert(newId > 0);
        callback(null, newId);
      });
    }, function(id, callback) {
      tttalk.translate_callback(id, to_content, fee, function(err, message) {
        console.log(err);
        console.log(message);
        assert(!err);
        assert(message.id == id);
        callback();
      });
    }, function(callback) {
      tttalk.deleteAccount(username, function(err, account) {
        console.log(account);
        assert(!err);
        assert(account);
        callback();
      });
    }], function(error, result) {
      done();
    });
  });

});
