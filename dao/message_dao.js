"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('dao/message_dao.js');

var _ = require('lodash');
var mysql = require('mysql');

var MessageDao = function() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);

  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
};

MessageDao.prototype = {
  saveMessage : function(msgid, from_lang, to_lang, filetype, content, openid, callback) {
    var sql = 'insert into  tbl_message (msgid, from_lang, to_lang, filetype, from_content, openid, create_date) values (?,?,?,?,?,?,utc_timestamp(3))';
    var args = [ msgid, from_lang, to_lang, filetype, content, openid ];
    this.mainPool.query(sql, args, function(err, results) {
      if (err) logger.error(err);
      if (!err && results.affectedRows === 0)
        err = 'no data change';

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  updateMessage : function (msgid, data, callback) {
    var sql='',
        args=[];
    _.forEach(data, function(n, key) {
      sql += key + '=?,';
      args.push(data[key]);
    });
    sql = 'update tbl_message set ' + sql.substring(0, sql.length - 1) + ' where msgid = ?;select * from tbl_message where msgid = ?' ;
    args.push(msgid);
    args.push(msgid);

    this.mainPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      if (!err && (results[0].affectedRows === 0 || results[1].length === 0)) err = 'no data change';

      callback(err, results[0], results[1][0]);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  getMessage : function(msgid, callback) {
    var sql = 'select * from tbl_message where msgid = ?;';
    var args = [ msgid ];
    this.readonlyPool.query(sql, args, function(err, results) {
      if (err) {
        callback(err);
      } else if (results && results.length > 0) {
        var message = results[0];
        callback(null, message);
      } else {
        err = 'message not exists.';
        callback(err);
      }
      if (err) logger.error(err);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  findFeeHistory : function (openid, callback) {
    var sql='SELECT * FROM tbl_account where openid = ?;SELECT * FROM tbl_message where openid = ? order by create_date desc limit 50;SELECT * FROM tbl_user_charge where openid = ? order by create_date desc limit 50' ;
    var args=[ openid, openid, openid ];

    this.readonlyPool.query(sql, args, function(err, results){
      if (!results[0] || results[0].length === 0) err = 'no account: ' + openid;
      if (err) logger.error(err);
      callback(err, results[0][0], results[1], results[2]);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }
};

module.exports = new MessageDao();
