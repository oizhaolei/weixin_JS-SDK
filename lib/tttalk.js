"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('tttalk.js');

var curl = require('curlrequest');

var account_dao = require('../dao/account_dao');
var message_dao = require('../dao/message_dao');

//
var Tttalk = function() {
  this.accountDao = new account_dao();
  this.messageDao = new message_dao();
};

// 创建用户
Tttalk.prototype.createAccount = function(username, callback) {
  // ...
  var accountDao = this.accountDao;
  accountDao.createAccount(username, function(err, results) {
    accountDao.getByUsername(username, function(err, account) {
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
  this.accountDao.changeAccount(username, {
    delete_flag : 1
  }, function(err, results) {
    if (callback)
      callback(err, results);
  });
};

// 翻译
Tttalk.prototype.requestTranslate = function(from_lang, to_lang, content,
    username, callback) {
  this.messageDao.saveMessage(from_lang, to_lang, content, username, function(
      err, result) {
    var translate_config = config.tttalk_translate;
    var data = {
      'app_key' : translate_config.weixin.app_key,
      'app_secret' : translate_config.weixin.app_secret,
      'content' : content,
      'from_lang' : from_lang,
      'to_lang' : to_lang,
      'callback_id' : result.insertId
    };

    var options = {
      url : translate_config.api_url,
      method : 'POST',
      data : data
    };
    logger
        .debug('requestTranslate api_url %s', config.tttalk_translate.api_url);
    curl.request(options, function(err, result) {
      try {
        if (err) {
          logger.debug('requestTranslate failed %s',
              config.tttalk_translate.api_url);
        } else {
          logger.debug('requestTranslate result %s', result);

          result = JSON.parse(result);
          if (result.success) {
            logger.debug('requestTranslate success %s', result.message_id);
          } else {
            logger.debug('requestTranslate failed %s', result.msg);
          }
        }
      } catch (e) {
        logger.error(e);
      }
      callback();
    });
  });
  // ...
  // if (callback) callback(null, 'id');
};

Tttalk.prototype.translate_callback = function(id, to_content, callback) {
  this.messageDao.translateMessage(to_content, id, function(err, result) {
    callback(err, result);
  });
};

Tttalk.prototype.send_translate = function(id, callback) {
  this.messageDao.getMessage(id, function(err, result) {
    callback(result.username, result.to_content);
  });
};

module.exports = new Tttalk();
