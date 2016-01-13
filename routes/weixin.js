// 微信消息回调接口
// 80端口
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/weixin.js');
var util = require('util');
var fs = require("fs");

var request = require('request');
var path = require('path');

var redis = require("redis");
var redisClient = redis.createClient(config.redis);

redisClient.on("error", function (err) {
    console.log("Error " + err);
});

var express = require('express');
var router = express.Router();

var x2j = require('xml2js');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});


var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');

var from_lang = 'CN';
var to_lang = 'EN';

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
nodeWeixinAuth.determine(app, function () {
});
var nodeWeixinMessage = require('node-weixin-message');
var messages = nodeWeixinMessage.messages;
var reply = nodeWeixinMessage.reply;
var service = nodeWeixinMessage.service;

var nodeWeixinUser = require('node-weixin-user');
// Start
router.post('/', function(req, res, next) {
  // 获取XML内容
  var xml = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    xml += chunk;
  });

  // 内容接收完毕
  req.on('end', function() {
    x2j.parseString(xml, {
      explicitArray : false,
      ignoreAttrs : true
    }, function(error, json) {
      messages.parse(json.xml);
    });
  });

  // 监听文本消息
  messages.on.text(function(msg) {
    logger.info("textMsg received");
    logger.info(msg);
    res.send("success");

    var msgid = msg.MsgId;
    var content = msg.Content;
    tttalk.saveText(msgid, from_lang, to_lang, content, msg.FromUserName, function(err, results) {
      if (err) {
        logger.err("saveText: %s", err);
      } else {
        tttalk.requestTranslate(msgid, msg.FromUserName, from_lang, to_lang, 'text',content, function(err, results) {
          if (err) {
            logger.err("requestTranslate: %s", err);
          } else {
            var key = msgid;
            redisClient.set(key, key);

            //延迟发送客服消息
            setTimeout(function() {
              redisClient.get(key, function(err, reply) {
                if (reply) {
                  // 客服API消息回复
                  service.api.text(app, msg.FromUserName, i18n.__('translating_pls_wait'), function(error, data) {
                    if (error) {
                      logger.info("%s, %s", data.errcode, data.errmsg);
                    }
                  });
                  redisClient.del(key);
                }
              });
            }, 4*1000);
          }
        });
      }
    });
  });

  // 监听图片消息
  messages.on.image(function(msg) {
    logger.info("imageMsg received");
    logger.info(msg);
    var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('translating_pls_wait'));
    res.send(text);

    var msgid = msg.MsgId;
    var filename = msg.MediaId + '.jpg';
    var file = fs.createWriteStream(path.join(config.tmpDirectory,  filename));
    var url = msg.PicUrl;

    request(url).pipe(file);
    file.on('finish', function() {
      tttalk.savePhoto(msgid, from_lang, to_lang, filename, msg.FromUserName, function(err, results) {
        if (err) {
          logger.err("saveText: %s", err);
        } else {
          tttalk.requestTranslate(msgid, msg.FromUserName, from_lang, to_lang, 'photo', filename, function(err, results) {
            if (err) {
              logger.err("savePhoto: %s", err);
            }
          });
        }
      });
    });
  });

  // 监听语音消息
  messages.on.voice(function(msg) {
    logger.info("voiceMsg received");
    logger.info(msg);
    var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('translating_pls_wait'));
    res.send(text);

    var msgid = msg.MsgId;
    var filename = msg.MediaId + '.amr';
    var file = fs.createWriteStream(path.join(config.tmpDirectory,  filename));

    nodeWeixinAuth.determine(app, function () {
      var authData = nodeWeixinSettings.get(app.id, 'auth');
      var url = util.format('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=%s&media_id=%s', authData.accessToken, msg.MediaId);
      logger.info("voice url: %s", url);
      request(url).pipe(file);
      file.on('finish', function() {
        tttalk.saveVoice(msgid, from_lang, to_lang, filename, msg.FromUserName, function(err, results) {
          if (err) {
            logger.err("saveText: %s", err);
          } else {
            tttalk.requestTranslate(msgid, msg.FromUserName, from_lang, to_lang, 'voice', filename, function(err, results) {
              if (err) {
                logger.info("saveVoice: %s", err);
              }
            });
          }
        });
      });
    });
  });

  // 监听位置消息
  messages.on.location(function(msg) {
    logger.info("locationMsg received");
    logger.info(msg);
    res.send("success");
  });

  // 监听链接消息
  messages.on.link(function(msg) {
    logger.info("linkMsg received");
    logger.info(msg);
    res.send("success");
  });

