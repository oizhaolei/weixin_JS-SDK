// 微信卡券
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/wxcard.js');


var EVENT_WEIXIN_API_ERROR = 'weixin_api_error';
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();
event.on(EVENT_WEIXIN_API_ERROR, function(errcode, errmsg) {
  logger.info("%s, %s", errcode, errmsg);
  switch (errcode) {
  case 40001 :

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
};
// 创建用户
WxService.prototype = {
  text : function( openid, msg, callback) {
    this.service.api.text(this.app, openid, msg, function(err, data) {
      event.emit(EVENT_WEIXIN_API_ERROR, data.errcode, data.errmsg);
      callback(err, data);
    });
  },
  wxcard : function(openid, cardId, outerId, callback) {
    this.service.api.wxcard(this.app, openid, cardId, outerId, function(err, data) {
      event.emit(EVENT_WEIXIN_API_ERROR, data.errcode, data.errmsg);
      callback(err, data);
    });
  },
};

module.exports = new WxService(config.app);
