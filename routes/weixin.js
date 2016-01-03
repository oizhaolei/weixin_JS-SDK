// 微信消息回调接口
// 80端口
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index');

var express = require('express');
var router = express.Router();

var weixin = require('weixin-api');

var tttalk = require('../lib/tttalk');

// config
weixin.token = config.appToken;

// 监听文本消息
weixin.textMsg(function(msg) {
  console.log("textMsg received");
  console.log(msg);

  var resMsg = {};

  switch (msg.content) {
  case "text" :
    // 返回文本消息
    resMsg = {
      fromUserName : msg.toUserName,
      toUserName : msg.fromUserName,
      msgType : "text",
      content : "这是文本回复",
      funcFlag : 0
    };
    break;

  case "音乐" :
    // 返回音乐消息
    resMsg = {
      fromUserName : msg.toUserName,
      toUserName : msg.fromUserName,
      msgType : "music",
      title : "音乐标题",
      description : "音乐描述",
      musicUrl : "音乐url",
      HQMusicUrl : "高质量音乐url",
      funcFlag : 0
    };
    break;

  case "图文" :

    var articles = [];
    articles[0] = {
      title : "PHP依赖管理工具Composer入门",
      description : "PHP依赖管理工具Composer入门",
      picUrl : "http://weizhifeng.net/images/tech/composer.png",
      url : "http://weizhifeng.net/manage-php-dependency-with-composer.html"
    };

    articles[1] = {
      title : "八月西湖",
      description : "八月西湖",
      picUrl : "http://weizhifeng.net/images/poem/bayuexihu.jpg",
      url : "http://weizhifeng.net/bayuexihu.html"
    };

    articles[2] = {
      title : "「翻译」Redis协议",
      description : "「翻译」Redis协议",
      picUrl : "http://weizhifeng.net/images/tech/redis.png",
      url : "http://weizhifeng.net/redis-protocol.html"
    };

    // 返回图文消息
    resMsg = {
      fromUserName : msg.toUserName,
      toUserName : msg.fromUserName,
      msgType : "news",
      articles : articles,
      funcFlag : 0
    };
    break;
  default :
    var from_lang = 'CN';
    var to_lang = 'KR';

    var content = msg.content;
    tttalk.translate(content);
    resMsg = {
      msgType : "empty"
    };
  }

  console.log(resMsg);
  weixin.sendMsg(resMsg);
});

// 监听图片消息
weixin.imageMsg(function(msg) {
  console.log("imageMsg received");
  console.log(msg);
  weixin.sendEmptyMsg();
});

// 监听语音消息
weixin.voiceMsg(function (msg) {
  console.log("voiceMsg received");
  console.log(msg);
  weixin.sendEmptyMsg();
});

// 监听位置消息
weixin.locationMsg(function(msg) {
  console.log("locationMsg received");
  console.log(msg);
  weixin.sendEmptyMsg();
});

// 监听链接消息
weixin.urlMsg(function(msg) {
  console.log("urlMsg received");
  console.log(msg);
  weixin.sendEmptyMsg();
});

// 监听事件消息
weixin.eventMsg(function(msg) {
  console.log("eventMsg received");
  console.log(msg);

  var resMsg = {};

  switch (msg.event) {
  case "subscribe" :
    // 返回文本消息
    resMsg = {
      fromUserName : msg.toUserName,
      toUserName : msg.fromUserName,
      msgType : "text",
      content : "感谢您关注，您可以直接输入文字或语音进行中韩翻译。",
      funcFlag : 0
    };
    tttalk.createAccount(msg.toUserName, function(err, account) {
      weixin.sendMsg( {
        fromUserName : msg.toUserName,
        toUserName : msg.fromUserName,
        msgType : "text",
        content : "账户余额为" + user.balance + "T币",
        funcFlag : 0
      });
    });
    break;
  case "unsubscribe" :
    // 返回文本消息
    resMsg = {
      fromUserName : msg.toUserName,
      toUserName : msg.fromUserName,
      msgType : "text",
      content : "再见",
      funcFlag : 0
    };
    break;
  case "VIEW" :
  case "CLICK" :
  case "SCAN" :
  case "LOCATION" :
    // 返回文本消息
    resMsg = {
      fromUserName : msg.toUserName,
      toUserName : msg.fromUserName,
      msgType : "text",
      content : msg.event,
      funcFlag : 0
    };
    break;
  case "VIEW" :
    resMsg = {
      msgType : "empty"
    };
  }

  console.log(resMsg);
  weixin.sendMsg(resMsg);
});

// 接入验证
router.get('/', function (req, res, next) {
  // 签名成功
  if (weixin.checkSignature(req)) {
    res.status(200).send(req.query.echostr);
  } else {
    res.status(200).send('fail');
  }
});

// Start
router.post('/', function(req, res, next) {
  // loop
  weixin.loop(req, res);

});

module.exports = router;
