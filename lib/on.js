"use strict";
var OUTER_ID_TEST = 0;
var OUTER_ID_SUBSCRIBE = 1;

var config = require('../config.json');
var logger = require('log4js').getLogger('lib/on.js');
var fs = require("fs");
var util = require('util');

var request = require('request');
var path = require('path');
var async = require('async');

var redis = require("redis");

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
  return parseInt(fee * config.tp2fen);
};

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');
var wxservice = require('../lib/wxservice');

var from_lang = 'CN';
var to_lang = 'KR';

var app = config.app;

var nwUser = require('node-weixin-user');
// Start
var On = function() {
  this.redisClient = redis.createClient(config.redis);

  this.redisClient.on("error", function (err) {
    logger.error("Error " + err);
  });
};
// 创建用户
On.prototype = {

  onText : function(openid, content, msgid, cb) {
    var self = this;
    tttalk.saveText(msgid, from_lang, to_lang, content, openid, function(err, results) {
      if (err) {
        logger.error("saveText: %s", err);
        if (cb) cb(err);
      } else {
        var key = msgid;
        self.redisClient.set(key, key);

        tttalk.requestTranslate(msgid, openid, from_lang, to_lang, 'text',content, function(err, results) {
          if (err) {
            logger.error("saveText: %s", err);
            wxservice.text(openid, results, function(err, data) {
              if (cb) cb(err, data);
            });
          } else {
            if (cb) cb(false);

            //延迟发送客服消息
            setTimeout(function() {
              self.redisClient.get(key, function(err, reply) {
                if (reply) {
                  // 客服API消息回复
                  wxservice.text(openid, i18n.__('translating_pls_wait'), function(err, data) {
                  });
                  self.redisClient.del(key);
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
    var file = fs.createWriteStream(path.join(config.tmpdir,  filename));

    request(picurl).pipe(file);
    file.on('finish', function() {
      tttalk.savePhoto(msgid, from_lang, to_lang, filename, openid, function(err, results) {
        if (err) {
          logger.error("savePhoto: %s", err);
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
    var file = fs.createWriteStream(path.join(config.tmpdir,  filename));

    request(url).pipe(file);
    file.on('finish', function() {
      tttalk.saveVoice(msgid, from_lang, to_lang, filename, openid, function(err, results) {
        if (err) {
          logger.error("saveVoice: %s", err);
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
    var self = this;
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

        //初次关注发送传播优惠券
        var cardId = config.card.random_pay;
        logger.warn("send follow card %s to %s", cardId, openid);
        wxservice.wxcard(openid, cardId, OUTER_ID_TEST, function(err, data) {

        });

        //初次关注发送优惠券
        var cardId = config.card.first_pay;
        wxservice.wxcard(openid, cardId, OUTER_ID_SUBSCRIBE, function(err, data) {
        });
      }
      //获取用户信息
      self.profile(openid, cb);
    });
  },

  profile : function (openid, cb) {
    nwUser.profile(app, openid, function (err, data) {
      if (data.errcode > 0) err = data.errcode;
      if(err) {
        logger.debug('err %s', err);
        logger.debug('data %s', JSON.stringify(data));
        if(cb) cb(data.errcode, data.errmsg);
      } else {
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
      }
    });

  },

  onTranslateCallback : function (params, cb) {
    var msgid = params.callback_id;
    var from_content_length = params.from_content_length;
    var to_content = params.to_content;
    var fee = tp2fen(params.fee);
    //取消 delayed job
    this.redisClient.del(msgid);

    tttalk.translate_callback(msgid, to_content, fee, from_content_length,  function(err, message) {
      if (err) {
        logger.info(err);
      } else {
        // 客服API消息回复
        if (fee > 0) {
          to_content += "\n -- " + i18n.__('translated_fee', parseFloat(fee) / 100);
        }
        wxservice.text(message.openid, to_content, function(err, data) {
        });

        logger.info('message: %s', JSON.stringify(message));
      }
      if (cb) cb(err, message);
    });

  },

  onShareToFriend : function(openid, cb) {
    async.parallel([
      function(callback){
        // gen qrcode
        var nwLink = require('node-weixin-link');
        nwLink.qrcode.permanent.createString(app, openid, function (err, json) {
          if (err) {
            logger.info(err);
          } else {
            var qr_url = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
            logger.info('qrcode.permanent url: %s', qr_url);
            var qr = path.join(config.tmpdir,  openid + '_qr.jpg');
            var qr_file = fs.createWriteStream(qr);

            request(qr_url).pipe(qr_file);
            qr_file.on('finish', function() {
              callback(null, qr);
            });
          }
        });
      },
      function(callback){
        //portrait
        account_dao.getByOpenid(openid, function(err, account) {
            var portrait = path.join(config.tmpdir,  openid + '_portrait.jpg');
            var portrait_file = fs.createWriteStream(portrait);
            request(account.portrait).pipe(portrait_file);
            portrait_file.on('finish', function() {
              callback(null, portrait);
            });
        });
      }
    ], function(err, results){
      var qr = results[0];
      var portrait = results[1];
      logger.info('qr: %s, portrait: %s', qr, portrait);
      //write a post image
      var output = path.join(config.tmpdir,  openid + '_output.jpg');
      var background = path.join(__dirname, "post_background.jpg");
      var images = require("images");
      images(background)
        .draw(images(portrait).size(48), 270, 54)
        .draw(images(qr).size(220), 50, 360)
        .draw(images(path.join(__dirname, "icon.jpg")).size(48), 136, 446)
        .save(output);
      logger.info('created post: %s', output);

      var nwMedia = require('node-weixin-media');
      nwMedia.permanent.create(app, 'image', output, function (error, json) {
        if (err) {
          logger.info(err);
        } else {
          logger.info('permanent media_id: %s', json.media_id);
          //json.media_id
          //json.url
          wxservice.image(openid, json.media_id, function(err, data) {
            logger.info('service send image');
          });
        }

        if (cb) cb(err);
      });

    });

  },

  onKnock : function(openid) {
    // 用户 签到
    account_dao.checkKnockAccount(openid, function(err, knock) {
      if (err) {
        logger.info(err);
      } else {
        if(knock === null){
          //今天没有签到，签到
          account_dao.insertKnockAccount(openid, function(err, results) {
            if (err) {
              logger.info(err);
            } else {
              var to_content = i18n.__('knock_ok');
              //随机数中奖计算
              var knockRandom = new Number(Math.random() * config.knock_random).toFixed(0);
              logger.info('knock_random: %s', knockRandom);
              if(knockRandom === 1) {
                //给用户奖励
                account_dao.updateAccount(openid, {fee : config.knock_money}, function(err, results, account) {
                  logger.debug('knock_random %s', openid);
                  if(!err) {
                    wxservice.sendtemplate(openid, 'gpSAiTeGUNsjr3Ks0P_DBiLPpcWgu0K9QLozrL_kVqo', 'http://wechat.tttalk.org', {
                      "first": {
                        "value":i18n.__('pay_template_pay_success'),
                        "color":"#173177"
                      },
                      "accountType":{
                        "value":i18n.__('pay_template_account_type'),
                        "color":"#173177"
                      },
                      "account": {
                        "value":i18n.__('pay_template_unit', parseFloat(account.balance) / 100),
                        "color":"#383232"
                      },
                      "amount": {
                        "value":i18n.__('pay_template_unit', parseFloat(config.knock_money) / 100),
                        "color":"#383232"
                      },
                      "result": {
                        "value":i18n.__('pay_template_result'),
                        "color":"#383232"
                      },
                      "remark":{
                        "value":i18n.__('knock_templatet_remark'),
                        "color":"#173177"
                      }
                    }, function(err, data) {
                      if (err) {
                        logger.info(err);
                      }
                    });
                  }
                });
                to_content += "\n\n -- " + i18n.__('knock_pay', parseFloat(config.knock_money) / 100);
              } else {
                to_content += "\n\n -- " + i18n.__('knock_no_pay');
              }

              wxservice.text(openid, to_content, function(err, data) {
              });
            }
          });
        } else {
          //今天已经签过了
          var to_content = i18n.__('knock_done');
          wxservice.text(openid, to_content, function(err, data) {
          });
        }
      }
    });
  }
};

module.exports = new On();
