"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/tttalk.js');

var curl = require('curlrequest');
var path = require('path');
var async = require('async');
var _ = require('lodash');

var oss = require('../lib/oss');
var ffmpeg = require('../lib/ffmpeg');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var account_dao = require('../dao/account_dao');
var charge_dao = require('../dao/charge_dao');
var message_dao = require('../dao/message_dao');

//
var Tttalk = function() {
};
// 创建用户
Tttalk.prototype = {
  requestTranslate : function (callback_id, openid, from_lang, to_lang, filetype, content, callback) {
    account_dao.getByOpenid(openid, function(err, account) {
      if(err || account.balance < config.mini_balance){
        callback(true, i18n.__('balance_too_low', parseFloat(account.balance) / 100));
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
  savePhoto : function(msgid, from_lang, to_lang, filename, openid, callback) {
    var sourceFile = path.join(config.tmpdir,  filename);
    var dest = 'original/' + filename;

    oss.putObject(sourceFile, dest, 'image/jpeg', function(err, data) {
      if (err) {
          callback(err, data);
      } else {
        message_dao.saveMessage(msgid, from_lang, to_lang, 'photo', filename, openid, function(err, newId){
          callback(err, newId);

          //original => thunmnail
        });
      }
    });
  },

  // voice
  saveVoice : function(msgid, from_lang, to_lang, filename, openid, callback) {
    var sourceFile = path.join(config.tmpdir,  filename);
    var dest = 'voice/' + filename;

    oss.putObject(sourceFile, dest, 'audio/amr', function(err, data) {
      if (err) {
          callback(err, data);
      } else {
        message_dao.saveMessage(msgid, from_lang, to_lang, 'voice', filename, openid, function(err, newId){
          callback(err, newId);

          var mp3 = sourceFile + '.mp3';
          var mp3Dest = dest + '.mp3';
          ffmpeg.soundToMP3(sourceFile, mp3, function(err, file) {
            oss.putObject(mp3, mp3Dest, '', function(err, data) {
            });
          });

        });
      }
    });
  },

  // text
  saveText : function(msgid, from_lang, to_lang, content, openid, callback) {
      message_dao.saveMessage(msgid, from_lang, to_lang, 'text', content, openid, callback);
  },

  // 翻译后的回调
  // params: {"loginid":"3638","user_id":"3638","app_name":"","message_id":"5286107","from_lang":"CN","from_content":"http://test.tttalk.org/test.html","from_content_length":"6","to_lang":"EN","fee":"65.0","auto_translate":"0","translator_id":null,"callback_id":"247","to_content":""}
  translate_callback : function(msgid, to_content, fee, from_content_length, callback) {
    message_dao.getMessage(msgid, function(err, message) {
      account_dao.updateAccount(message.openid, {
        fee : fee * -1
      }, function(err, results, account) {
          message_dao.updateMessage(msgid, {
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
  _charge : function(openid, cash_fee, total_fee, transaction_id, out_trade_no, bank_type, fee_type, time_end, trade_type, memo, callback) {
    account_dao.updateAccount(openid, {
      fee : total_fee
    }, function(err, results, account) {
      charge_dao.createCharge(
        transaction_id,
        openid,
        cash_fee,
        total_fee,
        account.balance,
        out_trade_no,
        bank_type,
        fee_type,
        time_end,
        trade_type,
        memo,
        function(err, results, charge){
          callback(err, account, charge);
        });
    });
  },
  wxPay : function(openid, wxmessage, callback) {
    var self = this;
    if (wxmessage.result_code === 'SUCCESS' && wxmessage.return_code === 'SUCCESS') {
      charge_dao.getByTransactionId(wxmessage.transaction_id, function(err, charge) {
        if (charge) {
          callback('已经处理过的充值');
        } else {
          self._charge(openid, wxmessage.cash_fee, wxmessage.total_fee, wxmessage.transaction_id, wxmessage.out_trade_no, wxmessage.bank_type, wxmessage.fee_type, wxmessage.time_end, wxmessage.trade_type, wxmessage.memo, callback);
        }
      });
    } else {
      callback('交易未成功，无法充值。');
    }
  },
  fee_history : function(openid, done) {
    async.parallel([
      function(callback){
        account_dao.getByOpenid(openid, function(err, account) {
          callback(err, account);
        });
      },
      function(callback){
        message_dao.findMessages({
          openid : openid
        }, function(err, messages) {
          _.forEach(messages, function(n, message) {
            if(message.filetype === 'photo') {
              message.from_content = '图片翻译';
            } else if(message.filetype === 'voice') {
              message.from_content = '语音翻译';
            }
          });

          callback(err, messages);
        });
      },
      function(callback){
        charge_dao.findCharges({
          openid : openid
        }, function(err, charges) {
          callback(err, charges);
        });
      }
    ], function(err, results){
      done(err, results[0], results[1], results[2]);
    });
  }
};

module.exports = new Tttalk();
