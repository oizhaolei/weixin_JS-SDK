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
  wxpay.getBrandWCPayRequestParams({
    openid: openid,
    body: '公众号支付测试',
    detail: '公众号支付测试',
    out_trade_no: '20150331'+Math.random().toString().substr(2, 10),
    total_fee: 1,
    spbill_create_ip: '192.168.2.210',
    notify_url: 'http://test.tttalk.org:3003/wxpay/noti'
  }, function(err, result){
    logger.info(err);
    logger.info(result);
    res.render('wxpay/jsapi/index', {
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
