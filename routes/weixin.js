// 微信消息回调接口
// 80端口
var OUTER_ID_TEST = 0;
var OUTER_ID_SUBSCRIBE = 1;

var config = require('../config.json');
var logger = require('log4js').getLogger('routers/weixin.js');
var util = require('util');
var fs = require("fs");
var crypto = require('crypto');

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
var nwMessage = require('node-weixin-message');
var messages = nwMessage.messages;
var reply = nwMessage.reply;

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

router.post('/getSignature', function (req, res, next) {
  var url = req.body.url;
  logger.info(url);

  nwAuth.determine(app, function (err, authData) {
    var type = 'jsapi';
    nwAuth.ticket.determine(app, authData.accessToken, type, function(err, ticket) {
      var timestamp = String((new Date().getTime() / 1000).toFixed(0));
      var sha1 = crypto.createHash('sha1');
      sha1.update(timestamp);
      var noncestr = sha1.digest('hex');
      var str = 'jsapi_ticket=' + ticket.ticket + '&noncestr='+ noncestr+'&timestamp=' + timestamp + '&url=' + url;
      logger.info(str);
      var signature = crypto.createHash('sha1').update(str).digest('hex');

      res.json({
        appId: config.app.id,
        timestamp: timestamp,
        nonceStr: noncestr,
        signature: signature
      });
    });
  });
});

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

    randomWxCard(app, msg.FromUserName, OUTER_ID_TEST);

    var msgid = msg.MsgId;
    var content = msg.Content;
    tttalk.saveText(msgid, from_lang, to_lang, content, msg.FromUserName, function(err, results) {
      if (err) {
        logger.error("saveText: %s", err);
      } else {
        tttalk.requestTranslate(msgid, msg.FromUserName, from_lang, to_lang, 'text',content, function(err, results) {
          if (err) {
            logger.error("saveText: %s", err);
            wxservice.text(msg.FromUserName, results, function(err, data) {
            });
          } else {
            var key = msgid;
            redisClient.set(key, key);

            //延迟发送客服消息
            setTimeout(function() {
              redisClient.get(key, function(err, reply) {
                if (reply) {
                  // 客服API消息回复
                  wxservice.text(msg.FromUserName, i18n.__('translating_pls_wait'), function(err, data) {
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
          logger.error("saveText: %s", err);
        } else {
          tttalk.requestTranslate(msgid, msg.FromUserName, from_lang, to_lang, 'photo', filename, function(err, results) {
            if (err) {
              logger.error("savePhoto: %s", err);
              wxservice.text(msg.FromUserName, results, function(err, data) {
              });
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

    nwAuth.determine(app, function (err, authData) {

      var url = util.format('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=%s&media_id=%s', authData.accessToken, msg.MediaId);
      logger.info("voice url: %s", url);
      request(url).pipe(file);
      file.on('finish', function() {
        tttalk.saveVoice(msgid, from_lang, to_lang, filename, msg.FromUserName, function(err, results) {
          if (err) {
            logger.error("saveText: %s", err);
          } else {
            tttalk.requestTranslate(msgid, msg.FromUserName, from_lang, to_lang, 'voice', filename, function(err, results) {
              if (err) {
                logger.info("saveVoice: %s", err);
                wxservice.text(msg.FromUserName, results, function(err, data) {
                });
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

      if (!oldAccount) { //初次关注
        if (up_openid) {
          // 给推荐人奖励
          tttalk.wxPay(up_openid,{
            transaction_id: msg.MsgId,
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
              wxservice.text(msg.FromUserName, i18n.__('subscribe_share_fee', upAccount.nickname, parseFloat(config.subscribe_reward) / 100, config.share_rules_url), function(err, data) {
              });
            }
          });
        }

        //初次关注发送卡券
        var cardId = config.card.first_pay;
        wxservice.wxcard(msg.FromUserName, cardId, OUTER_ID_SUBSCRIBE, function(err, data) {
        });
      }
      //获取用户信息
      nwUser.profile(app, msg.FromUserName, function (err, data) {
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
      logger.debug('unsubscribe %s', msg.FromUserName);
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
    case 'usage_translate' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, i18n.__('usage_translate'));
      res.send(text);
      break;
    default :
      res.send("success");
    }
  });
  messages.event.on.view(function(msg) {
    logger.info("view received");
    logger.info(msg);
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
      wxservice.text(message.openid, to_content, function(err, data) {
      });

      console.log('message: %s', JSON.stringify(message));
    }
  });
});
module.exports = router;
