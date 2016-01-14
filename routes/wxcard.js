// 微信卡券
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/wxcard.js');
var util = require('util');
var crypto = require('crypto');

var path = require('path');
var async = require('async');

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
      var cards = [];
      async.each(json.card_list, function(card, callback) {
        url = 'https://api.weixin.qq.com/card/get?access_token=' + authData.accessToken;
        nodeWeixinRequest.json(url, {
          card_id: card.card_id
        }, function(err, json) {
          if (!err && json.errcode === 0) {
            //{"card_type":"CASH","cash":{"base_info":{"id":"psQJkwxCypbuXJGT12mNGAF9eYCk","logo_url":"http://mmbiz.qpic.cn/mmbiz/Vlqd2KB0xQJQMMqU4Zpp42icCVI9cCM2FhJEfoKOEZef3sSvibajJIUPOw0Zf8mRHJS04qvPtTSNSaA3c0AbWfibQ/0?wx_fmt=png","code_type":"CODE_TYPE_QRCODE","brand_name":"TTTalk翻译","title":"翻译抵值券1元","sub_title":"充值1元可用","date_info":{"type":"DATE_TYPE_FIX_TERM","fixed_term":30,"fixed_begin_term":0},"color":"#35A4DE","notice":"请充值后使用","description":"","location_id_list":[],"get_limit":1,"can_share":false,"can_give_friend":false,"status":"CARD_STATUS_SYS_DELETE","sku":{"quantity":0,"total_quantity":1},"create_time":1452693483,"update_time":1452693483},"least_cost":100,"reduce_cost":100,"advanced_info":{"time_limit":[{"type":"MONDAY"},{"type":"TUESDAY"},{"type":"WEDNESDAY"},{"type":"THURSDAY"},{"type":"FRIDAY"},{"type":"SATURDAY"},{"type":"SUNDAY"}],"text_image_list":[],"business_service":[],"consume_share_card_list":[],"abstract":{"abstract":"翻译抵值券，面值1元，用户在本公众号充值1元人民币以上可用。","icon_url_list":[]},"share_friends":false}},"card_id":"psQJkwxCypbuXJGT12mNGAF9eYCk","code":"299208562592"}

            var cardDetail = json.card;
            cardDetail.card_id = card.card_id;
            cardDetail.code = card.code;
            cards.push(cardDetail);

            logger.debug('card %s', JSON.stringify(cardDetail));

            callback();
          }
        });
      }, function(err) {
        res.render('wxcard_list', {
          layout : 'layout',
          title : '我的优惠券',
          card_list: cards,
          openid: openid
        });
      });
    });
  });
});
router.get('/consume', function (req, res, next) {
  var openid = req.query.openid;
  var code = req.query.code;
  var card_id = req.query.card_id;

  nodeWeixinAuth.determine(app, function () {
    var authData = nodeWeixinSettings.get(app.id, 'auth');
    //check_consume
    var check_url = 'https://api.weixin.qq.com/card/code/get?access_token=' + authData.accessToken;
    nodeWeixinRequest.json(check_url, {
      code: code,
      card_id: card_id,
      check_consume: true
    }, function(err, json) {
      logger.debug('check_consume %s', JSON.stringify(json));
      if (!err && json.errcode === 0 && json.can_consume) {
        //卡券状态正常
        var consume_url = 'https://api.weixin.qq.com/card/code/consume?access_token=' + authData.accessToken;
        nodeWeixinRequest.json(consume_url, {
          code: code,
          card_id: card_id
        }, function(err, json) {
            logger.debug('consume %s', JSON.stringify(json));
          if (!err && json.errcode === 0) {
            //核销成功
            res.render('wxcard_detail', {
              layout : 'layout',
              title : '使用成功'
            });
          } else {
            //核销失败
            next(json.errmsg);
          }
        });
      } else {
        //卡券状态异常
        next(json.errmsg);
      }
    });

  });

});

module.exports = router;
