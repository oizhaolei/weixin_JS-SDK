// 微信消息回调接口
// 80端口
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/weixin');
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
                var service = nodeWeixinMessage.service;
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
    tttalk.createAccount(msg.FromUserName, msg.EventKey, function(err, results, account) {
      var text = reply.text(msg.ToUserName, msg.FromUserName, "感谢您关注，您可以直接输入文字、语音、照片进行中韩翻译。\n当前账户余额为" + parseFloat(account.balance) / 100 + '元');
      res.send(text);
      //获取用户信息
      nodeWeixinUser.profile(app, msg.FromUserName, function (err, data) {
        logger.debug('err %s', err);
        logger.debug('data %s', JSON.stringify(data));
        if(!err){
          tttalk.changeAccount(data.openid, data.nickname, data.headimgurl, data.sex, data.language, data.city, data.province, data.country, function(err, results, account) {
              //
          });
        }
      });
    });
  });
  messages.event.on.unsubscribe(function(msg) {
    logger.info("unsubscribe received");
    logger.info(msg);
    tttalk.deleteAccount(msg.FromUserName, function(err, account) {
      logger.debug('deleteAccount');
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
    //    logger.info(msg);
    switch (msg.EventKey) {

    case 'share_to_friend' :
      var nodeWeixinLink = require('node-weixin-link');
      link.qrcode.permanent.createString(app, msg.FromUserName, function (err, json) {
        if (err) {
          res.send("success");
        } else {
          var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
          var news = reply.news(msg.ToUserName, msg.FromUserName, [{
            title: '推荐给朋友',
            description: '得积分',
            picUrl: qrCodeUrl,
            url: qrCodeUrl
          }]);
          res.send(news);
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
      var service = nodeWeixinMessage.service;
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