//监听事件消息
  messages.event.on.subscribe(function(msg) {
    logger.info("subscribe received");
    logger.info(msg);

    var openid = msg.FromUserName;
    var up_openid = '';
    if (msg.EventKey.indexOf('qrscene_') === 0) {
      up_openid = msg.EventKey.substring(8);
    }
    account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {
      var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('subscribe_success', parseFloat(account.balance) / 100));
      res.send(text);

      if (!oldAccount && up_openid) {
        // 给推荐人奖励
        tttalk.wxPay(up_openid,{
          transaction_id: msg.MsgId,
          total_fee: config.subscribe_fee,
          cash_fee: '0',
          fee_type: 'CNY',
          result_code: 'SUCCESS',
          return_code: 'SUCCESS',
          memo : 'subscribe'
        }, function(err, upAccount) {
          if (err) {
            logger.error(err);
          } else {
            service.api.text(app, msg.FromUserName, i18n.__('subscribe_share_fee', upAccount.nickname, parseFloat(config.subscribe_fee) / 100, config.share_rules_url), function(err, data) {
              if (err) logger.error(err);
            });
          }
        });
      }
      //发送卡券
      var cardId = config.cardId;
      service.api.wxcard(app, msg.FromUserName, cardId, function(err, data) {
        if (err) logger.error(err);
      });
      //获取用户信息
      nodeWeixinUser.profile(app, msg.FromUserName, function (err, data) {
        logger.debug('err %s', err);
        logger.debug('data %s', JSON.stringify(data));
        if(!err){
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
          });
        }
      });
    });
  });
  messages.event.on.unsubscribe(function(msg) {
    logger.info("unsubscribe received");
    logger.info(msg);
    res.send("success");
    // 用户取消关注
    account_dao.updateAccount(msg.FromUserName, {
      delete_flag : 1
    }, function(err, results, account) {
      logger.debug('deleteAccount logic');
    });
  });
  messages.event.on.scan(function(msg) {
    logger.info("scan received");
    logger.info(msg);
    res.send("success");
  });
  messages.event.on.location(function(msg) {
    logger.info("location received");
    logger.info(msg);
    res.send("success");
  });
  messages.event.on.click(function(msg) {
    logger.info("click received");
    logger.info(msg);
    switch (msg.EventKey) {
    case 'usage_text' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('usage_text'));
      res.send(text);
      break;
    case 'usage_voice' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('usage_voice'));
      res.send(text);
      break;
    case 'usage_photo' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('usage_photo'));
      res.send(text);
      break;
    default :
      res.send("success");
    }
  });
  messages.event.on.view(function(msg) {
    logger.info("view received");
//    logger.info(msg);
    res.send("success");
  });
  messages.event.on.templatesendjobfinish(function(msg) {
    logger.info("templatesendjobfinish received");
    logger.info(msg);
    res.send("success");
  });

});
router.post('/translate_callback', function(req, res, next) {
  var params = req.body;

  var msgid = params.callback_id;
  var from_content_length = params.from_content_length;
  var to_content = params.to_content;
  var fee = tp2fen(params.fee);

  //取消 delayed job
  redisClient.del(msgid);
  logger.debug('params: %s' , JSON.stringify(params));

  tttalk.translate_callback(msgid, to_content, fee, from_content_length,  function(err, message) {
    if (err) {
      logger.info(err);
    } else {
      // 客服API消息回复
      service.api.text(app, message.openid, to_content, function(error, data) {
        if (error) logger.info(error);
        // data.errcode
        // data.errmsg
      });

      console.log('message: %s', JSON.stringify(message));
      // var content = util.format( fee + '分\n您的余额： ' + parseFloat(message.user_balance) / 100 + '元');
      // service.api.text(app, message.openid, content, function(error, data) {
      //   // data.errcode
      //   // data.errmsg
      // });
    }
  });
});

//T币换算成人民币分
function tp2fen(fee) {
  return fee / 2;
}
module.exports = router;
