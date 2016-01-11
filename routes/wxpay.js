// 公众号支付
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/wxpay.js');

var express = require('express');
var router = express.Router();

var path = require('path');
var fs = require('fs');

var app = {
  id : config.appId,
  secret : config.appSecret,
  token : config.appToken
};

var tttalk = require('../lib/tttalk');

var nodeWeixinMessage = require('node-weixin-message');

var WXPay = require('weixin-pay');
var wxpay = WXPay({
  appid: config.appId,
  mch_id: config.mch_id,
  partner_key: config.wxpay_api_secret, //微信商户平台API密钥
  pfx: fs.readFileSync(path.join(__dirname, '../cert/apiclient_cert.p12')), //微信商户平台证书
});

// 接入验证
router.get('/', function (req, res, next) {
  var openid = req.query.openid;
  var fee = req.query.fee;

  var requestParams = {
    openid: openid,
    body: '充值',
    detail: parseFloat(fee)/100 + '元',
    out_trade_no: '20150331'+Math.random().toString().substr(2, 10),
    total_fee: fee,
    spbill_create_ip: '192.168.2.210',
    notify_url: config.wxpay_noti_url
  };
  wxpay.getBrandWCPayRequestParams(requestParams, function(err, result){
    logger.info("getBrandWCPayRequestParams: %s, %s", JSON.stringify(requestParams), JSON.stringify(result));
    res.render('wxpay/jsapi/index', {
      params : requestParams,
      payargs : result
    });
  });
});
// 处理商户业务逻辑
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
router.all('/noti', wxpay.useWXCallback(function(msg, req, res, next){
  logger.info(req.wxmessage);
  var wxmessage = req.wxmessage;
  var openid = wxmessage.openid;
  wxmessage.memo = 'wxpay';

  tttalk.wxPay(openid, wxmessage, function(err, account){
    var service = nodeWeixinMessage.service;
    var content = util.format('您充值%s, 账户余额为%s。', req.wxmessage.total_fee, account.balance);
    service.api.text(app, msg.FromUserName, content, function(error, data) {
      if (error) {
        logger.info("%s, %s", data.errcode, data.errmsg);
      }
    });

  });


  res.status(200).send();
}));

// charge_history
router.get('/charge_history', function (req, res, next) {
  var openid = req.query.openid;
  tttalk.chargeHistory(openid, function(err, data) {
    res.render('wxpay/jsapi/charge_history', {
      data : data
    });

  });
});

// fee_history
router.get('/fee_history', function (req, res, next) {
  var openid = req.query.openid;
  tttalk.feeHistory(openid, function(err, data) {
    res.render('wxpay/jsapi/fee_history', {
      data : data
    });

  });
});

module.exports = router;
