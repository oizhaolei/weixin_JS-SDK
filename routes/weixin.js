// 微信消息回调接口

var config = require('../config.json');
var logger = require('log4js').getLogger('routers/weixin.js');
var crypto = require('crypto');
var util = require('util');

var path = require('path');

var express = require('express');
var router = express.Router();

var x2j = require('xml2js');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var on = require('../lib/on');
var wxservice = require('../lib/wxservice');
var map = require('../lib/map');


var app = config.app;

var nwAuth = require('node-weixin-auth');
var nwMessage = require('node-weixin-message');

// Start
router.all('/getSignature', function (req, res, next) {
  var url = req.body.url;
  logger.info('url: %s', url);

  nwAuth.determine(app, function (err, authData) {
    if (err) {
      throw new Error(err);
    }
    var type = 'jsapi';
    nwAuth.ticket.determine(app, authData.accessToken, type, function(err, ticket) {
      if (err) {
        throw new Error(err);
      }
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

router.get('/', function (req, res, next) {
  var signature = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var echostr = req.query.echostr;
  if(nwAuth.check(config.app.token, signature, timestamp, nonce)){
    res.send(echostr);
  }else{
    res.send('invalid request');
  }

});

router.post('/', function(req, res, next) {
  var messages = nwMessage.messages;

  // 监听文本消息
  messages.on.text(function(msg, res) {
    logger.info("textMsg received");
    logger.info(msg);

    var openid = msg.FromUserName;
    var msgid = msg.MsgId;
    var content = msg.Content;

    on.onText(openid, content, msgid);
  });

  // 监听图片消息
  messages.on.image(function(msg, res) {
    logger.info("imageMsg received");
    logger.info(msg);

    var openid = msg.FromUserName;
    var text = i18n.__('translating_pls_wait');
    wxservice.text(openid, text, function(err, data) {
    });

    var msgid = msg.MsgId;
    var mediaid = msg.MediaId;
    var picurl = msg.PicUrl;

    on.onImage(openid, mediaid, picurl, msgid);
  });

  // 监听语音消息
  messages.on.voice(function(msg, res) {
    logger.info("voiceMsg received");
    logger.info(msg);
    var openid = msg.FromUserName;
    var text = i18n.__('translating_pls_wait');
    wxservice.text(openid, text, function(err, data) {
    });

    var msgid = msg.MsgId;
    var mediaid = msg.MediaId;

    nwAuth.determine(app, function (err, authData) {
      var url = util.format('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=%s&media_id=%s', authData.accessToken, mediaid);
      logger.info("voice url: %s", url);
      on.onVoice(openid, mediaid, url, msgid);
    });
  });

  // 监听位置消息
  messages.on.location(function(msg, res) {
    logger.info("locationMsg received");
    logger.info(msg);
  });

  // 监听链接消息
  messages.on.link(function(msg, res) {
    logger.info("linkMsg received");
    logger.info(msg);
  });

  //监听事件消息
  messages.event.on.subscribe(function(msg, res) {
    logger.info("subscribe received");
    logger.info(msg);
    var openid = msg.FromUserName;
    var text = i18n.__('subscribe_success');
    wxservice.text(openid, text, function(err, data) {
    });

    var up_openid = '';
    if (msg.EventKey.indexOf('qrscene_') === 0) {
      up_openid = msg.EventKey.substring(8);
    }

    on.onSubscribe(openid, up_openid, msg.MsgId);
  });
  messages.event.on.unsubscribe(function(msg, res) {
    logger.info("unsubscribe received");
    logger.info(msg);

    var openid = msg.FromUserName;
    on.onUnsubscribe(openid);
  });
  messages.event.on.scan(function(msg, res) {
    logger.info("scan received");
    logger.info(msg);
  });
  messages.event.on.location(function(msg, res) {
    logger.info("location received");
    logger.info(msg);
    var latitude = msg.Latitude;
    var longitude = msg.Longitude;
    
    map.geocoder(latitude, longitude, function(err, result) {
      logger.info(result.address);
    });
  });
  messages.event.on.click(function(msg, res) {
    logger.info("click received");
    logger.info(msg);
    var openid = msg.FromUserName;
    switch (msg.EventKey) {
    case 'usage_translate' :
      var text = i18n.__('usage_translate');
      wxservice.text(openid, text, function(err, data) {
      });
      break;

    case 'share_to_friend' :
      on.onShareToFriend(openid);
      break;

    case 'usage_knock' :
      on.onKnock(openid);
      
      break;
    }
  });
  messages.event.on.view(function(msg, res) {
    logger.info("view received");
    logger.info(msg);
  });
  messages.event.on.templatesendjobfinish(function(msg, res) {
    logger.info("templatesendjobfinish received");
    logger.info(msg);
  });

  // 获取XML内容
  var xml = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    xml += chunk;
  });

  // 内容接收完毕
  req.on('end', function() {
   res.send("success");
   x2j.parseString(xml, {
      explicitArray : false,
      ignoreAttrs : true
    }, function(err, json) {
      logger.info(err, json);
      if (err) {
        throw new Error(err);
      }
      messages.parse(json.xml, res);
    });
  });

});
router.post('/translate_callback', function(req, res, next) {
  var params = req.body;
  logger.debug('params: %s' , JSON.stringify(params));
  res.send("success");

  on.onTranslateCallback(params);
});
module.exports = router;
