// 公众号支付
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/wxpay');

var express = require('express');
var router = express.Router();

var fs = require('fs');

var WXPay = require('weixin-pay');
var wxpay = WXPay({
  appid: config.appId,
  mch_id: config.mch_id,
  partner_key: config.wxpay_api_secret, //微信商户平台API密钥
  pfx: fs.readFileSync(__dirname + '/../cert/apiclient_cert.p12'), //微信商户平台证书
});

// 接入验证
router.get('/', function (req, res, next) {
  logger.info(req.query);
  var openid = req.query.openid;
  var fee = req.query.fee;

  var requestParams = {
    openid: openid,
    body: '充值',
    detail: parseFloat(fee)/100 + '元',
    out_trade_no: '20150331'+Math.random().toString().substr(2, 10),
    total_fee: fee,
    spbill_create_ip: '192.168.2.210',
    notify_url: 'http://test.tttalk.org/wxpay/noti'
  };
  wxpay.getBrandWCPayRequestParams(requestParams, function(err, result){
    logger.info(err);
    logger.info(result);
    res.render('wxpay/jsapi/index', {
      params : requestParams,
      payargs : result
    });
  });
});
router.post('/', function (req, res, next) {
  logger.info(req.body);
});
router.all('/noti', wxpay.useWXCallback(function(msg, req, res, next){
    // 处理商户业务逻辑
  logger.info(req);

  res.status(200).send();
}));

module.exports = router;
