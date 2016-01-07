// 微信消息回调接口
// 80端口
var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index');
var util = require('util');

var express = require('express');
var router = express.Router();

var x2j = require('xml2js');

var tttalk = require('../lib/tttalk');

var timerknock = {};
var app = {
  id : config.appId,
  secret : config.appSecret,
  token : config.appToken
};

var nodeWeixinSettings = require('node-weixin-settings');
nodeWeixinSettings.registerSet(function(id, key, value) {
  if (!app[id]) {
    app[id] = {};
  }
  app[id][key] = value;
});
nodeWeixinSettings.registerGet(function(id, key) {
  if (app[id] && app[id][key]) {
    var value = app[id][key];
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

    var from_lang = 'CN';
    var to_lang = 'KR';

    var content = msg.Content;
    tttalk.requestTranslate(from_lang, to_lang, content, msg.FromUserName, function(err, newId) {
      if (err) {
        var text = reply.text(msg.ToUserName, msg.FromUserName, err);
        res.send(text);
      } else {
        res.send("success");

        timerknock[newId] = setTimeout(function() {
          // 客服API消息回复
          var service = nodeWeixinMessage.service;
          service.api.text(app, msg.FromUserName, '正在人工翻译中，请稍等。。。', function(error, data) {
            if (error) {
              logger.info("%s, %s", data.errcode, data.errmsg);
            }
          });
          delete timerknock[newId];
        },4*1000);
      }
    });
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
    tttalk.createAccount(msg.FromUserName, function(err, account) {
      weixin.sendMsg({
        fromUserName : msg.ToUserName,
        toUserName : msg.FromUserName,
        msgType : "text",
        content : "感谢您关注，您可以直接输入文字、语音、照片进行中韩翻译。\n当前账户余额为" + parseFloat(account.balance) / 100 + '元',
        funcFlag : 0
      });
      weixin.sendMsg(resMsg);
    });
  });
  messages.event.on.unsubscribe(function(msg) {
    logger.info("unsubscribe received");
    logger.info(msg);
    tttalk.deleteAccount(msg.FromUserName, function(err, account) {
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
//    logger.info(msg);

  });
  messages.event.on.view(function(msg) {
    logger.info("view received");
//    logger.info(msg);
  });
  messages.event.on.templatesendjobfinish(function(msg) {
    logger.info("templatesendjobfinish received");
    logger.info(msg);
  });

});
router.post('/translate_callback', function(req, res, next) {
  var params = req.body;
  logger.debug(params);

  var id = parseInt(params.callback_id);
  var from_content_length = params.from_content_length;
  var to_content = params.to_content;
  var fee = tp2fen(params.fee);

  //stop delayed job
  clearTimeout(timerknock[id]);
  delete timerknock[id];

  // 客服API消息回复
  var service = nodeWeixinMessage.service;
  console.log(message);
  service.api.text(app, message.username, to_content, function(error, data) {
    // data.errcode
    // data.errmsg
  });

  tttalk.translate_callback(id, to_content, fee, from_content_length,  function(err, message) {
    if (err) {
      logger.info(err);
    } else {
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
