var assert = require('assert');
var config = require('../config.json');

var util = require('util');
var logger = require('log4js').getLogger('test/weixin.js');
var request = require('request');
var path = require('path');
var fs = require("fs");
var crypto = require('crypto');

var async = require('async');

//Init app
var app = config.app;

var nwc = require('node-weixin-config');
var nodeWeixinAuth = require("node-weixin-auth");
var nodeWeixinSettings = require('node-weixin-settings');
nodeWeixinSettings.registerSet(function(id, key, value) {
  logger.warn('registerSet %s %s %s', id, key, JSON.stringify(value));
  if (!app[id]) {
    app[id] = {};
  }
  app[id][key] = value;
});
nodeWeixinSettings.registerGet(function(id, key) {
  if (app[id] && app[id][key]) {
    var value = app[id][key];
    logger.debug('registerGet %s %s: %s', id, key, JSON.stringify(value));
    return value;
  }
  return null;
});


nwc.app.init(app);

//JSSDK Init
var jssdk = {
  pay: 'http://oauth.domain.com/weixin/pay'
};
nwc.urls.jssdk.init(jssdk);


describe('weixin auth', function () {
  it('tokenize', function (done) {
    nodeWeixinAuth.tokenize(app, function (error, json) {
      var accessToken = json.access_token;
      logger.debug('token %s', accessToken);
      assert(accessToken);

      done();
    });
  });
  it('determine', function (done) {
    nodeWeixinAuth.determine(app, function (error) {
      var authData = nodeWeixinSettings.get(app.id, 'auth');
      assert(authData.accessToken);
      var token = authData.accessToken;

      var type = 'wx_card';
      nodeWeixinAuth.ticket.determine(app, token, type, function (error) {
        logger.debug(error);

        var ticket = nodeWeixinSettings.get(app.id, type);
        logger.debug('ticket %s', ticket.ticket);
        assert(ticket.ticket);

        done();
      });
    });
  });
});
describe('weixin oauth', function () {
  var nodeWeixinOauth = require('node-weixin-oauth');

  //Init Oauth
  var oauth = {
    //用户首次访问的URL地址
    access: 'http://oauth.domain.com/weixin/access',
    //用户通过验证后的返回地址
    redirect: 'http://oauth.domain.com/weixin/redirect',
    //成功获取用户openid后的地址
    success: 'http://pay.domain.com/successAndReadyToPay'
  };
  nwc.urls.oauth.init(oauth);


  // it('profile', function (done) {
  //   nodeWeixinAuth.tokenize(app, function (error, json) {
  //     var accessToken = json.access_token;
  //     var openid = process.env.APP_OPENID;
  //     var nock = require('nock');

  //     var params = {
  //       access_token: accessToken,
  //       openid: openid
  //     };
  //     var url = 'https://api.weixin.qq.com';

  //     nock(url)
  //       .post('/sns/auth')
  //       .query(params)
  //       .reply(200, {
  //         errcode: 1
  //       });

  //     nodeWeixinOauth.profile(openid, accessToken, function (err, body) {
  //       logger.debug('err %s', err);
  //       logger.debug('body %s', JSON.stringify(body));
  //       assert.equal(true, !err);
  //       assert.equal(true, !!body);
  //       done();
  //     });
  //   });
  // });
});
describe('weixin user', function () {
  var nodeWeixinUser = require('node-weixin-user');
  it('profile', function (done) {
    var openid = process.env.APP_OPENID;
    nodeWeixinUser.profile(app, openid, function (err, data) {
      logger.debug('err %s', err);
      logger.debug('data %s', JSON.stringify(data));

      done();
    });
  });
});
describe('weixin pay', function () {
  var nodeWeixinPay = require('node-weixin-pay');

  //Init Merchant
  var merchant = {
    id: config.mch_id,
    key: config.wxpay_api_secret
  };
  nwc.merchant.init(merchant);

  var certificate = {
    pkcs12: path.join(__dirname, '../cert/apiclient_cert.p12'),
    key: '1302550301'
  };


  it('prepay', function (done) {
    var openid = process.env.APP_OPENID;
    var params = { openid: openid,
                   spbill_create_ip: '1.202.241.25',
                   notify_url: config.wxpay_noti_url,
                   body: '测试支付',
                   out_trade_no: '111',
                   total_fee: '1',
                   trade_type: 'JSAPI',
                   appid: app.id,
                   mch_id: merchant.id,
                   nonce_str: 'XjUw56N8MjeCUqHCwqgiKwr2CJVgYUpe' };
    var sign = nodeWeixinPay.sign(merchant, params);
    logger.debug('sign %s', sign);

    var conf = {
      app: app,
      merchant: merchant,
      certificate: certificate
    };
    logger.info('unified: %s', JSON.stringify(config));
    nodeWeixinPay.api.order.unified(conf, params, function(error, data) {
      logger.info('unified: %s, %s', error, JSON.stringify(data));
      done();
    });

  });

});
describe('weixin link', function () {
  var link = require('node-weixin-link');
  it('temporary', function (done) {
    async.waterfall([function(callback) {
      //创建临时二维码
      link.qrcode.temporary.create(app, 10, function (error, json) {
        if (error) logger.error(error);
        logger.info(json);
        //json.url
        //json.expire_seconds
        //json.ticket

        var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
        var dest = util.format('/tmp/qrcode_%s.jpg', json.ticket);
        logger.info('%s to %s', qrCodeUrl, dest);

        var file = fs.createWriteStream(dest);
        request({
          url: qrCodeUrl,
          timeout: 13000,
          method: 'get'
        })
          .on('error', function(err){
            logger.error(err);
          })
          .pipe(file);

        file.on('finish', function() {
          callback();
        });
      });
    }], function(error, result) {
      done();
    });
  });
  it('permanent', function (done) {
    async.waterfall([function(callback) {
      //创建永久二维码
      link.qrcode.permanent.create(app, 10, function (error, json) {
        if (error) logger.error(error);
        logger.info(json);
        //json.url
        //json.expire_seconds
        //json.ticket

        var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
        var dest = util.format('/tmp/qrcode_%s.jpg', json.ticket);
        logger.info('%s to %s', qrCodeUrl, dest);

        var file = fs.createWriteStream(dest);
        request({
          url: qrCodeUrl,
          timeout: 13000,
          method: 'get'
        })
          .on('error', function(err){
            logger.error(err);
          })
          .pipe(file);

        file.on('finish', function() {
          callback();
        });
      });
    }], function(error, result) {
      done();
    });
  });
  it('createString', function (done) {
    async.waterfall([function(callback) {
      //创建永久字符串二维码
      link.qrcode.permanent.createString(app, 'hello....', function (error, json) {
        if (error) logger.error(error);
        logger.info('createString: ' + JSON.stringify(json));
        //json.url
        //json.expire_seconds
        //json.ticket

        var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
        var dest = util.format('/tmp/qrcode_%s.jpg', json.ticket);
        logger.info('%s to %s', qrCodeUrl, dest);

        var file = fs.createWriteStream(dest);
        request({
          url: qrCodeUrl,
          timeout: 13000,
          method: 'get'
        })
          .on('error', function(err){
            logger.error(err);
          })
          .pipe(file);

        file.on('finish', function() {
          callback();
        });
      });
    }], function(error, result) {
      done();
    });
  });
  it('url.shorten', function (done) {
    async.waterfall([function(callback) {
      //创建url短链接
      var url = 'http://mp.weixin.qq.com/wiki/3/17e6919a39c1c53555185907acf70093.html';

      link.url.shorten(app, url, function (error, json) {
        if (error) logger.error(error);
        logger.info(json);
        //json.url
        //json.expire_seconds
        //json.ticket
        callback();
      });
    }], function(error, result) {
      done();
    });
  });

});
describe('weixin jssdk', function () {
  it('ticket', function (done) {
    var url = 'http://test.tttalk.org/test.html';
    nodeWeixinAuth.determine(app, function () {
      var authData = nodeWeixinSettings.get(app.id, 'auth');

      var type = 'jsapi';
      nodeWeixinAuth.ticket.determine(app, authData.accessToken, type, function(err) {
        if (err) {
          cb(err);
        } else {
          var ticket = nodeWeixinSettings.get(app.id, type).ticket;
          var timestamp = String((new Date().getTime() / 1000).toFixed(0));
          var sha1 = crypto.createHash('sha1');
          sha1.update(timestamp);
          var noncestr = sha1.digest('hex');
          var str = 'jsapi_ticket=' + ticket + '&noncestr='+ noncestr+'&timestamp=' + timestamp + '&url=' + url;
          var signature = crypto.createHash('sha1').update(str).digest('hex');
          logger.info("%s => %s", str, signature);

          var sig = {
            appId: config.app.id,
            timestamp: timestamp,
            nonceStr: noncestr,
            signature: signature
          };
          logger.info(sig);
        }
      });

      done();
    });

  });

});
describe('weixin message', function () {
  it('wxcard', function (done) {
    var nodeWeixinMessage = require('node-weixin-message');
    var service = nodeWeixinMessage.service;

    var openid = process.env.APP_OPENID;
    var cardId = config.card.first_pay;
    var outerId =1; //test

    service.api.wxcard(app, openid, cardId, outerId, function(err, data) {
      logger.info(err);
      logger.info(data);
      done();
    });
  });
});
describe('weixin card', function () {
  var openid = process.env.APP_OPENID;

  it('list', function (done) {
    nodeWeixinAuth.determine(app, function () {
      var authData = nodeWeixinSettings.get(app.id, 'auth');
      var nodeWeixinRequest = require('node-weixin-request');
      var url = 'https://api.weixin.qq.com/card/user/getcardlist?access_token=' + authData.accessToken;
      nodeWeixinRequest.json(url, {
        openid: openid,
        card_id: ""
      }, function(err, json) {
        logger.info(err);
        logger.info(json);
        done();
      });
    });
  });
});
