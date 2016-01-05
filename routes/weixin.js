// 微信消息回调接口
// 80端口
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index');

var express = require('express');
var router = express.Router();

var x2j = require('xml2js');

var nodeWeixinMessage = require('node-weixin-message');
var messages = nodeWeixinMessage.messages;
var reply = nodeWeixinMessage.reply;

// 接入验证
router.get('/', function (req, res, next) {
  // 签名成功
  if (checkSignature(req)) {
    res.status(200).send(req.query.echostr);
  } else {
    res.status(200).send('fail');
  }
});

checkSignature = function (req) {
  // 获取校验参数
  var signature = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var echostr = req.query.echostr;

  // 按照字典排序
  var array = [token, timestamp, nonce];
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
  req.on('data', function (chunk) {
    xml += chunk;
  });

  // 内容接收完毕
  req.on('end', function () {
    console.log(xml);
    x2j.parseString(xml, {
      explicitArray: false, ignoreAttrs: true
    }, function (error, json) {
      messages.parse(json.xml);
    });
  });

  // 监听文本消息
  messages.on.text(function(msg) {
    console.log("textMsg received");
    console.log(msg);

    switch (msg.Content) {
    case "text" :
      // 返回文本消息
      var text = reply.text(msg.ToUserName, msg.FromUserName, '这是文本回复');
      console.log('text');
      res.send(text);
      break;

    case "music" :
      var music = reply.music(msg.ToUserName, msg.FromUserName, '', 'title', 'desc', 'http://www.musicurl.com', 'http://www.hightQualitymusicurl.com');
      console.log('music');
      res.send(music);
      break;

    case "图文" :

      var news = reply.news(msg.ToUserName, msg.FromUserName, [{
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
      }]);
      console.log('news');
      res.send(news);

      break;
      default :
      console.log('--');
      res.send('');
    }
    res.end();
  });

  // 监听图片消息
  messages.on.image(function(msg) {
    console.log("imageMsg received");
    console.log(msg);
  });

  // 监听语音消息
  messages.on.voice(function (msg) {
    console.log("voiceMsg received");
    console.log(msg);
  });

  // 监听位置消息
  messages.on.location(function(msg) {
    console.log("locationMsg received");
    console.log(msg);
  });

  // 监听链接消息
  messages.on.link(function(msg) {
    console.log("linkMsg received");
    console.log(msg);
  });

  // 监听事件消息
  messages.event.on.subscribe(function(msg) {
    console.log("subscribe received");
    console.log(msg);
  });
  messages.event.on.unsubscribe(function(msg) {
    console.log("unsubscribe received");
    console.log(msg);
  });
  messages.event.on.scan(function(msg) {
    console.log("scan received");
    console.log(msg);
  });
  messages.event.on.location(function(msg) {
    console.log("location received");
    console.log(msg);
  });
  messages.event.on.click(function(msg) {
    console.log("click received");
    console.log(msg);
  });
  messages.event.on.view(function(msg) {
    console.log("view received");
    console.log(msg);
  });
  messages.event.on.templatesendjobfinish(function(msg) {
    console.log("templatesendjobfinish received");
    console.log(msg);
  });

});

module.exports = router;
