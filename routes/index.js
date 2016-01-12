var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index.js');
var util = require('util');

var request = require('request');
var express = require('express');
var router = express.Router();

var async = require('async');
var moment = require("moment");

var path = require('path');
var signature = require('../signature');

var account_dao = require('../dao/account_dao');
var message_dao = require('../dao/message_dao');
var app = {
  id : config.appId,
  secret : config.appSecret,
  token : config.appToken
};

router.all('/getSignature', function (req, res, next) {
  var url = req.body.url;
  logger.info(url);
  signature.getSignature(url, function(error, result) {
    logger.info(error);
    logger.info(result);
    if (error) {
      res.json({
        'error': error
      });
    } else {
      res.json(result);
    }
  });
});

router.post('/log', function (req, res, next) {
  logger.info(req.body);
});

router.get('/oauth', function (req, res, next) {
  logger.info(req.query);
  getOpenid(config, req.query.code, function(err, openid) {
    logger.info(openid);
    switch (req.query.action) {

    case 'wxpay_1' :
      res.redirect('/wxpay/?fee=1&openid=' + openid);
      break;

    case 'wxpay_100' :
      res.redirect('/wxpay/?fee=100&openid=' + openid);
      break;

    case 'share_to_friend' :
      res.redirect('/share_to_friend?openid=' + openid);
      break;

    case 'profile' :
      res.redirect('/profile?openid=' + openid);
      break;

    }

  });
});

function getOpenid(config, code, cb) {
    request.get('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.appId + '&secret=' + config.appSecret + '&code=' + code + '&grant_type=authorization_code', function(error, res, body) {
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
}

router.get('/', function (req, res, next) {
  res.render('index');
});

// profile
router.get('/profile', function (req, res, next) {
  var openid = req.query.openid;
  async.parallel({
    accountData : function(callback){
      account_dao.getByOpenid(openid, function(err, accountData) {
        callback(err, accountData);
      });
    },
    feeHistoryData : function(callback){
      message_dao.findByOpenid(openid, function(err, feeHistoryData) {
        for(var i in feeHistoryData) {
          var feeHistory = feeHistoryData[i];
          if(feeHistory.filetype == 'photo')
            feeHistory.from_content = '图片翻译';
          else if(feeHistory.filetype == 'voice')
            feeHistory.from_content = '语音翻译';
          feeHistory.create_date = moment(feeHistory.create_date).format("MM-DD HH:mm:ss")
        }
        callback(err, feeHistoryData);
      });
    }
  },

  function(err, results) {
    //准备数据
    var accountData = results.accountData;
    var feeHistoryData = results.feeHistoryData;
    res.render('profile', {
      account : accountData,
      feeHistory : feeHistoryData
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
      var info = util.format('分享上面的二维码给朋友，您可以得到充值%d元，具体规则请见%s', parseFloat(config.subscribe_fee) / 100, config.share_rules_url);

      res.render('share_to_friend', {
        info : info,
        qrcode : qrCodeUrl
      });
    }
  });
});

module.exports = router;
