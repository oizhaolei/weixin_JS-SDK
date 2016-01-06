"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('tttalk.js');

var curl = require('curlrequest');

var account_dao = require('../dao/account_dao');
var message_dao = require('../dao/message_dao');

//
var Tttalk = function() {
};

// 创建用户
Tttalk.prototype.createAccount = function(username, callback) {
  // ...
  account_dao.createAccount(username, function(err, results) {
    account_dao.getByUsername(username, function(err, account) {
      if (err) {
        if (callback)
          callback(err);
      } else {
        if (callback)
          callback(null, account);
      }
    });
  });
};

// 用户取消关注
Tttalk.prototype.deleteAccount = function(username, callback) {
  // ...
  account_dao.updateAccount(username, {
    delete_flag : 1
  }, function(err, results) {
    if (callback)
      callback(err, results);
  });
};

// 翻译
Tttalk.prototype.requestTranslate = function(from_lang, to_lang, content, username, callback) {
  message_dao.saveMessage(from_lang, to_lang, content, username, function(err, results) {
    var translate_config = config.tttalk_translate;
    var new_message_id = results.insertId;
    var data = {
      'app_key' : translate_config.weixin.app_key,
      'app_secret' : translate_config.weixin.app_secret,
      'content' : content,
      'from_lang' : from_lang,
      'to_lang' : to_lang,
      'callback_id' : new_message_id
    };
    logger.debug('requestTranslate api_url %s', config.tttalk_translate.api_url);
    curl.request({
      url : translate_config.api_url,
      method : 'POST',
      data : data
    }, function(err, results) {
      try {
        if (err) {
          logger.debug('requestTranslate failed %s', config.tttalk_translate.api_url);
          callback(err);
        } else {
          logger.debug('requestTranslate results %s', results);

          results = JSON.parse(results);
          if (results.success) {
            logger.debug('requestTranslate success %s', results.message_id);
            callback(null, new_message_id);
          } else {
            logger.debug('requestTranslate failed %s', results.msg);
            callback(results.msg);
          }
        }
      } catch (e) {
        logger.error(e);
        callback(e);
      }
    });
  });
  // ...
  // if (callback) callback(null, 'id');
};

Tttalk.prototype.translate_callback = function(id, to_content, fee, callback) {
  message_dao.getMessage(id, function(err, message) {
    var username = message.username;
    account_dao.updateAccount(message.username, {
      fee : fee
    }, function(err, results) {
      account_dao.getByUsername(username, function(err, account) {
        message_dao.updateMessage(id, {
          to_content : to_content,
          fee : fee,
          balance : account.balance
        }, function(err, results) {
          message_dao.getMessage(id, function(err, message) {
            callback(err, message);
          });
        });
      });
    });
  });
};

module.exports = new Tttalk();
