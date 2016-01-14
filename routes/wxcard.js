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


// shopId: '', // 门店Id
// cardType: '', // 卡券类型
// cardId: '', // 卡券Id
// timestamp: 0, // 卡券签名时间戳
// nonceStr: '', // 卡券签名随机串
// signType: '', // 签名方式，默认'SHA1'
// cardSign: '', // 卡券签名
router.get('/list', function (req, res, next) {

  nodeWeixinAuth.determine(app, function () {
    var authData = nodeWeixinSettings.get(app.id, 'auth');

    var type = 'wx_card';
    nodeWeixinAuth.ticket.determine(app, authData.accessToken, type, function(err) {
      if (err) {
        cb(err);
      } else {
        var ticket = nodeWeixinSettings.get(app.id, type).ticket;
        var shopId = '';
        var cardType = '';
        var cardId = '';
        var timestamp = String((new Date().getTime() / 1000).toFixed(0));
        var sha1 = crypto.createHash('sha1');
        sha1.update(timestamp);
        var nonceStr = sha1.digest('hex');
        var signType = 'SHA1';

        console.log('ticket: %s, app.id: %s, shopId: %s, timestamp: %s, nonceStr: %s, cardId: %s, cardType: %s', ticket, app.id, shopId, timestamp, nonceStr, cardId, cardType);
        var str = [ticket, app.id, shopId, timestamp, nonceStr, cardId, cardType].sort().join('');
        var cardSign = crypto.createHash('sha1').update(str).digest('hex');
        console.log('%s => %s', str, cardSign);

        res.render('wxcard_list', {
          layout : 'layout',
          title : '我的优惠券',
          cardargs : {
            shopId: shopId, // 门店Id
            cardType: cardType, // 卡券类型
            cardId: cardId, // 卡券Id
            timestamp: timestamp, // 卡券签名时间戳
            nonceStr: nonceStr, // 卡券签名随机串
            signType: signType, // 签名方式，默认'SHA1'
            cardSign: cardSign // 卡券签名
          }
        });
      }
    });
  });
});


module.exports = router;
