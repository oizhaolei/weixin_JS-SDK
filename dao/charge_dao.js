"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('dao/charge_dao.js');

var _ = require('lodash');
var mysql = require('mysql');

var ChargeDao = function() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);
  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
};

ChargeDao.prototype = {

  getByTransactionId : function (transaction_id, callback) {
    var sql = 'SELECT * FROM tbl_user_charge where transaction_id = ?' ;
    var args = [ transaction_id ];
    this.readonlyPool.query(sql, args, function(err, results){
      if(err) {
        logger.error(err);
        callback(err);
      } else if(results && results.length == 1) {
        var charge = results[0];
        callback(null, charge);
      } else {
        callback(err, null);
      }
      if (err) logger.error(err);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },
  findByOpenid : function (openid, callback) {
    var sql = 'SELECT * FROM tbl_user_charge where openid = ?' ;
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


  createCharge : function (transaction_id,
                           openid,
                           cash_fee,
                           total_fee,
                           user_balance,
                           out_trade_no,
                           bank_type,
                           fee_type,
                           time_end,
                           trade_type,
                           callback) {
    var sql = 'insert into  tbl_user_charge (transaction_id, openid, cash_fee, total_fee, user_balance, out_trade_no, bank_type, fee_type, time_end, trade_type, create_date) values (?,?,?,?,?,?,?,?,?,?,utc_timestamp(3));SELECT * FROM tbl_user_charge where transaction_id = ?' ;
    var args = [ transaction_id, openid, cash_fee, total_fee, user_balance, out_trade_no, bank_type, fee_type, time_end, trade_type, transaction_id ];
    this.mainPool.query(sql, args, function(err, results){
      if (!err && (results[0].affectedRows === 0 || results[1].length === 0)) err = 'no data change';
      if (err) logger.error(err);

      callback(err, results[0], results[1][0]);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  },

  deleteCharge : function (transaction_id, callback) {
    var sql='delete from tbl_user_charge where transaction_id = ?' ;
    var args=[ transaction_id ];

    this.mainPool.query(sql, args, function(err, results){
      if (!err && results.affectedRows === 0) err = 'no data change';
      callback(err, results);
      if (err) logger.error(err);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }
};
module.exports = new ChargeDao();
