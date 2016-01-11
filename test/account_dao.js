var assert = require('assert');

var async = require('async');

var account_dao = require('../dao/account_dao');
var moment = require("moment");
var seed = moment().unix() ;
var existOpenid = process.env.APP_OPENID;
var openid = 'u_' + seed;
var up_openid = 'up_' + seed;

describe('account dao', function () {
  it('new', function (done) {
    async.waterfall([function(callback) {
      account_dao.createAccount(existOpenid, up_openid, function(err, oldAccount, results, account) {
        assert(!err);
        assert(oldAccount);
        assert.equal(results.affectedRows, 1);
        assert.equal(account.openid, existOpenid);
        callback();
      });
    }, function(callback) {
      account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {
        assert(!err);
        assert(!oldAccount);
        assert.equal(results.affectedRows, 1);
        assert.equal(account.openid, openid);
        assert.equal(account.up_openid, up_openid);
        callback();
      });
    }, function(callback) {
      account_dao.getByOpenid(openid, function(err, account){
        console.log(account);
        assert(!err);
        assert(account);
        callback();
      });
    }, function(callback) {
      account_dao.updateAccount(
        openid, {
          nickname      :'nickname' + seed,
          portrait      :'8cbde0ab21aa32db07f692ec16d3dad4',
          delete_flag   :'0'
        }, function(err, results, account) {
          assert(!err);
          assert.equal(results.affectedRows, 1);
          assert.equal(account.openid, openid);
          callback();
        });
    }, function(callback) {
      account_dao.deleteAccount(
        openid, function(err, results) {
          assert(!err);
          assert(results.affectedRows == 1);
          callback();
        });
    }], function(error, result) {
      done();
    });
  });

});
