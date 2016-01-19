"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('dao/account_dao.js');

var _ = require('lodash');
var mysql = require('mysql');

var AccountDao = function() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);
  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
};

AccountDao.prototype = {

  getByOpenid : function (openid, callback) {

    var sql = 'SELECT * FROM tbl_account where openid = ?' ;
    var args = [ openid ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(err) {
        callback(err);
      } else if(results && results.length === 1) {
        var account = results[0];
        callback(null, account);
      } else {
        err = 'user not exists.';
        callback(err);
      }
      if (err) logger.error(err);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },


  createAccount : function (openid, up_penid, callback) {
    var sql = 'SELECT * FROM tbl_account where openid = ?;' +
          'insert into  tbl_account (openid, up_openid, delete_flag, create_date) values (?,?,?,utc_timestamp(3)) ON DUPLICATE KEY UPDATE delete_flag = ?;' +
          'SELECT * FROM tbl_account where openid = ?' ;

    var args = [ openid, openid, up_penid, 0, 0, openid ];
    this.mainPool.query(sql, args, function(err, results){

      if (err) logger.error(err);
      if (!err && (results[1].affectedRows === 0 || results[2].length === 0)) err = 'no data change';

      var oldAccount = results[0].length > 0 ? results[0][0] : null;
      var newAccount = results[2].length > 0 ? results[2][0] : null;
      callback(err, oldAccount, results[1], newAccount);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  updateAccount : function (openid, data, callback) {
    var sql='',
        args=[];
    _.forEach(data, function(n, key) {
      if ('password' === key) {
        sql += key + '=password(?),';
      } else if ('fee' === key) {
        sql += 'balance=balance+?,';
      } else {
        sql += key + '=?,';
      }
      args.push(data[key]);
    });
    sql = 'update tbl_account set ' + sql.substring(0, sql.length - 1) + ' where openid = ?;SELECT * FROM tbl_account where openid = ?' ;
    args.push(openid);
    args.push(openid);

    this.mainPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      if (!err && (results[0].affectedRows === 0 || results[1].length === 0)) err = 'no data change';

      callback(err, results[0], results[1][0]);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  deleteAccount : function (openid, callback) {
    var sql='delete from tbl_account where openid = ?;delete from tbl_message where openid=?;delete from tbl_user_charge where openid=?' ;
    var args=[ openid, openid, openid ];

    this.mainPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      callback(err, results[0]);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }
};
module.exports = new AccountDao();
