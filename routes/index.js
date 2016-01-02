var config = require('../config.json');
var logger = require('log4js').getLogger('routers/index');

var express = require('express');
var router = express.Router();

var path = require('path');
var signature = require('../signature');

router.all('/getSignature', function (req, res, next) {
  var url = req.body.url;
  logger.info(url);
  signature.getSignature(config, url, function(error, result) {
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
  signature.getOpenid(config, req.query.code, function(err, openid) {
    logger.info(openid);
    switch (req.query.action) {

    case 'wxpay_1' :
      res.redirect('/wxpay?fee=1&openid=' + openid);
      break;

    case 'wxpay_100' :
      res.redirect('/wxpay?fee=100&openid=' + openid);
      break;

    case 'pay_history' :
      res.redirect('/wxpay/pay_history?openid=' + openid);
      break;

    case 'fee_history' :
      res.redirect('/wxpay/fee_history?openid=' + openid);
      break;

    }

  });
});

router.get('/', function (req, res, next) {
  res.render('index');
});
module.exports = router;
