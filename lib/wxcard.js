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

var nwSettings = require('node-weixin-settings');
var nwAuth = require('node-weixin-auth');
var nwRequest = require('node-weixin-request');

var tttalk = require('../lib/tttalk');
//
var WxCard = function() {
};
// 创建用户
WxCard.prototype = {
  list : function(openid, card_id, callback) {
    nwAuth.determine(app, function () {
      var authData = nwSettings.get(app.id, 'auth');

      var url = 'https://api.weixin.qq.com/card/user/getcardlist?access_token=' + authData.accessToken;
      nwRequest.json(url, {
        openid: openid,
        card_id: card_id
      }, function(err, json) {
        logger.debug('wxcard list %s %s', err, JSON.stringify(json));
        callback(err, json.card_list);
      });
    });
  },
  detail : function(card_id, code, callback) {
    nwAuth.determine(app, function () {
      var authData = nwSettings.get(app.id, 'auth');

      var url = 'https://api.weixin.qq.com/card/get?access_token=' + authData.accessToken;
      nwRequest.json(url, {
        card_id: card_id
      }, function(err, json) {
        logger.debug('wxcard %s %s', err, JSON.stringify(json));
        if (!err && json.errcode === 0) {
          //
          var detail = json.card;
          detail.card_id = card_id;
          detail.code = code;

          callback(false, detail);
        } else {
          callback(true, json);
        }
      });
    });
  },

  consume : function(card, callback) {
    nwAuth.determine(app, function () {
      var authData = nwSettings.get(app.id, 'auth');
      //check_consume
      var card_id = card.card_id;
      var code = card.code;

      // 调用核销code接口之前调用查询code接口
      var check_url = 'https://api.weixin.qq.com/card/code/get?access_token=' + authData.accessToken;
      nwRequest.json(check_url, {
        code: code,
        card_id: card_id,
        check_consume: true
      }, function(err, json) {
        logger.debug('check_consume %s', JSON.stringify(json));
        if (!err && json.errcode === 0 && json.can_consume) {
          //卡券状态正常
          var consume_url = 'https://api.weixin.qq.com/card/code/consume?access_token=' + authData.accessToken;
          nwRequest.json(consume_url, {
            code: code,
            card_id: card_id
          }, function(err, json) {
            logger.debug('consume %s', JSON.stringify(json));
            if (!err && json.errcode === 0) {
              //核销成功
              var openid = json.openid;
              var fee = card.reduce_cost;
              tttalk._charge(openid, 0, fee, code, card_id, '', 'wxcard', '', '', card_id, function(err, account, charge) {
                if (err) {
                  callback(err);
                } else {
                  callback(false, account, charge);
                }
              });

              callback(err, json);
            } else {
              //核销失败
              callback(true, json.errmsg);
            }
          });
        } else {
          //卡券状态异常
          callback(true, json);
        }
      });
    });
  }
};

module.exports = new WxCard();
