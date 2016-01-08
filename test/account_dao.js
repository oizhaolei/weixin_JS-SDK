var assert = require('assert');

var async = require('async');

var account_dao = require('../dao/account_dao');
var moment = require("moment");
var seed = moment().unix() ;
var username = 'u_' + seed;

describe('account dao', function () {
  it('new', function (done) {
    async.waterfall([function(callback) {
      account_dao.createAccount(username, function(err, results, account) {
        assert(!err);
        assert.equal(results.affectedRows, 1);
        assert.equal(account.username, username);
        callback();
      });
    }, function(callback) {
      account_dao.getByUsername(username, function(err, account){
        console.log(account);
        assert(!err);
        assert(account);
        callback();
      });
    }, function(callback) {
      account_dao.updateAccount(
        username, {
          fullname      :'fullname' + seed,
          portrait      :'8cbde0ab21aa32db07f692ec16d3dad4',
          delete_flag   :'0'
        }, function(err, results, account) {
          assert(!err);
          assert.equal(results.affectedRows, 1);
          assert.equal(account.username, username);
          callback();
        });
    }, function(callback) {
      account_dao.deleteAccount(
        username, function(err, results) {
          assert(!err);
          assert(results.affectedRows == 1);
          callback();
        });
    }], function(error, result) {
      done();
    });
  });

});
