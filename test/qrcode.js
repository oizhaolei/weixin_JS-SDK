#!/usr/bin/env node
'use strict';

var config = require('../config.json');

var util = require('util');
var logger = require('log4js').getLogger('test/node-weixin.js');
var request = require('request');
var path = require('path');
var fs = require("fs");

//Init app
var app = config.app;

require('../lib/wxsettings');
var nwLink = require('node-weixin-link');

console.log('注意：代理店二维码为数字，必须是999的格式，才能生成正确的二维码');

var genQrcode = function(param, destdir) {

  nwLink.qrcode.permanent.createString(app, param, function (err, json) {
    if (err) {
      logger.info(err);
    } else {
      var qr_url = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
      logger.info('qrcode.permanent url: %s', qr_url);
      var qr = path.join(destdir,  param + '_qr.jpg');
      var qr_file = fs.createWriteStream(qr);

      request(qr_url).pipe(qr_file);
      qr_file.on('finish', function() {
        console.log('saved to: ' + qr);
      });
    }
  });

};


// node test/qrcode.js  10 /tmp/
var param, destdir;
process.argv.forEach(function (val, index, array) {
  //console.log(index + ': ' + val);
  switch (index) {
  case 2:
    param = val;
    break;
  case 3:
    destdir = val;
    break;
  }

  if (param && destdir) {
    genQrcode(param, destdir);
  }
});
