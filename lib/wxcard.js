// 微信卡券
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/wxcard.js');

var path = require('path');
var async = require('async');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var app = config.app;

var nodeWeixinSettings = require('node-weixin-settings');

var nodeWeixinAuth = require('node-weixin-auth');
var nodeWeixinRequest = require('node-weixin-request');

//
var WxCard = function() {
};
// 创建用户
WxCard.prototype = {
  list : function(openid, card_id, done) {
    nodeWeixinAuth.determine(app, function () {
      var authData = nodeWeixinSettings.get(app.id, 'auth');

      var url = 'https://api.weixin.qq.com/card/user/getcardlist?access_token=' + authData.accessToken;
      nodeWeixinRequest.json(url, {
        openid: openid,
        card_id: card_id
      }, function(err, json) {
        logger.debug('wxcard list %s %s', err, JSON.stringify(json));
        var cards = [];
        async.each(json.card_list, function(card, callback) {
          url = 'https://api.weixin.qq.com/card/get?access_token=' + authData.accessToken;
          nodeWeixinRequest.json(url, {
            card_id: card.card_id
          }, function(err, json) {
            logger.debug('wxcard list %s %s', err, JSON.stringify(json));
            if (!err && json.errcode === 0) {
              //

              var cardDetail = json.card;
              cardDetail.card_id = card.card_id;
              cardDetail.code = card.code;
              cards.push(cardDetail);

              logger.debug('card %s', JSON.stringify(cardDetail));

              callback();
            }
          });
        }, function(err) {
          done(err, cards);
        });
      });
    });
  },

  consume : function(card_id, code, callback) {
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
              callback(err, json);
            } else {
              //核销失败
              callback(json.errmsg);
            }
          });
        } else {
          //卡券状态异常
          callback(json.errmsg);
        }
      });

    });
  }
};

module.exports = new WxCard();
