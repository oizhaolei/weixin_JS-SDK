// 微信优惠券
var path = require('path');

var logger = require('log4js').getLogger('routers/wxcard.js');

var express = require('express');
var router = express.Router();
var async = require('async');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var wxcard = require('../lib/wxcard');

// shopId: '', // 门店Id
// cardType: '', // 优惠券类型
// cardId: '', // 优惠券Id
// timestamp: 0, // 优惠券签名时间戳
// nonceStr: '', // 优惠券签名随机串
// signType: '', // 签名方式，默认'SHA1'
// cardSign: '', // 优惠券签名
router.get('/', function (req, res, next) {
  var openid = req.query.openid;
  res.render('wxcard_list', {
    layout : 'layout',
    title : '我的优惠券',
    openid : openid
  });
});
router.get('/list', function (req, res, next) {
  var openid = req.query.openid;
  wxcard.list(openid, '', function(err, card_list) {
    if (err) {
      next(err);
    } else {
      if (!card_list) {
        card_list = [];
      }
      async.each(card_list, function(card, callback) {
        var card_id = card.card_id;
        var code = card.code;
        wxcard.detail(card_id, code, function(err, card_detail) {
          card.openid = openid;
          card.card_detail = card_detail;
          callback();
        });
      }, function (err) {
        if(err) {
          console.log("err: " + err);
        } else {
          logger.debug('card_list: %s', JSON.stringify(card_list));

          res.json( card_list );
        }
      });
    }
  });
});

router.get('/consume', function (req, res, next) {
  var openid = req.query.openid;
  var card_id = req.query.card_id;
  var code = req.query.code;

  res.render('wxcard_consume', {
    layout : 'layout',
    title : '我的优惠券'
  });
});
module.exports = router;
