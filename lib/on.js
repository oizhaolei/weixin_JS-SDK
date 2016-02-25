"use strict";
var OUTER_ID_TEST = 0;
var OUTER_ID_SUBSCRIBE = 1;

var config = require('../config.json');
var logger = require('log4js').getLogger('lib/on.js');
var path = require('path');

var redis = require("redis");

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');
var wxservice = require('../lib/wxservice');

var app = config.app;

var nwUser = require('node-weixin-user');
// Start
var On = function() {
  this.redisClient = redis.createClient(config.redis);

  this.redisClient.on("error", function (err) {
    logger.error("Error " + err);
  });
};
// 
On.prototype = {

  onUnsubscribe : function(openid, cb) {
    // 用户取消关注
    account_dao.updateAccount(openid, {
      delete_flag : 1
    }, function(err, results, account) {
      logger.debug('unsubscribe %s', openid);
      if (cb) cb(err);
    });
  },

  onSubscribe : function(openid, up_openid, msgid, cb) {
    var self = this;
    account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {

      //获取用户信息
      self.profile(openid, cb);
    });
  },

  profile : function (openid, cb) {
    nwUser.profile(app, openid, function (err, data) {
      if (data.errcode > 0) err = data.errcode;
      if(err) {
        logger.debug('err %s', err);
        logger.debug('data %s', JSON.stringify(data));
        if(cb) cb(data.errcode, data.errmsg);
      } else {
        account_dao.updateAccount(data.openid, {
          nickname : data.nickname,
          portrait : data.headimgurl,
          sex : data.sex,
          language : data.language,
          city : data.city,
          province : data.province,
          country : data.country,
          delete_flag : 0
        }, function(err, results, account) {
          //
          if(cb) cb(err, account);
        });
      }
    });

  },

  onKnock : function(openid) {

  }
};

module.exports = new On();
