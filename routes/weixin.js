// 微信消息回调接口
// 80端口
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index');

var express = require('express');
var router = express.Router();

var x2j = require('xml2js');

var tttalk = require('../lib/tttalk');

var nodeWeixinMessage = require('node-weixin-message');
var settings = require('node-weixin-settings');
var auth = require('node-weixin-auth');
var messages = nodeWeixinMessage.messages;
var reply = nodeWeixinMessage.reply;

var app = {
  id : config.appId,
  secret : config.appSecret,
  token : config.appToken
};

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

    switch (msg.Content) {
    case "text":
      // 返回文本消息
      var text = reply.text(msg.ToUserName, msg.FromUserName, '这是文本回复');
      res.send(text);
      break;

    case "music":
      var music = reply.music(msg.ToUserName, msg.FromUserName, '', 'title',
          'desc', 'http://www.musicurl.com',
          'http://www.hightQualitymusicurl.com');
      res.send(music);
      break;

    case "图文":

      var news = reply.news(msg.ToUserName, msg.FromUserName, [ {
        title : "PHP依赖管理工具Composer入门",
        description : "PHP依赖管理工具Composer入门",
        picUrl : "http://weizhifeng.net/images/tech/composer.png",
        url : "http://weizhifeng.net/manage-php-dependency-with-composer.html"
      }, {
        title : "八月西湖",
        description : "八月西湖",
        picUrl : "http://weizhifeng.net/images/poem/bayuexihu.jpg",
        url : "http://weizhifeng.net/bayuexihu.html"
      }, {
        title : "「翻译」Redis协议",
        description : "「翻译」Redis协议",
        picUrl : "http://weizhifeng.net/images/tech/redis.png",
        url : "http://weizhifeng.net/redis-protocol.html"
      } ]);
      res.send(news);

      break;
    default:
      var from_lang = 'CN';
      var to_lang = 'KR';

      var content = msg.Content;
      tttalk.requestTranslate(from_lang, to_lang, content, msg.FromUserName,
          function(err, result) {
            if (err) {
              var text = reply.text(msg.ToUserName, msg.FromUserName, result);
              res.send(text);
            } else {
              var text = reply.text(msg.ToUserName, msg.FromUserName,
                  '正在翻译中，请稍等。。。');
              res.send(text);
            }
          });
    }
  });

  // 监听图片消息
  messages.on.image(function(msg) {
    logger.info("imageMsg received");
    logger.info(msg);
  });

  // 监听语音消息
  messages.on.voice(function(msg) {
    logger.info("voiceMsg received");
    logger.info(msg);
  });

  // 监听位置消息
  messages.on.location(function(msg) {
    logger.info("locationMsg received");
    logger.info(msg);
  });

  // 监听链接消息
  messages.on.link(function(msg) {
    logger.info("linkMsg received");
    logger.info(msg);
  });

  // 监听事件消息
  messages.event.on.subscribe(function(msg) {
    logger.info("subscribe received");
    logger.info(msg);
    tttalk.createAccount(msg.fromUserName, function(err, account) {
      weixin.sendMsg({
        fromUserName : msg.toUserName,
        toUserName : msg.fromUserName,
        msgType : "text",
        content : "感谢您关注，您可以直接输入文字或语音进行中韩翻译。账户余额为"
            + parseFloat(account.balance) / 100 + '元',
        funcFlag : 0
      });
      weixin.sendMsg(resMsg);
    });
  });
  messages.event.on.unsubscribe(function(msg) {
    logger.info("unsubscribe received");
    logger.info(msg);
    tttalk.deleteAccount(msg.fromUserName, function(err, account) {
      logger.debug('deleteAccount');
    });
  });
  messages.event.on.scan(function(msg) {
    logger.info("scan received");
    logger.info(msg);
  });
  messages.event.on.location(function(msg) {
    logger.info("location received");
    logger.info(msg);
  });
  messages.event.on.click(function(msg) {
    logger.info("click received");
    logger.info(msg);
  });
  messages.event.on.view(function(msg) {
    logger.info("view received");
    logger.info(msg);
  });
  messages.event.on.templatesendjobfinish(function(msg) {
    logger.info("templatesendjobfinish received");
    logger.info(msg);
  });

});
router.post('/translate_callback', function(req, res, next) {
  var params = req.body;
  logger.debug(params);
  tttalk.translate_callback(params.callback_id, params.to_content, function(
      err, result) {
    tttalk.send_translate(params.callback_id, function(username, to_content) {
      // 客服API消息回复
      var service = nodeWeixinMessage.service;
      console.log("username:" + username);
      console.log("to_content:" + to_content);
      auth.determine(app, function() {
        service.api.text(app, username, to_content, function(error, data) {
          // data.errcode
          // data.errmsg
        });
      });
    });
  });
});

module.exports = router;
