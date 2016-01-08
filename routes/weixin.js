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

// 接入验证
router.get('/', function(req, res, next) {
  // 签名成功
  if (checkSignature(req)) {
    res.status(200).send(req.query.echostr);
  } else {
    res.status(200).send('fail');
  }
});

checkSignature = function(req) {
  // 获取校验参数
  var signature = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var echostr = req.query.echostr;

  // 按照字典排序
  var array = [ token, timestamp, nonce ];
  array.sort();

  // 连接
  var str = sha1(array.join(""));

  // 对比签名
  if (str == signature) {
    return true;
  } else {
    return false;
  }
};
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
    tttalk.requestTranslateText(from_lang, to_lang, content, msg.FromUserName, function(err, newId) {
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

  // 监听图片消息
  messages.on.image(function(msg) {
    logger.info("imageMsg received");
    logger.info(msg);
    var text = reply.text(msg.ToUserName, msg.FromUserName, '正在人工翻译中，请稍等。。。');
    res.send(text);

    var filename = msg.PicUrl;

    tttalk.requestTranslatePhoto(from_lang, to_lang, filename, msg.FromUserName, function(err, newId) {
      if (err) {
        logger.info("requestTranslatePhoto: %s", err);
        var text = reply.text(msg.ToUserName, msg.FromUserName, err);
        res.send(text);
      }
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
      request(url).pipe(file);
      file.on('finish', function() {
        tttalk.requestTranslateVoice(from_lang, to_lang, filename, msg.FromUserName, function(err, newId) {
          if (err) {
            logger.info("requestTranslateVoice: %s", err);
            var text = reply.text(msg.ToUserName, msg.FromUserName, err);
            res.send(text);
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

  // 监听事件消息
  messages.event.on.subscribe(function(msg) {
    logger.info("subscribe received");
    logger.info(msg);

    tttalk.createAccount(msg.FromUserName, function(err, account) {
      var text = reply.text(msg.ToUserName, msg.FromUserName, "感谢您关注，您可以直接输入文字、语音、照片进行中韩翻译。\n当前账户余额为" + parseFloat(account.balance) / 100 + '元');
      res.send(text);
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
    res.send("success");

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
      service.api.text(app, message.username, to_content, function(error, data) {
        if (error) logger.info(error);
        // data.errcode
        // data.errmsg
      });

      console.log('message: %s', JSON.stringify(message));
      // var content = util.format( fee + '分\n您的余额： ' + parseFloat(message.user_balance) / 100 + '元');
      // service.api.text(app, message.username, content, function(error, data) {
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
