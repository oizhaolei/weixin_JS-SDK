// 公众号支付
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/wxpay.js');

var path = require('path');
var fs = require('fs');
var async = require('async');

var express = require('express');
var router = express.Router();

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var charge_dao = require('../dao/charge_dao');
var tttalk = require('../lib/tttalk');
var wxcard = require('../lib/wxcard');
var wxservice = require('../lib/wxservice');

var WXPay = require('weixin-pay');
var wxpay = new WXPay({
  appid: config.app.id,
  mch_id: config.mch_id,
  partner_key: config.wxpay_api_secret, //微信商户平台API密钥
  pfx: fs.readFileSync(path.join(__dirname, '../cert/apiclient_cert.p12')), //微信商户平台证书
});

// 菜单
router.get('/list', function (req, res, next) {
  var openid = req.query.openid;
  res.render('wxpay_list', {
    layout : 'layout',
    title : '微信充值',
    openid: openid
  });
});

// 支付
router.get('/pay', function (req, res, next) {
  var openid = req.query.openid;
  var fee = req.query.fee;

  var detail = parseFloat(fee)/100 + '元';
  var requestParams = {
    openid: openid,
    body: '充值',
    detail: detail,
    out_trade_no: '20150331'+Math.random().toString().substr(2, 10),
    total_fee: fee,
    spbill_create_ip: '192.168.2.210',
    notify_url: config.wxpay_noti_url
  };
  wxpay.getBrandWCPayRequestParams(requestParams, function(err, result){
    logger.info("getBrandWCPayRequestParams: %s, %s", JSON.stringify(requestParams), JSON.stringify(result));
    res.render('wxpay_detail', {
      layout : 'layout',
      title : '微信支付',
      params : requestParams,
      payargs : result
    });
  });
});
// 回调 处理商户业务逻辑
// { appid: 'wx99b8690b0397ad16',
//   bank_type: 'CFT',
//   cash_fee: '1',
//   fee_type: 'CNY',
//   is_subscribe: 'Y',
//   mch_id: '1302550301',
//   nonce_str: 'PNv5ZdqDSVbFkEcEV7JX27HLewTLRzL8',
//   openid: 'osQJkw0lp_3QE3_ouApv_rNAQhqc',
//   out_trade_no: '201503317709548182',
//   result_code: 'SUCCESS',
//   return_code: 'SUCCESS',
//   sign: '312DB6DF805740B6BD32A612740694C1',
//   time_end: '20160108130216',
//   total_fee: '1',
//   trade_type: 'JSAPI',
//   transaction_id: '1006600349201601082576188135'
// }
router.all('/noti', wxpay.useWXCallback(function(wxpay, req, res, next){
  logger.info(req.wxmessage);
  var wxmessage = req.wxmessage;
  var openid = wxmessage.openid;
  wxmessage.memo = 'wxpay';

  tttalk.wxPay(openid, wxmessage, function(err, account, charge) {
    if (err) {
      logger.error(err);
    } else {
      logger.info("account: %s", JSON.stringify(account));
      var content = i18n.__('wxpay_success', parseFloat(charge.total_fee)/100, parseFloat(account.balance)/100);
      wxservice.text(openid, content, function(err, data) {
      });
      //初次充值?
      charge_dao.findCharges({
        openid : openid,
        trade_type : 'JSAPI'
      }, function(err, charges) {
        if (charges.length === 1) {
          //检查有否可用的卡券
          wxcard.list(openid, config.card.first_pay, function(err, card_list) {
            async.each(card_list, function(card, callback) {
              var card_id = card.card_id;
              var code = card.code;
              wxcard.detail(card_id, code, function(err, card) {
                if (err) {
                  callback(err);
                } else {
                  var card_id = card.card_id;
                  var code = card.code;
                  var reduce_cost = card.cash.reduce_cost;
                  //核销
                  wxcard.consume(card_id, code, reduce_cost, function(err, account, charge) {
                    if (err) {
                      callback(err);
                    } else {
                      //通知
                      var content = i18n.__('card_consume_success', parseFloat(charge.total_fee)/100, parseFloat(account.balance)/100);
                      wxservice.text(openid, content, function(err, data) {
                      });
                    }
                  });
                }
              });
            }, function(err) {
              logger.error(err);
            });
          });
        }

      });
    }

  });
  res.success();
}));

module.exports = router;
