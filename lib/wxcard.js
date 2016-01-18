// 微信卡券
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/wxcard.js');

var path = require('path');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var app = config.app;

var nwAuth = require('node-weixin-auth');
var nwRequest = require('node-weixin-request');

var tttalk = require('../lib/tttalk');
//
var WxCard = function() {
};
// 创建用户
WxCard.prototype = {
  list : function(openid, card_id, callback) {
    nwAuth.determine(app, function (err, authData) {

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
    nwAuth.determine(app, function (err, authData) {
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

  //check_consume
  _check_consume : function(card_id, code, callback) {
    nwAuth.determine(app, function (err, authData) {
        // 调用核销code接口之前调用查询code接口
        var check_url = 'https://api.weixin.qq.com/card/code/get?access_token=' + authData.accessToken;
        nwRequest.json(check_url, {
          code: code,
          card_id: card_id,
          check_consume: true
        }, function(err, json) {
          logger.debug('check_consume %s', JSON.stringify(json));
          if (!err && json.errcode === 0 && json.can_consume) {
            callback(false, json);
          } else {
            //卡券状态异常
            callback(true, json);
          }
      });
    });
  },

  consume : function(card_id, code, reduce_cost, callback) {
    var self = this;
    nwAuth.determine(app, function (err, authData) {

        //check_consume
        self._check_consume(card_id, code, function(err, json) {
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
                tttalk._charge(openid, 0, reduce_cost, code, card_id, '', 'wxcard', '', '', card_id, function(err, account, charge) {
                  if (err) {
                    callback(err);
                  } else {
                    callback(false, account, charge);
                  }
                });
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
