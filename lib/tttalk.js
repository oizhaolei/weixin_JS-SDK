"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('tttalk.js');

var curl = require('curlrequest');

var account_dao = require('../dao/account_dao');
var message_dao = require('../dao/message_dao');

//
var Tttalk = function () {
  this.accountDao = new account_dao();
  this.messageDao = new message_dao();
};

// 创建用户
Tttalk.prototype.createAccount = function (username, callback) {
  // ...
  var accountDao = this.accountDao;
  accountDao.createAccount(username, function(err, results) {
    accountDao.getByUsername(username, function(err, account) {
      if (err) {
        if (callback) callback(err);
      } else {
        if (callback) callback(null, account);
      }
    });
  });
};

// 用户取消关注
Tttalk.prototype.deleteAccount = function (username, callback) {
  // ...
  this.accountDao.changeAccount(username, {
    delete_flag : 1
  }, function(err, results) {
    if (callback) callback(err, results);
  });
};

// 翻译
Tttalk.prototype.requestTranslate = function (from_lang, to_lang, content, username, callback) {
  this.messsageDao.saveMessage(from_lang, to_lang, content, username, function(err, id) {
    var translate_config = config.tttalk_translate;
    var data = {
      'app_key': translate_config.weixin.app_key,
      'app_secret': translate_config.weixin.app_secret,
      'content': content,
      'from_lang': from_lang,
      'to_lang': to_lang,
      'callback_id': id
    };

    var options = {
      url : translate_config.api_url,
      method : 'POST',
      data : data
    };

    curl.request(options, function(err, result){
      try {
        if (err){
          logger.debug('requestTranslate failed %s', config.tttalk_translate.api_url);
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
  if (callback) callback(null, 'id');
};

Tttalk.prototype.translate_callback = function(auto_translate, from_content, from_lang, to_content, to_lang, callback_id, callback) {
  logger.debug('translate_callback: (%s) "%s"(%s)->"%s"(%s) %s', auto_translate, from_content, from_lang, to_content, to_lang, callback_id);
  // if (auto_translate == '0' || auto_translate == '2'){
  //   var sql = "select * from tbl_message where id = ? ";
  //   var args = [callback_id];
  //   this.messageDao.query(sql, args, function(err, result){
  //     if (result && result.length > 0){
  //       var data = result[0];
  //       var to_user_id = data.userid;
  //       var to_content = to_content;
  //       var from_content = data.content;

  //       var key = CACHE_KEY_TRANSLATES + callback_id;
  //       cacheClient.delete(key, function(err, data) {
  //       });

  //       sql = "insert into tbl_user_story_translate (user_photo_id, lang, user_id, to_content, create_date) values (?, ?, ?, ?, utc_timestamp(3)) ";
  //       args = [callback_id, to_lang, user_id, to_content];
  //       logger.debug('sql:%s, %s', sql, JSON.stringify(args));

  //       var query = pool.query(sql, args, function(err, result) {
  //         if (!err){
  //           var newId = result.insertId;
  //           var translator_id = user_id;
  //           findTranslateByPK(to_user_id, newId, function(err, translate) {
  //             logger.debug('---->findTranslate:%s', JSON.stringify(translate));
  //             if (translate) {
  //               pushNewTranslate(translate, to_user_id, translate.lang);
  //             } else {
  //               logger.error('%s', err);
  //             }
  //           });
  //         }
  //         result = {'success':1, 'msg':'success'};
  //         res.status(200).send(result);
  //       });
  //     }
  //   });
  // }else{
  //   logger.debug('TTTalk callback:   ignore auto translate');
  //   var result = {'success':1, 'msg':'success'};
  //   res.status(200).send(result);
  // }
};

module.exports = new Tttalk();
