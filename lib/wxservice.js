// 微信优惠券
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/wxservice.js');

var redis = require("redis");
var redisClient = redis.createClient(config.redis);

var EVENT_WEIXIN_API_RESULT = 'weixin_api_result';
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();
event.on(EVENT_WEIXIN_API_RESULT, function(errcode, errmsg, var1, var2) {
  logger.info("%s, %s, %s, %s", errcode, errmsg, var1, var2);
  switch (errcode) {
  case 40001 :
    // TODO
    break;
  default :
    //
  }
});

var nwMessage = require('node-weixin-message');
//
var WxService = function(app) {
  this.app = app;
  this.service = nwMessage.service;
  this.template = nwMessage.template;

};
// 创建用户
WxService.prototype = {
  text : function( openid, msg, callback) {
    var self = this;
    logger.info("text: %s, %s", openid, msg);
    var key = "send_text_" + openid;
    redisClient.get(key, function(err, value) {
      if(!err && (value == openid)){
        logger.info("return SendTextUser:" + openid);
      } else {
        redisClient.set(key, openid);
        logger.info("set SendTextUser:" + openid);
        setTimeout(function() {
          redisClient.del(key);
          logger.info("del SendTextUser:" + openid);
        }, 5 * 1000);
        
        self.service.api.text(self.app, openid, msg, function(err, data) {
          event.emit(EVENT_WEIXIN_API_RESULT, data.errcode, data.errmsg);
          callback(err, data);
        });
      }
    });
  },
  wxcard : function(openid, cardId, outerId, callback) {
    logger.info("wxcard: %s, %s, %s", openid, cardId, outerId);
    this.service.api.wxcard(this.app, openid, cardId, outerId, function(err, data) {
      event.emit(EVENT_WEIXIN_API_RESULT, data.errcode, data.errmsg);
      callback(err, data);
    });
  },
  sendtemplate : function(openid, templateId, url, data, callback) {
    logger.info("sendtemplate: %s, %s, %s, %s", openid, templateId, url, data);
    this.template.send(this.app, openid, templateId, url, data, function(err, data) {
      event.emit(EVENT_WEIXIN_API_RESULT, data.errcode, data.errmsg);
      callback(err, data);
    });
  },
};

module.exports = new WxService(config.app);
