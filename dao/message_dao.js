"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('message_dao');

var _ = require('lodash');
var mysql = require('mysql');

var MessageDao = function() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);

  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
};

MessageDao.prototype = {
  saveMessage : function(from_lang, to_lang, filetype, content, openid, callback) {
    var sql = 'insert into  tbl_message (from_lang, to_lang, filetype, from_content, openid, create_date) values (?,?,?,?,?,utc_timestamp(3))';
    var args = [ from_lang, to_lang, filetype, content, openid ];
    this.mainPool.query(sql, args, function(err, results) {
      if (!err && results.affectedRows === 0)
        err = 'no data change';
      if (err) logger.error(err);

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  updateMessage : function (id, data, callback) {
    var sql='',
        args=[];
    _.forEach(data, function(n, key) {
      sql += key + '=?,';
      args.push(data[key]);
    });
    sql = 'update tbl_message set ' + sql.substring(0, sql.length - 1) + ' where id = ?;select * from tbl_message where id = ?' ;
    args.push(id);
    args.push(id);

    this.mainPool.query(sql, args, function(err, results){
      if (!err && (results[0].affectedRows === 0 || results[1].length === 0)) err = 'no data change';
      if (err) logger.error(err);

      callback(err, results[0], results[1][0]);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  findByOpenid : function (openid, callback) {
    var sql = 'SELECT * FROM tbl_message where openid = ? order by id desc limit 100' ;
    var args = [ openid ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(err) {
        logger.error(err);
        callback(err);
      } else if(results && results.length > 0) {
        callback(null, results);
      } else {
        err = 'no data.';
        callback(err);
      }
      if (err) logger.error(err);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  getMessage : function(id, callback) {
    var sql = 'select * from tbl_message where id = ?;';
    var args = [ id ];
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
  }
};

module.exports = new MessageDao();
