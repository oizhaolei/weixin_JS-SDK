var assert = require('assert');
var config = require('../config.json');

var async = require('async');
var moment = require("moment");
var seed = moment().unix() ;

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');

var openid = 'u_' + seed;
var up_openid = process.env.APP_UP_OPENID;
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
    tttalk.fee_history(openid, function(err, account, feeHistory, chargeHistory) {
      assert(!err);
      assert(account);
      assert.equal(account.openid, openid);
      assert(feeHistory);
      assert(feeHistory.length >= 0);
      assert(chargeHistory);
      assert(chargeHistory.length >= 0);
      done();
    });
  });
  it('createAccount wxPay', function (done) {
    account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {
      assert(!err);
      assert(!oldAccount);
      assert.equal(results.affectedRows, 1);
      assert.equal(account.openid, openid);
      if (!oldAccount && up_openid) {
        account_dao.getByOpenid(up_openid, function(err, oldUpAccount) {
          // 给推荐人奖励
          tttalk.wxPay(up_openid,{
            transaction_id: 'tttalk' + seed++,
            total_fee: config.subscribe_reward,
            cash_fee: config.subscribe_reward,
            fee_type: 'CNY',
            result_code: 'SUCCESS',
            return_code: 'SUCCESS',
            trade_type : 'subscribe',
            memo : openid
          }, function(err, account) {
            account_dao.getByOpenid(up_openid, function(err, newUpAccount) {
              assert.equal(oldUpAccount.openid, newUpAccount.openid);
              assert.equal(newUpAccount.balance-oldUpAccount.balance, config.subscribe_reward);

              done();
            });
          });

        });
      }
    });
  });
  it('saveText', function (done) {
    tttalk.saveText(msgid, from_lang, to_lang, content, openid, function(err, results) {
      console.log(err);
      console.log(results);
      assert(!err);
      done();
    });
  });
  it('translate_callback', function (done) {
    tttalk.translate_callback(msgid, to_content, fee, from_content_length, function(err, message) {
      console.log(err);
      console.log(message);
      assert(!err);
      assert.equal(message.msgid, msgid);
      done();
    });
  });
  it('subscribe wxPay', function (done) {
    var wxmessage = {
      transaction_id: 'tttalk' + seed++,
      cash_fee: '0',
      total_fee: '1',
      fee_type: 'CNY',
      result_code: 'SUCCESS',
      return_code: 'SUCCESS',
      trade_type : 'subscribe',
      memo : 'ss'
    };
    tttalk.wxPay(openid, wxmessage, function(err, account, charge) {
      console.log(err);
      console.log(account);
      console.log(charge);
      assert(!err);
      assert.equal(account.openid, openid);
      assert.equal(wxmessage.total_fee, charge.total_fee);

      done();
    });
  });
  it('JSAPI wxpay', function (done) {
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
                      transaction_id: 'tttalk' + seed++,
                    };
    tttalk.wxPay(openid, wxmessage, function(err, account, charge) {
      console.log(err);
      console.log(account);
      console.log(charge);
      assert(!err);
      assert.equal(account.openid, openid);
      assert.equal(wxmessage.total_fee, charge.total_fee);

      done();
    });
  });
  it('_charge', function (done) {
    var fee = 98;
    var code = 'tttalk' + seed++;
    tttalk._charge(openid, 0, fee, code, 'card_id', '', 'wxcard', '', '', 'card_id', function(err, account, charge) {
      console.log(err);
      console.log(account);
      console.log(charge);
      assert(!err);
      assert.equal(account.openid, openid);
      assert.equal(fee, charge.total_fee);

      done();
    });
  });
  it('updateAccount', function (done) {
    account_dao.updateAccount(openid, {
      delete_flag : 1
    }, function(err, results, account) {
      console.log(account);
      assert(!err);
      assert(account);
      assert.equal(account.delete_flag, 1);
      done();
    });
  });
  it('deleteAccount', function (done) {
    account_dao.deleteAccount(
      openid, function(err, results) {
        assert(!err);
        assert.equal(results.affectedRows, 1);
        done();
      });
  });
});
