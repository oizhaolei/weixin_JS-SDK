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

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');

var from_lang = 'CN';
var to_lang = 'EN';

var app = {
  id : config.appId,
  secret : config.appSecret,
  token : config.appToken
};

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


    var content = msg.Content;
    tttalk.saveText(from_lang, to_lang, content, msg.FromUserName, function(err, results) {
      var newId = results.insertId;
      tttalk.requestTranslate(newId, msg.FromUserName, from_lang, to_lang, 'text',content, function(err, results) {
        if (err) {
          var text = reply.text(msg.ToUserName, msg.FromUserName, err);
          res.send(text);
        } else {
          res.send("success");

          var key = '' + newId;
          redisClient.set(key, key);

          //延迟发送客服消息
          setTimeout(function() {
            redisClient.get(key, function(err, reply) {
              if (reply) {
                // 客服API消息回复
                service.api.text(app, msg.FromUserName, '正在人工翻译中，请稍等。。。', function(error, data) {
                  if (error) {
                    logger.info("%s, %s", data.errcode, data.errmsg);
                  }
                });
                redisClient.del(key);
              }
            });
          },4*1000);
        }
      });
    });
  });

  // 监听图片消息
  messages.on.image(function(msg) {
    logger.info("imageMsg received");
    logger.info(msg);
    var text = reply.text(msg.ToUserName, msg.FromUserName, '正在人工翻译中，请稍等。。。');
    res.send(text);

    var filename = msg.MediaId + '.jpg';
    var file = fs.createWriteStream(path.join(config.tmpDirectory,  filename));
    var url = msg.PicUrl;

    request(url).pipe(file);
    file.on('finish', function() {
      tttalk.savePhoto(from_lang, to_lang, filename, msg.FromUserName, function(err, results) {
        var newId = results.insertId;
        tttalk.requestTranslate(newId, msg.FromUserName, from_lang, to_lang, 'photo', filename, function(err, results) {
          if (err) {
            logger.info("savePhoto: %s", err);
            var text = reply.text(msg.ToUserName, msg.FromUserName, err);
            res.send(text);
          }
        });
      });
    });
  });

  // 监听语音消息
  messages.on.voice(function(msg) {
    logger.info("voiceMsg received");
    logger.info(msg);
    var text = reply.text(msg.ToUserName, msg.FromUserName, '正在人工翻译中，请稍等。。。');
    res.send(text);

    var filename = msg.MediaId + '.amr';
    var file = fs.createWriteStream(path.join(config.tmpDirectory,  filename));

    nodeWeixinAuth.determine(app, function () {
      var authData = nodeWeixinSettings.get(app.id, 'auth');
      var url = util.format('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=%s&media_id=%s', authData.accessToken, msg.MediaId);
      logger.info("voice url: %s", url);
      request(url).pipe(file);
      file.on('finish', function() {
        tttalk.saveVoice(from_lang, to_lang, filename, msg.FromUserName, function(err, results) {
          var newId = results.insertId;
          tttalk.requestTranslate(newId, msg.FromUserName, from_lang, to_lang, 'voice', filename, function(err, results) {
            if (err) {
              logger.info("saveVoice: %s", err);
              var text = reply.text(msg.ToUserName, msg.FromUserName, err);
              res.send(text);
            }
          });
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
      var text = reply.text(msg.ToUserName, msg.FromUserName, util.format("感谢您关注，您可以直接输入文字、语音、照片进行中韩翻译。\n当前账户余额为%d元", parseFloat(account.balance) / 100));
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
            service.api.text(app, msg.FromUserName, util.format('您的朋友%s得到%d元，推荐关注的积分，具体规则请见%s', upAccount.nickname, parseFloat(config.subscribe_fee) / 100), config.share_rules_url, function(err, data) {
              if (err) logger.error(err);
            });
          }
        });
      }
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
    // 用户取消关注
    account_dao.updateAccount(msg.FromUserName, {
      delete_flag : 1
    }, function(err, results, account) {
      logger.debug('deleteAccount logic');
      res.send("success");
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
      var text = reply.text(msg.ToUserName, msg.FromUserName, '文字翻译说明。。。');
      res.send(text);
      break;
    case 'usage_voice' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, '语音翻译说明。。。');
      res.send(text);
      break;
    case 'usage_photo' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, '图片翻译说明。。。');
      res.send(text);
      break;
    case 'usage_text' :
      var text = reply.text(msg.ToUserName, msg.FromUserName, '文字翻译说明。。。');
      res.send(text);
      break;
    case 'share_to_friend' :
      var nodeWeixinLink = require('node-weixin-link');
      nodeWeixinLink.qrcode.permanent.createString(app, msg.FromUserName, function (err, json) {
        if (err) {
          res.send("success");
        } else {
          var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
          var news = reply.news(msg.ToUserName, msg.FromUserName, [{
            title: 'TTTalk翻译秘书',
            description: '您的贴身翻译管家',
            picUrl: qrCodeUrl,
            url: qrCodeUrl
          }]);
          res.send(news);

          service.api.text(app, msg.FromUserName, util.format('分享上面的二维码给朋友，您可以得到充值%d元，具体规则请见%s', parseFloat(config.subscribe_fee) / 100, config.share_rules_url), function(error, data) {
            if (error) {
              logger.info("%s, %s", data.errcode, data.errmsg);
            }
          });

        }
      });
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

  var id = parseInt(params.callback_id);
  var from_content_length = params.from_content_length;
  var to_content = params.to_content;
  var fee = tp2fen(params.fee);

  //取消 delayed job
  redisClient.del(id);
  logger.debug('params: %s' , JSON.stringify(params));


  tttalk.translate_callback(id, to_content, fee, from_content_length,  function(err, message) {
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
