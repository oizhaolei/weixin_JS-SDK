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
    // 用户 签到
    account_dao.checkKnockAccount(openid, function(err, knock) {
      if (err) {
        logger.info(err);
      } else {
        if(knock == null){
          //今天没有签到，签到
          account_dao.insertKnockAccount(openid, function(err, results) {
            if (err) {
              logger.info(err);
            } else {
              var to_content = i18n.__('knock_ok');
              //随机数中奖计算
              var knockRandom = new Number(Math.random() * config.knock_random).toFixed(0);
              logger.info('knock_random: %s', knockRandom);
              if(knockRandom == 1){
                //给用户奖励
                account_dao.updateAccount(openid, {fee : config.knock_money}, function(err, results, account) {
                  logger.debug('knock_random %s', openid);
                  if(!err){
                    wxservice.sendtemplate(openid, 'gpSAiTeGUNsjr3Ks0P_DBiLPpcWgu0K9QLozrL_kVqo', 'http://wechat.tttalk.org', {
                      "first": {
                        "value":i18n.__('knock_template_pay_success'),
                        "color":"#173177"
                      },
                      "accountType":{
                        "value":i18n.__('knock_template_account_type'),
                        "color":"#173177"
                      },
                      "account": {
                        "value":i18n.__('knock_template_unit', parseFloat(account.balance) / 100),
                        "color":"#383232"
                      },
                      "amount": {
                        "value":i18n.__('knock_template_unit', parseFloat(config.knock_money) / 100),
                        "color":"#383232"
                      },
                      "result": {
                        "value":i18n.__('knock_template_result'),
                        "color":"#383232"
                      },
                      "remark":{
                        "value":i18n.__('knock_template_remark'),
                        "color":"#173177"
                      }
                    }, function(err, data) {
                      if (err) {
                        logger.info(err);
                      }
                    });
                  }
                });
                to_content += "\n\n -- " + i18n.__('knock_pay', parseFloat(config.knock_money) / 100);
              } else {
                to_content += "\n\n -- " + i18n.__('knock_no_pay');
              } 
              
              wxservice.text(openid, to_content, function(err, data) {
              });
            }
          });
        } else {
          //今天已经签过了
          var to_content = i18n.__('knock_done');
          wxservice.text(openid, to_content, function(err, data) {
          });
        }
      }
    });
  }
};

module.exports = new On();
