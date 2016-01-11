"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/tttalk.js');

var curl = require('curlrequest');
var path = require('path');

var oss = require('../lib/oss');
var ffmpeg = require('../lib/ffmpeg');

var account_dao = require('../dao/account_dao');
var charge_dao = require('../dao/charge_dao');
var message_dao = require('../dao/message_dao');

//
var Tttalk = function() {
};
// 创建用户
Tttalk.prototype = {
  createAccount : function(openid, up_openid, callback) {
    account_dao.createAccount(openid, up_openid, function(err, oldAccount, results, account) {
      if (err) {
          callback(err);
      } else {
        callback(null, oldAccount, results, account);
      }
    });
  },

  // 用户取消关注
  deleteAccount : function(openid, callback) {
    // ...
    account_dao.updateAccount(openid, {
      delete_flag : 1
    }, function(err, results) {
      if (callback)
        callback(err, results);
    });
  },

  // 用户更改
  updateAccount : function(openid, data, callback) {
    account_dao.updateAccount(openid, data, callback);
  },


  // 翻译
  saveMessage : function (from_lang, to_lang, filetype, content, openid, callback) {
    message_dao.saveMessage(from_lang, to_lang, filetype, content, openid, function(err, results) {
      callback(err, results);
    });
    // ...
    // if (callback) callback(null, 'id');
  },

  requestTranslate : function (callback_id, openid, from_lang, to_lang, filetype, content, callback) {
    account_dao.getByOpenid(openid, function(err, account) {
      if(err || account.balance < config.mini_balance){
        callback('余额不足，请充值');
      } else {
        var translate_config = config.tttalk_translate;
        var data = {
          'app_key' : translate_config.weixin.app_key,
          'app_secret' : translate_config.weixin.app_secret,
          'filetype' : filetype,
          'content' : content,
          'from_lang' : from_lang,
          'to_lang' : to_lang,
          'callback_id' : callback_id
        };
        logger.debug('curl: %s, %s', config.tttalk_translate.api_url, JSON.stringify(data));
        curl.request({
          url : translate_config.api_url,
          method : 'POST',
          data : data
        }, function(err, results) {
          try {
            if (err) {
              logger.debug('requestTranslate  %s', err);
              callback(err);
            } else {
              logger.debug('requestTranslate results %s', results);

              results = JSON.parse(results);
              if (results.success) {
                callback(null, results);
              } else {
                callback(results.msg);
              }
            }
          } catch (e) {
            logger.error(e);
            callback(e);
          }
        });
      }
    });
  },

  // photo
  savePhoto : function(from_lang, to_lang, filename, openid, callback) {
    var sourceFile = path.join(config.tmpDirectory,  filename);
    var dest = 'original/' + filename;
    var destUrl = 'http://file.tttalk.org/' + dest;

    var me = this;
    oss.putObject(sourceFile, dest, 'image/jpeg', 0, function(err, data) {
      me.saveMessage(from_lang, to_lang, 'photo', filename, openid, function(err, newId){
        callback(err, newId);


        //original => thunmnail
      });
    });
  },

  // voice
  saveVoice : function(from_lang, to_lang, filename, openid, callback) {
    var sourceFile = path.join(config.tmpDirectory,  filename);
    var dest = 'voice/' + filename;
    var destUrl = 'http://file.tttalk.org/' + dest;

    var me = this;
    oss.putObject(sourceFile, dest, 'audio/amr', 0, function(err, data) {
      me.saveMessage(from_lang, to_lang, 'voice', filename, openid, function(err, newId){
        callback(err, newId);

        var mp3 = sourceFile + '.mp3';
        var mp3Dest = dest + '.mp3';
        ffmpeg.soundToMP3(sourceFile, mp3, function(err, file) {
          oss.putObject(mp3, mp3Dest, '', 0, function(err, data) {
          });
        });

      });
    });
  },

  // text
  saveText : function(from_lang, to_lang, content, openid, callback) {
      this.saveMessage(from_lang, to_lang, 'text', content, openid, callback);
  },

  // 翻译后的回调
  // params: {"loginid":"3638","user_id":"3638","app_name":"","message_id":"5286107","from_lang":"CN","from_content":"http://test.tttalk.org/test.html","from_content_length":"6","to_lang":"EN","fee":"65.0","auto_translate":"0","translator_id":null,"callback_id":"247","to_content":""}
  translate_callback : function(id, to_content, fee, from_content_length, callback) {
    message_dao.getMessage(id, function(err, message) {
      var openid = message.openid;
      account_dao.updateAccount(message.openid, {
        fee : fee * -1
      }, function(err, results, account) {
          message_dao.updateMessage(id, {
            to_content : to_content,
            from_content_length : from_content_length,
            fee : fee,
            user_balance : account.balance
          }, function(err, results, message) {
            callback(err,  message);
          });
      });
    });
  },


  // { appid: 'wx99b8690b0397ad16',
  //   bank_type: 'CFT',
  //   cash_fee: '1',
  //   fee_type: 'CNY',
  //   is_subscribe: 'Y',
  //   mch_id: '1302550301',
  //   nonce_str: 'PNv5ZdqDSVbFkEcEV7JX27HLewTLRzL8',
  //   openid: 'osQJkw0lp_3QE3_ouApv_rNAQhqc',
  //   out_trade_no: '201503317709548182',
  //   result_code: 'SUCCESS',
  //   return_code: 'SUCCESS',
  //   sign: '312DB6DF805740B6BD32A612740694C1',
  //   time_end: '20160108130216',
  //   total_fee: '1',
  //   trade_type: 'JSAPI',
  //   transaction_id: '1006600349201601082576188135'
  // }
  wxPay : function(openid, wxmessage, callback) {

    if (wxmessage.result_code == 'SUCCESS' && wxmessage.return_code == 'SUCCESS') {
      charge_dao.getByTransactionId(wxmessage.transaction_id, function(err, usercharge) {
        if (usercharge) {
          callback('已经处理过的充值');
        } else {
          account_dao.updateAccount(openid, {
            fee : wxmessage.total_fee
          }, function(err, results, account) {
            charge_dao.createCharge(
              wxmessage.transaction_id,
              openid,
              wxmessage.cash_fee,
              wxmessage.total_fee,
              account.balance,
              wxmessage.out_trade_no,
              wxmessage.bank_type,
              wxmessage.fee_type,
              wxmessage.time_end,
              wxmessage.trade_type,
              function(err, results, userCharge){
                callback(err, account, userCharge);
              });
          });
        }
      });
    } else {
      callback('交易未成功，无法充值。');
    }
  },
  chargeHistory : function(openid, callback) {
    charge_dao.findByOpenid(openid, function(err, results) {
      callback(err, results);
    });
  },
  feeHistory : function(openid, callback) {
    message_dao.findByOpenid(openid, function(err, results) {
      callback(err, results);
    });
  }
};

module.exports = new Tttalk();
