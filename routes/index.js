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
    res.redirect('/wxpay?openid=' + openid);
  });
});

router.get('/', function (req, res, next) {
  res.render('index');
});
module.exports = router;
