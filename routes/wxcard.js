// 微信卡券
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/wxcard.js');

var path = require('path');

var express = require('express');
var router = express.Router();

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var wxcard = require('../lib/wxcard');

// shopId: '', // 门店Id
// cardType: '', // 卡券类型
// cardId: '', // 卡券Id
// timestamp: 0, // 卡券签名时间戳
// nonceStr: '', // 卡券签名随机串
// signType: '', // 签名方式，默认'SHA1'
// cardSign: '', // 卡券签名
router.get('/list', function (req, res, next) {
  var openid = req.query.openid;
  wxcard.list(openid, '', function(err, list) {
    res.render('wxcard_list', {
      layout : 'layout',
      title : '我的优惠券',
      card_list: list,
      openid: openid
    });
  });
});
module.exports = router;
