// 微信卡券
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/wxcard.js');
var util = require('util');
var crypto = require('crypto');

var path = require('path');

var express = require('express');
var router = express.Router();

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var app = config.app;

var nodeWeixinSettings = require('node-weixin-settings');
nodeWeixinSettings.registerSet(function(id, key, value) {
  logger.debug('registerSet %s %s %s', id, key, JSON.stringify(value));
  if (!app[id]) {
    app[id] = {};
  }
  app[id][key] = value;
});
nodeWeixinSettings.registerGet(function(id, key) {
  logger.debug('registerGet %s %s', id, key);
  if (app[id] && app[id][key]) {
    var value = app[id][key];
    logger.debug('registerGet %s', JSON.stringify(value));
    return value;
  }
  return null;
});

var nodeWeixinAuth = require('node-weixin-auth');
var nodeWeixinRequest = require('node-weixin-request');


// shopId: '', // 门店Id
// cardType: '', // 卡券类型
// cardId: '', // 卡券Id
// timestamp: 0, // 卡券签名时间戳
// nonceStr: '', // 卡券签名随机串
// signType: '', // 签名方式，默认'SHA1'
// cardSign: '', // 卡券签名
router.get('/list', function (req, res, next) {
  var openid = req.query.openid;

  nodeWeixinAuth.determine(app, function () {
    var authData = nodeWeixinSettings.get(app.id, 'auth');
    var url = 'https://api.weixin.qq.com/card/user/getcardlist?access_token=' + authData.accessToken;
    nodeWeixinRequest.json(url, {
      openid: openid,
      card_id: ""
    }, function(err, json) {
      res.render('wxcard_list', {
        layout : 'layout',
        title : '我的优惠券',
        card_list: json.card_list,
        openid: openid
      });
    });
  });
});

module.exports = router;
