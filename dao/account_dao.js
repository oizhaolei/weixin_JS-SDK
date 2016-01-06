"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('account_dao');

var _ = require('lodash');
var mysql = require('mysql');

var AccountDao = function() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);
  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
};

AccountDao.prototype = {

  getByUsername : function (username, callback) {
    var sql = 'SELECT * FROM tbl_account where username = ?' ;
    var args = [ username ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(err) {
        callback(err);
      } else if(results && results.length == 1) {
        var account = results[0];
        callback(null, account);
      } else {
        err = 'user not exists.';
        callback(err);
      }
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },


  createAccount : function (username, callback) {
    var sql = 'insert into  tbl_account (username, fullname, portrait, delete_flag, create_date) values (?,?,?,?,utc_timestamp(3))' ;
    var args = [ username, username, '', 0 ];
    this.mainPool.query(sql, args, function(err, results){
      if (!err && results.affectedRows === 0) err = 'no data change';
      if (err)     logger.error(err);

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  updateAccount : function (username, data, callback) {
    var sql='',
        args=[];
    _.forEach(data, function(n, key) {
      if ('password' == key) {
        sql += key + '=password(?),';
      } else if ('fee' == key) {
        sql += 'balance=balance-?,';
      } else {
        sql += key + '=?,';
      }
      args.push(data[key]);
    });
    sql = 'update tbl_account set ' + sql.substring(0, sql.length - 1) + ' where username = ?' ;
    args.push(username);

    this.mainPool.query(sql, args, function(err, results){
      if (!err && results.affectedRows === 0) err = 'no data change';
      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  deleteAccount : function (username, callback) {
    var sql='delete from tbl_account where username = ?' ;
    var args=[ username ];

    this.mainPool.query(sql, args, function(err, results){
      if (!err && results.affectedRows === 0) err = 'no data change';
      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }
};
module.exports = new AccountDao();
