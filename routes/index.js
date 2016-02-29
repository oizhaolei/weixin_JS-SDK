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

var account_dao = require('../dao/account_dao');
var tttalk = require('../lib/tttalk');
var app = config.app;

var getOpenid = function(config, code, cb) {
  var url = util.format('https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code', config.app.id, config.app.secret, code);
  request.get(url, function(error, res, body) {
        if (error) {
            cb('getOpenId error', error);
        }
        else {
            try {
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
      case 'wxpay' :
        res.redirect('/wxpay/list?openid=' + openid);
        break;

      case 'wxcard' :
        res.redirect('/wxcard/?openid=' + openid);
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
        key : key
      });
    }
  });
});

//fee_history
router.get('/fee_history', function (req, res, next) {
  var openid = req.query.openid;
  tttalk.fee_history(openid, function(err, accountData, feeHistoryData, chargeHistoryData) {
    if (err) {
      next(err);
    } else {
      res.render('fee_history', {
        layout : 'layout',
        title : '我的账单',
        account : accountData,
        feeHistory : feeHistoryData,
        chargeHistory : chargeHistoryData
      });
    }
  });
});

// share_to_friend
router.get('/share_to_friend', function (req, res, next) {
  var openid = req.query.openid;

  var share_msg = i18n.__('share_to_friend_msg', parseFloat(config.subscribe_reward) / 100);
  var share_memo = i18n.__('share_to_friend_memo', parseFloat(config.subscribe_reward) / 100);
  res.render('share_to_friend', {
    layout : 'layout',
    title : '分享有奖',
    openid : openid,
    share_msg : share_msg,
    share_memo : share_memo
  });
});

router.get('/share_to_friend_qrcode', function (req, res, next) {
  var openid = req.query.openid;
  var nwLink = require('node-weixin-link');
  nwLink.qrcode.permanent.createString(app, openid, function (err, json) {
    if (err) {
      next(err);
    } else {
      var qrCodeUrl = util.format('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s', json.ticket);

      var share_msg = i18n.__('share_to_friend_qrcode_msg');
      var share_memo = i18n.__('share_to_friend_qrcode_memo');
      res.render('share_to_friend_qrcode', {
        layout : 'layout',
        title : '分享给好友',
        qrcode : qrCodeUrl,
        share_msg : share_msg,
        share_memo : share_memo
      });
    }
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

module.exports = router;
