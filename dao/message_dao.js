"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('account_dao');

var _ = require('lodash');
var mysql = require('mysql');

function MessageDao() {
  this.mainPool = mysql.createPool(config.mysql.weixin.main);

  this.readonlyPool = mysql.createPool(config.mysql.weixin.readonly);
}

MessageDao.prototype = {
  saveMessage : function (from_lang, to_lang, content, username, callback) {
    var sql = 'insert into  tbl_message (from_lang, to_lang, from_content, username, create_date) values (?,?,?,?,utc_timestamp(3))' ;
    var args = [ from_lang, to_lang, content, username ];
    this.mainPool.query(sql, args, function(err, results){
      if (!err && results.affectedRows === 0) err = 'no data change';
      if (err)     logger.error(err);

      callback(err, results);
    });
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  }
};

exports = module.exports = MessageDao;
