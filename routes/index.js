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
  res.send('');
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
      case 'redirect' :
        res.redirect('http://haoshufu.tttalk.org/mobile/?wxid=' + openid);
        break;
      case 'my_web' :
        res.redirect(config.weixin_web_url + '?openid=' + openid + '&password=weixin_password');
        break;
      case 'my_order' :
        res.redirect('/my_order?openid=' + openid);
        break;

      case 'share_to_friend' :
        res.redirect('/share_to_friend?openid=' + openid);
        break;

      case 'my_profile' :
      case 'profile' :
        res.redirect('/profile?openid=' + openid + '&access_token=' + access_token);
        break;

      case 'store_auth' :
        res.redirect('/store_auth?openid=' + openid);
        break;

      }
    }
  });
});

router.get('/', function (req, res, next) {
  res.render('index');
});

// my_order
router.get('/my_order', function (req, res, next) {
  //TODO
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

router.get('/list_approves', function (req, res, next) {
  var openid = req.query.openid;
  account_dao.getApproveByOpenid(openid, function(err, approves) {
    res.send(approves);
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


router.get('/store_auth', function (req, res, next) {
  var openid = req.body.openid;
  res.render('store_auth', {
    layout : 'layout',
    title : '商户认证',
    openid : openid
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
      var url = '/profile?openid=' + openid + '&msg=' + encodeURIComponent(err ? err : '');
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
          next(err);
        } else {
          var val = util.format('http://file1-tttalk-org.oss-cn-beijing.aliyuncs.com/original/%s', filename);
          data = {'portrait':val};
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

//change store auth
router.post('/change_store_auth', function (req, res, next) {
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
        logger.debug(err, data);
        if (err) {
            next(err, data);
        } else {
          var val = util.format('http://file1-tttalk-org.oss-cn-beijing.aliyuncs.com/original/%s', filename);
          //TODO
          //更新数据
          account_dao.insertdApprove(openid, val, function() {
          });
          res.send(val);
        }
      });
    });
  });
});

module.exports = router;
