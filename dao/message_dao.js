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
      if(results && results.length === 1) {
        var message = results[0];
        callback(null, message);
      } else {
        callback(err);
      }
      if (err) logger.error(err);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  findMessages : function (where, callback) {
    if (!callback) {
      callback = where;
      where = null;
    }
    var sql='',
        args=[];
    _.forEach(where, function(n, key) {
      sql += ' ' + key + '=? and ';
      args.push(where[key]);
    });
    sql='SELECT * FROM tbl_message where '  + sql.substring(0, sql.length - 4) + ' order by create_date desc limit 50' ;

    this.readonlyPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  deleteMessage : function (msgid, callback) {
    var sql='delete from tbl_message where msgid = ?' ;
    var args=[ msgid ];

    this.mainPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }
};

module.exports = new MessageDao();
