"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('dao/account_dao.js');
var crypto = require('crypto');

var _ = require('lodash');
var mysql = require('mysql');

var AccountDao = function() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);
  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
};

AccountDao.prototype = {

  getByOpenid : function (openid, callback) {
    var self = this;

    var sql = 'SELECT * FROM ecs_users where openid = ?' ;
    var args = [ openid ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(results && results.length === 1) {
        var account = results[0];
        callback(null, account);
      } else {
        self.createAccount(openid, function(err, oldAccount, results, account) {
          if (!err && account) {
            self.getByOpenid(openid, callback);
          }
        });
      }
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },


  createAccount : function (openid, callback) {
    var user_name = openid;
    var password = crypto.createHash('md5').update(openid).digest('hex');
    var email = '-';
    var sql = 'SELECT * FROM ecs_users where openid = ?;' +
          'insert into  ecs_users (user_name, password, email, openid, reg_time) values (?,?,?,?,unix_timestamp()) ON DUPLICATE KEY UPDATE openid = ?;' +
          'SELECT * FROM ecs_users where openid = ?' ;

    var args = [ openid, user_name, password, email, openid, openid, openid ];
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
    var self = this;

    var sql='',
        args=[];
    _.forEach(data, function(n, key) {
      sql += key + '=?,';
      args.push(data[key]);
    });
    sql = 'update ecs_users set ' + sql.substring(0, sql.length - 1) + ' where openid = ?;SELECT * FROM ecs_users where openid = ?' ;
    args.push(openid);
    args.push(openid);

    this.mainPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      
      if (!err && (results[0].affectedRows === 0 || results[1].length === 0)) {
        self.createAccount(openid, function(err, oldAccount, results, account) {
          if (!err && account) {
            self.updateAccount(openid, data, callback);
          }
        });
      } else {
        callback(err, results[0], results[1][0]);
      }

    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  deleteAccount : function (openid, callback) {
    var sql='delete from ecs_users where openid = ?' ;
    var args=[ openid, openid, openid ];

    this.mainPool.query(sql, args, function(err, results){
      if (err) logger.error(err);
      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  checkKnockAccount : function (openid, callback) {
    var sql = 'SELECT * FROM ecs_weixin_user_knock where openid = ? and create_date = curdate()';

    var args = [ openid ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(err){
        callback(err);
      }
      if(results && results.length === 1) {
        var knock = results[0];
        callback(null, knock);
      } else {
        callback(null, null);
      }
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },
  
  insertKnockAccount :function (openid, callback) {
    var sql = 'insert into  ecs_weixin_user_knock (openid, create_date) values (?,curdate())';

    var args = [ openid];
    this.mainPool.query(sql, args, function(err, results) {
      if (err) logger.error(err);
      if (!err && results.affectedRows === 0)
        err = 'no data change';

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },
  
  insertdApprove :function (openid, pic, type, callback) {
    var sql = 'insert into  ecs_user_approve (openid, pic, type, create_date) values (?,?,?,curdate())';

    var args = [ openid, pic, type];
    this.mainPool.query(sql, args, function(err, results) {
      if (err) logger.error(err);
      if (!err && results.affectedRows === 0)
        err = 'no data change';

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },
  
  getApproveByOpenid : function (openid, type, callback) {
    var sql = 'SELECT * FROM ecs_user_approve where openid = ? and type = ?' ;
    var args = [ openid, type ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(results) {
        callback(null, results);
      }
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },
  
  resetApprove : function (openid, type, callback) {
    var sql = 'delete from ecs_user_approve where openid = ? and type = ?';

    var args = [ openid, type];
    this.mainPool.query(sql, args, function(err, results) {
      if (err) logger.error(err);
      if (!err && results.affectedRows === 0)
        err = 'no data change';

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }

};
module.exports = new AccountDao();
