// 微信消息回调接口

var config = require('../config.json');
var logger = require('log4js').getLogger('routers/weixin.js');
var crypto = require('crypto');
var util = require('util');

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
var on = require('../lib/on');

var app = config.app;

var nwAuth = require('node-weixin-auth');
var nwMessage = require('node-weixin-message');
var messages = nwMessage.messages;
var reply = nwMessage.reply;

// Start

router.post('/getSignature', function (req, res, next) {
  var url = req.body.url;
  logger.info(url);

  nwAuth.determine(app, function (err, authData) {
    var type = 'jsapi';
    nwAuth.ticket.determine(app, authData.accessToken, type, function(err, ticket) {
      var timestamp = String((new Date().getTime() / 1000).toFixed(0));
      var noncestr = crypto.createHash('sha1').update(timestamp).digest('hex');
      var str = 'jsapi_ticket=' + ticket.ticket + '&noncestr='+ noncestr+'&timestamp=' + timestamp + '&url=' + url;
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

    var openid = msg.FromUserName;
    var msgid = msg.MsgId;
    var content = msg.Content;

    on.onText(openid, content, msgid);
  });

  // 监听图片消息
  messages.on.image(function(msg) {
    logger.info("imageMsg received");
    logger.info(msg);

    var openid = msg.FromUserName;
    var text = reply.text(msg.ToUserName, openid, i18n.__('translating_pls_wait'));
    res.send(text);

    var msgid = msg.MsgId;
    var mediaid = msg.MediaId;
    var picurl = msg.PicUrl;

    on.onImage(openid, mediaid, picurl, msgid);
  });

  // 监听语音消息
  messages.on.voice(function(msg) {
    logger.info("voiceMsg received");
    logger.info(msg);
    var openid = msg.FromUserName;
    var text = reply.text(msg.ToUserName, openid, i18n.__('translating_pls_wait'));
    res.send(text);

    var msgid = msg.MsgId;
    var mediaid = msg.MediaId;

    nwAuth.determine(app, function (err, authData) {
      var url = util.format('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=%s&media_id=%s', authData.accessToken, mediaid);
      logger.info("voice url: %s", url);
      on.onVoice(openid, mediaid, url, msgid);
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
    var text = reply.text(msg.ToUserName, openid, i18n.__('subscribe_success'));
    res.send(text);

    var up_openid = '';
    if (msg.EventKey.indexOf('qrscene_') === 0) {
      up_openid = msg.EventKey.substring(8);
    }

    on.onSubscribe(openid, up_openid, msg.MsgId);
  });
  messages.event.on.unsubscribe(function(msg) {
    logger.info("unsubscribe received");
    logger.info(msg);
    res.send("success");

    var openid = msg.FromUserName;
    on.onUnsubscribe(openid);
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
  logger.debug('params: %s' , JSON.stringify(params));
  res.send("success");

  on.onTranslateCallback(params);
});
module.exports = router;
