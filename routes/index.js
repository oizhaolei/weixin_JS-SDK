var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index.js');
var crypto = require('crypto');
var util = require('util');
var path = require('path');
var fs = require("fs");

var request = require('request');
var express = require('express');
var router = express.Router();

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var nwAuth = require('node-weixin-auth');

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');
var oss = require('../lib/oss');
var app = config.app;

var getWebAccessToken = function(config, code, cb) {
  var url = util.format('https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code', config.app.id, config.app.secret, code);
  request.get(url, function(error, res, body) {
        if (error) {
            cb('getWebAccessToken error', error);
        }
        else {
          try {
            logger.info(body);
            var result = JSON.parse(body);

            var openid = result.openid;
            var access_token = result.access_token;
            cb(null, openid, access_token);
          }
          catch (e) {
            cb('getWebAccessToken error', e);
          }
        }
    });
};

router.post('/log', function (req, res, next) {
  logger.info(req.body);
});

router.get('/oauth', function (req, res, next) {
  logger.info(req.query);
  var action = req.query.action;
  getWebAccessToken(config, req.query.code, function(err, openid, access_token) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      logger.info("openid: ", openid);
      switch (action) {
      case 'wxpay' :
        res.redirect(config.appname + '/wxpay/list?openid=' + openid);
        break;

      case 'wxcard' :
        res.redirect(config.appname + '/wxcard/?openid=' + openid);
        break;

      case 'profile' :
        res.redirect(config.appname + '/profile?openid=' + openid + '&access_token=' + access_token);
        break;

      }
    }

  });
});

router.get('/', function (req, res, next) {
  res.render('index');
});

// profile
router.get('/profile', function (req, res, next) {
  var openid = req.query.openid;
  var access_token = req.query.access_token;
  var key = req.query.key;
  if (!key) {
    key = '';
  }
  var msg = req.query.msg;
  account_dao.getByOpenid(openid, function(err, accountData) {
    if (err) {
      next(err);
    } else {
      res.render('profile' + key, {
        layout : 'layout',
        appname: config.appname,
        title : '个人资料',
        msg : msg,
        account : accountData,
        openid : openid,
        access_token : access_token,
        key : key
      });
    }
  });
});


// 地址
router.post('/address', function (req, res, next) {
  var access_token = req.body.access_token;
  var url = req.body.url;

  var appid=config.app.id;
  var timestamp = String((new Date().getTime() / 1000).toFixed(0));
  var noncestr = crypto.createHash('sha1').update(timestamp).digest('hex');
  var str = "accesstoken="+access_token+"&appid="+appid+"&noncestr="+noncestr+"&timestamp="+timestamp+"&url="+url;
  logger.info(str);

  var signature = crypto.createHash('sha1').update(str).digest('hex');
  res.json({
    appId: config.app.id,
    scope:'jsapi_address',
    signType:'SHA1',
    addrSign:signature,
    timeStamp: timestamp,
    nonceStr: noncestr
  });
});

//change account
router.post('/change_account', function (req, res, next) {
  var openid = req.body.openid;
  logger.info(req.body);
  var key = req.body.key;
  var val = req.body.val;
  var data = {};
  data[key] = val;
  account_dao.updateAccount(openid, data, function(err, results, account) {
    if (err) {
      next(err);
    } else {
      var url = config.appname + '/profile?openid=' + openid + '&msg=' + encodeURIComponent(err ? err : '');
      res.redirect(url);
    }
  });
});

//change portrait
router.post('/change_portrait', function (req, res, next) {
  var openid = req.body.openid;
  var mediaid = req.body.mediaid;

  nwAuth.determine(app, function (err, authData) {
    var picurl = util.format('http://file.api.weixin.qq.com/cgi-bin/media/get?access_token=%s&media_id=%s', authData.accessToken, mediaid);
    var filename = mediaid + '.jpg';
    var sourceFile = fs.createWriteStream(path.join(config.tmpdir,  filename));
    request(picurl).pipe(sourceFile);
    sourceFile.on('finish', function() {
      var sourceFile = path.join(config.tmpdir,  filename);
      var dest = 'original/' + filename;
      oss.putObject(sourceFile, dest, 'image/jpeg', function(err, data) {
        if (err) {
            //callback(err, data);
        } else {
          var key = 'portrait';
          var val = util.format('http://file.tttalk.org/original/%s', filename);
          var data = {};
          data[key] = val;
          account_dao.updateAccount(openid, data, function(err, results, account) {
            if (err) {
              next(err);
            } else {
              res.send(val);
            }
          });
        }
      });
    });
  });
});

module.exports = router;
