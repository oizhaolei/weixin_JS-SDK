var assert = require('assert');
var config = require('../config.json');

var async = require('async');
var moment = require("moment");
var seed = moment().unix() ;

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');

var openid = 'u_' + seed;
var up_openid = process.env.APP_OPENID;
var from_lang = 'CN';
var to_lang = 'KR';

var msgid = 'm_' + seed;
var content = '呵呵';
var to_content = '하하';
var fee = 23;
var from_content_length = 2;

describe('tttalk', function () {
  it('fee_history', function (done) {
    var openid = process.env.APP_OPENID;
    tttalk.fee_history(openid, function(err, accountData, feeHistoryData, chargeHistoryData) {
      assert(!err);
      assert(accountData);
      assert.equal(accountData.openid, openid);
      assert(feeHistoryData);
      assert(feeHistoryData.length > 0);
      assert(chargeHistoryData);
      assert(chargeHistoryData.length > 0);
      done();
    });
  });
  it('text translate', function (done) {
    async.waterfall([function(callback) {
      account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {
        assert(!err);
        assert(!oldAccount);
        assert.equal(results.affectedRows, 1);
        assert.equal(account.openid, openid);
        if (!oldAccount && up_openid) {
          account_dao.getByOpenid(up_openid, function(err, oldUpAccount) {
            // 给推荐人奖励
            tttalk.wxPay(up_openid,{
              transaction_id: 'createAccount' + seed,
              total_fee: config.subscribe_reward,
              cash_fee: config.subscribe_reward,
              fee_type: 'CNY',
              result_code: 'SUCCESS',
              return_code: 'SUCCESS',
              memo : 'subscribe'
            }, function(err, account) {
              account_dao.getByOpenid(up_openid, function(err, newUpAccount) {
                assert.equal(oldUpAccount.openid, newUpAccount.openid);
                assert.equal(newUpAccount.balance-oldUpAccount.balance, config.subscribe_reward);

                callback();
              });
            });

          });
        }

      });
    }, function(callback) {
      tttalk.saveText(msgid, from_lang, to_lang, content, openid, function(err, results) {
        console.log(err);
        console.log(results);
        assert(!err);
        callback(null, msgid);
      });
    }, function(id, callback) {
      tttalk.translate_callback(id, to_content, fee, from_content_length, function(err, message) {
        console.log(err);
        console.log(message);
        assert(!err);
        assert.equal(message.msgid, id);
        callback();
      });
    }, function(callback) {
      var wxmessage = {
        transaction_id: '100660' + seed,
        cash_fee: '0',
        total_fee: '1',
        fee_type: 'CNY',
        result_code: 'SUCCESS',
        return_code: 'SUCCESS',
        memo : 'subscribe'
      };
      tttalk.wxPay(openid, wxmessage, function(err, account, charge) {
        console.log(err);
        console.log(account);
        console.log(charge);
        assert(!err);
        assert.equal(account.openid, openid);
        assert.equal(wxmessage.total_fee, charge.total_fee);

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
                        openid: openid,
                        out_trade_no: '201503317709548182',
                        result_code: 'SUCCESS',
                        return_code: 'SUCCESS',
                        sign: '312DB6DF805740B6BD32A612740694C1',
                        time_end: '20160108130216',
                        total_fee: '1',
                        trade_type: 'JSAPI',
                        transaction_id: seed,
                      };
      wxmessage.memo = 'test pay';
      tttalk.wxPay(openid, wxmessage, function(err, account, charge) {
        console.log(account);
        console.log(charge);
        assert(!err);
        assert.equal(account.openid, openid);
        assert.equal(wxmessage.total_fee, charge.total_fee);

        callback();
      });
    }, function(callback) {
      var fee = 98;
      tttalk._charge(openid, 0, fee, 'code', 'card_id', '', 'wxcard', '', '', 'card_id', function(err, account, charge) {
        console.log(account);
        console.log(charge);
        assert(!err);
        assert.equal(account.openid, openid);
        assert.equal(fee, charge.total_fee);

        callback();
      });
    }, function(callback) {
      tttalk.profile(openid, function(err, accountData) {
        assert(!err);
        assert.equal(accountData.openid, openid);

        callback();
      });
    }, function(callback) {
      account_dao.updateAccount(openid, {
        delete_flag : 1
      }, function(err, results, account) {
        console.log(account);
        assert(!err);
        assert(account);
        assert.equal(account.delete_flag, 1);
        callback();
      });
    }], function(error, result) {
      done();
    });
  });

});
