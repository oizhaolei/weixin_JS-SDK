var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index.js');
var util = require('util');
var path = require('path');

var request = require('request');
var express = require('express');
var router = express.Router();

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

var tttalk = require('../lib/tttalk');
var app = config.app;

var getOpenid = function(config, code, cb) {
    request.get('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.app.id + '&secret=' + config.app.secret + '&code=' + code + '&grant_type=authorization_code', function(error, res, body) {
        if (error) {
            cb('getOpenId error', error);
        }
        else {
            try {
                logger.info(JSON.parse(body));
                var openid = JSON.parse(body).openid;
                cb(null, openid);
            }
            catch (e) {
                cb('getOpenid error', e);
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
  getOpenid(config, req.query.code, function(err, openid) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      logger.info("openid: ", openid);
      switch (action) {

      case 'wxcard' :
        res.redirect('/wxcard/list?openid=' + openid);
        break;


      case 'wxpay' :
        res.redirect('/wxpay/list?openid=' + openid);
        break;

      case 'share_to_friend' :
        res.redirect('/share_to_friend?openid=' + openid);
        break;

      case 'profile' :
        res.redirect('/profile?openid=' + openid);
        break;

      case 'fee_history' :
        res.redirect('/fee_history?openid=' + openid);
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
  tttalk.profile(openid, function(err, accountData) {
    var bind_action = (accountData.telephone==""||accountData.telephone==null)?'绑定':'更改';
    res.render('profile', {
      layout : 'layout',
      title : '个人资料',
      account : accountData,
      openid : openid,
      bind_action : bind_action
    });
  });
});

//fee_history
router.get('/fee_history', function (req, res, next) {
var openid = req.query.openid;
tttalk.fee_history(openid, function(err, feeHistoryData, chargeHistoryData) {
 res.render('fee_history', {
   layout : 'layout',
   title : '我的账单',
   feeHistory : feeHistoryData,
   chargeHistory : chargeHistoryData
 });
});
});

// share_to_friend
router.get('/share_to_friend', function (req, res, next) {
  var openid = req.query.openid;
  var nodeWeixinLink = require('node-weixin-link');
  nodeWeixinLink.qrcode.permanent.createString(app, openid, function (err, json) {
    if (err) {
      res.send("success");
    } else {
      var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);
      var info = i18n.__('share_to_friend', parseFloat(config.subscribe_fee) / 100, config.share_rules_url);

      res.render('share_to_friend', {
        layout : 'layout',
        title : '个人资料',
        info : info,
        qrcode : qrCodeUrl
      });
    }
  });
});

//bind_telphone
router.post('/bind_telphone', function (req, res, next) {
  var openid = req.body.openid;
  var telephone = req.body.telephone;
  tttalk.bind_telphone(openid, telephone, function(err, accountData) {
    res.redirect('/profile?openid=' + openid);
  });
});

//change account
router.post('/change_account', function (req, res, next) {
  var openid = req.body.openid;
  logger.info(req.body);
  var username = req.body.username;
  var sex = req.body.sex;
  tttalk.change_account(openid, username, sex, function(err, accountData) {
    res.redirect('/profile?openid=' + openid);
  });
});

module.exports = router;
