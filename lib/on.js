"use strict";
var OUTER_ID_TEST = 0;
var OUTER_ID_SUBSCRIBE = 1;

var config = require('../config.json');
var logger = require('log4js').getLogger('lib/on.js');
var fs = require("fs");

var request = require('request');
var path = require('path');

var redis = require("redis");
var redisClient = redis.createClient(config.redis);

redisClient.on("error", function (err) {
    console.log("Error " + err);
});

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

//T币换算成人民币分
var tp2fen = function(fee) {
  if (!fee) {
    return 0;
  }
  return fee / 2;
};
var randomInt = function(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
};

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');
var wxservice = require('../lib/wxservice');

var from_lang = 'CN';
var to_lang = 'KR';

var app = config.app;


var nwAuth = require('node-weixin-auth');

var nwUser = require('node-weixin-user');
// Start

//随机发送卡券
var randomWxCard = function(app, openid, outerId) {
  if (randomInt(0, 9) === 0) {
    var cardId = config.card.random_pay;
    logger.warn("send random card %s to %s", cardId, openid);
    wxservice.wxcard(openid, cardId, outerId, function(err, data) {
      //
    });
  }
};

//
var On = function() {
};
// 创建用户
On.prototype = {

  onText : function(openid, content, msgid, cb) {
    randomWxCard(app, openid, OUTER_ID_TEST);

    tttalk.saveText(msgid, from_lang, to_lang, content, openid, function(err, results) {
      if (err) {
        logger.error("saveText: %s", err);
        if (cb) cb(err);
      } else {
        tttalk.requestTranslate(msgid, openid, from_lang, to_lang, 'text',content, function(err, results) {
          if (err) {
            logger.error("saveText: %s", err);
            wxservice.text(openid, results, function(err, data) {
              if (cb) cb(err, data);
            });
          } else {
            if (cb) cb(false);

            var key = msgid;
            redisClient.set(key, key);

            //延迟发送客服消息
            setTimeout(function() {
              redisClient.get(key, function(err, reply) {
                if (reply) {
                  // 客服API消息回复
                  wxservice.text(openid, i18n.__('translating_pls_wait'), function(err, data) {
                  });
                  redisClient.del(key);
                }
              });
            }, 4*1000);
          }
        });
      }
    });
  },

  onImage : function(openid, mediaid, picurl, msgid, cb) {
    var filename = mediaid + '.jpg';
    var file = fs.createWriteStream(path.join(config.tmpDirectory,  filename));

    request(picurl).pipe(file);
    file.on('finish', function() {
      tttalk.savePhoto(msgid, from_lang, to_lang, filename, openid, function(err, results) {
        if (err) {
          logger.error("saveText: %s", err);
          if (cb) cb(err);
        } else {
          tttalk.requestTranslate(msgid, openid, from_lang, to_lang, 'photo', filename, function(err, results) {
            if (err) {
              logger.error("savePhoto: %s", err);
              wxservice.text(openid, results, function(err, data) {
              });
            }
            if (cb) cb(false);
          });
        }
      });
    });
  },

  onVoice : function(openid, mediaid, url, msgid, cb) {
    var filename = mediaid + '.amr';
    var file = fs.createWriteStream(path.join(config.tmpDirectory,  filename));

    request(url).pipe(file);
    file.on('finish', function() {
      tttalk.saveVoice(msgid, from_lang, to_lang, filename, openid, function(err, results) {
        if (err) {
          logger.error("saveText: %s", err);
            if (cb) cb(err);
        } else {
          tttalk.requestTranslate(msgid, openid, from_lang, to_lang, 'voice', filename, function(err, results) {
            if (err) {
              logger.info("saveVoice: %s", err);
              wxservice.text(openid, results, function(err, data) {
              });
            }
            if (cb) cb(false);
          });
        }
      });
    });
  },

  onUnsubscribe : function(openid, cb) {
    // 用户取消关注
    account_dao.updateAccount(openid, {
      delete_flag : 1
    }, function(err, results, account) {
      logger.debug('unsubscribe %s', openid);
      if (cb) cb(err);
    });
  },

  onSubscribe : function(openid, up_openid, msgid, cb) {
    account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {

      if (!oldAccount) { //初次关注
        if (up_openid) {
          // 给推荐人奖励
          tttalk.wxPay(up_openid,{
            transaction_id: msgid,
            total_fee: config.subscribe_reward,
            cash_fee: '0',
            fee_type: 'CNY',
            result_code: 'SUCCESS',
            return_code: 'SUCCESS',
            trade_type : 'subscribe',
            memo : openid
          }, function(err, upAccount) {
            if (err) {
              logger.error(err);
            } else {
              wxservice.text(openid, i18n.__('subscribe_share_fee', upAccount.nickname, parseFloat(config.subscribe_reward) / 100, config.share_rules_url), function(err, data) {
              });
            }
          });
        }

        //初次关注发送卡券
        var cardId = config.card.first_pay;
        wxservice.wxcard(openid, cardId, OUTER_ID_SUBSCRIBE, function(err, data) {
        });
      }
      //获取用户信息
      nwUser.profile(app, openid, function (err, data) {
        if (data.errcode > 0) err = data.errcode;
        if(!err) {
          account_dao.updateAccount(data.openid, {
            nickname : data.nickname,
            portrait : data.headimgurl,
            sex : data.sex,
            language : data.language,
            city : data.city,
            province : data.province,
            country : data.country,
            delete_flag : 0
          }, function(err, results, account) {
            //
            if(cb) cb(err, account);
          });
        } else {
          logger.debug('err %s', err);
          logger.debug('data %s', JSON.stringify(data));
          if(cb) cb(data.errcode, data.errmsg);
        }
      });
    });
  },

  onTranslateCallback : function (params, cb) {
    var msgid = params.callback_id;
    var from_content_length = params.from_content_length;
    var to_content = params.to_content;
    var fee = tp2fen(params.fee);
    //取消 delayed job
    redisClient.del(msgid);

    tttalk.translate_callback(msgid, to_content, fee, from_content_length,  function(err, message) {
      if (err) {
        logger.info(err);
      } else {
        // 客服API消息回复
        wxservice.text(message.openid, to_content, function(err, data) {
        });

        console.log('message: %s', JSON.stringify(message));
      }
      if (cb) cb(err, message);
    });

  }
};

module.exports = new On();
