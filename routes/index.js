var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index.js');

var request = require('request');
var express = require('express');
var router = express.Router();

var path = require('path');
var signature = require('../signature');

var account_dao = require('../dao/account_dao');

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
  account_dao.getByOpenid(openid, function(err, account) {
    res.render('profile', {
      account : account
    });

  });
});

module.exports = router;
