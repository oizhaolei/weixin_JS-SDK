// 微信卡券
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

var charge_dao = require('../dao/charge_dao');
var wxcard = require('../lib/wxcard');

// shopId: '', // 门店Id
// cardType: '', // 卡券类型
// cardId: '', // 卡券Id
// timestamp: 0, // 卡券签名时间戳
// nonceStr: '', // 卡券签名随机串
// signType: '', // 签名方式，默认'SHA1'
// cardSign: '', // 卡券签名
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
  charge_dao.findCharges({
    openid : openid,
    memo : card_id
  }, function(err, charges) {
    if (charges.length > 0) {
      var content = i18n.__('card_consume_count_limit' );
      //已经使用过此券
      res.render('wxcard_consume', {
        layout : 'layout',
        title : '我的优惠券',
        openid : openid,
        msg : content
      });
    } else {
      //没有使用过相关card_id
      wxcard.detail(card_id, code, function(err, card) {
        if (err) {
          next(err);
        } else {
          var reduce_cost = card.cash.reduce_cost;
          //核销
          wxcard.consume(card_id, code, reduce_cost, function(err, account, charge) {
            if (err) {
              var content = i18n.__('card_consume_error');
              res.render('wxcard_consume', {
                layout : 'layout',
                title : '我的优惠券',
                openid : openid,
                msg : content
              });
            } else {
              var content = i18n.__('card_consume_success', parseFloat(charge.total_fee)/100, parseFloat(account.balance)/100);
              res.render('wxcard_consume', {
                layout : 'layout',
                title : '我的优惠券',
                account : account,
                charge : charge,
                openid : openid,
                msg : content
              });
            }
          });
        }
      });

    }
  });

});
module.exports = router;
