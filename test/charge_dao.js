var assert = require('assert');

var moment = require("moment");
var seed = moment().unix() ;

var charge_dao = require('../dao/charge_dao');
var transaction_id = seed++;

describe('account dao', function () {
  it('createCharge', function (done) {
    var openid = process.env.APP_OPENID;
    var wx = { appid: 'wx99b8690b0397ad16',
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
                 balance: '1011',
                 trade_type: 'JSAPI',
                 memo: 'memo--',
                 transaction_id: transaction_id
             };
    charge_dao.createCharge(
      wx.transaction_id,
      wx.openid,
      wx.cash_fee,
      wx.total_fee,
      wx.balance,
      wx.out_trade_no,
      wx.bank_type,
      wx.fee_type,
      wx.time_end,
      wx.trade_type,
      wx.memo,
      function(err, results, charge){
        done();
      });
  });
  it('getByTransactionId', function (done) {
    charge_dao.getByTransactionId(transaction_id, function(err, charge) {
      assert(!err);
      assert(charge);
      assert(charge.transaction_id, transaction_id);
      done();
    });
  });
  it('findCharges', function (done) {
    var openid = process.env.APP_OPENID;
    charge_dao.findCharges({
      openid : openid
    }, function(err, charges) {
      assert(!err);
      assert(charges);
      assert(charges.length > 0);
      done();
    });
  });
  it('findCharges with where', function (done) {
    var openid = process.env.APP_OPENID;
    charge_dao.findCharges({
      openid:openid,
      trade_type:'JSAPI'
    }, function(err, charges) {
      assert(!err);
      assert(charges);
      assert(charges.length === 1);
      done();
    });
  });
  it('findCharges with where', function (done) {
    var openid = process.env.APP_OPENID;
    charge_dao.findCharges({
      openid:openid,
      memo:'memo--'
    }, function(err, charges) {
      assert(!err);
      assert(charges);
      assert(charges.length === 1);
      done();
    });
  });
  it('deleteCharge', function (done) {
    charge_dao.deleteCharge(transaction_id, function(err, results) {
      assert(!err);
      assert(results);
      assert.equal(results.affectedRows, 1);
      charge_dao.getByTransactionId(transaction_id, function(err, charge) {
        assert(!err);
        assert.equal(charge, null);
        done();
      });
    });
  });

});
