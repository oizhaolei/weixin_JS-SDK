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
var from_content_length = 2;

describe('tttalk', function () {
  it('text translate', function (done) {
    async.waterfall([function(callback) {
      tttalk.createAccount(username, function(err, results, account) {
        assert(!err);
        assert.equal(results.affectedRows, 1);
        assert.equal(account.username, username);
        callback();
      });
    }, function(callback) {
      tttalk.saveText(from_lang, to_lang, content, username, function(err, results) {
        console.log(err);
        console.log(results);
        assert(!err);
        assert(results.insertId > 0);
        callback(null, results.insertId);
      });
    }, function(id, callback) {
      tttalk.translate_callback(id, to_content, fee, from_content_length, function(err, message) {
        console.log(err);
        console.log(message);
        assert(!err);
        assert(message.id == id);
        callback();
      });
    }, function(callback) {
      var wxmessage = { appid: 'wx99b8690b0397ad16',
                        bank_type: 'CFT',
                        cash_fee: '1',
                        fee_type: 'CNY',
                        is_subscribe: 'Y',
                        mch_id: '1302550301',
                        nonce_str: 'PNv5ZdqDSVbFkEcEV7JX27HLewTLRzL8',
                        openid: username,
                        out_trade_no: '201503317709548182',
                        result_code: 'SUCCESS',
                        return_code: 'SUCCESS',
                        sign: '312DB6DF805740B6BD32A612740694C1',
                        time_end: '20160108130216',
                        total_fee: '1',
                        trade_type: 'JSAPI',
                        transaction_id: seed
                      };
      tttalk.wxPay(wxmessage, function(err, account, charge) {
        console.log(account);
        console.log(charge);
        assert(!err);
        assert(account.username == username);
        assert.equal(wxmessage.total_fee, charge.total_fee);

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
