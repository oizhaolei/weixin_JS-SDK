var express = require('express');
var router = express.Router();
var logger = require('log4js').getLogger('routers/index');

var path = require('path');
var signature = require('../signature');
var config = require('../config.json');


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
module.exports = router;
