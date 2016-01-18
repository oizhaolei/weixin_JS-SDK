// 微信卡券
var path = require('path');

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
// cardType: '', // 卡券类型
// cardId: '', // 卡券Id
// timestamp: 0, // 卡券签名时间戳
// nonceStr: '', // 卡券签名随机串
// signType: '', // 签名方式，默认'SHA1'
// cardSign: '', // 卡券签名
router.get('/list', function (req, res, next) {
  var openid = req.query.openid;
  wxcard.list(openid, '', function(err, card_list) {
    if (err) {
      next(err);
    } else {
      async.each(card_list, function(card, callback) {
        var card_id = card.card_id;
        var code = card.code;
        wxcard.detail(card_id, code, function(err, card_detail) {
          card.card_detail = card_detail;
          callback();
        });
      }, function (err) {
        if(err) {
          console.log("err: " + err);
        } else {
          logger.debug('card_list: %s', JSON.stringify(card_list));

          res.render('wxcard_list', {
            layout : 'layout',
            title : '我的优惠券',
            card_list: card_list,
            openid: openid
          });
        }
      });
    }
  });
});
router.get('/consume', function (req, res, next) {
  var code = req.query.code;
  var card_id = req.query.card_id;
  wxcard.detail(card_id, code, function(err, card) {
    if (err) {
      next(err);
    } else {
      var reduce_cost = card.reduce_cost;
      //核销
      wxcard.consume(card_id, code, reduce_cost, function(err, account, charge) {
        if (err) {
          next(err);
        } else {
          var content = i18n.__('card_consume_success', parseFloat(charge.cash_fee)/100, parseFloat(account.balance)/100);
          res.render('wxcard_consume', {
            layout : 'layout',
            title : '我的优惠券',
            account : account,
            charge : charge,
            msg : content
          });
        }
      });
    }
  });

});
module.exports = router;
