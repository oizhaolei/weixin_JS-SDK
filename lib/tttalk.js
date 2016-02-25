"use strict";
var config = require('../config.json');
var logger = require('log4js').getLogger('lib/tttalk.js');

var path = require('path');
var async = require('async');
var _ = require('lodash');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var account_dao = require('../dao/account_dao');

//
var Tttalk = function() {
};
// 创建用户
Tttalk.prototype = {

  wxPay : function(openid, wxmessage, callback) {
      callback('交易未成功，无法充值。');
  }
};

module.exports = new Tttalk();
