var config = require('../config.json');
var logger = require('log4js').getLogger('routers/translate');

var express = require('express');
var router = express.Router();
var tttalk = require('../lib/tttalk');

router.post('/', function (req, res, next) {
  logger.info(req.body);
  
  tttalk.translate_callback(req.body.callback_id, req.body.to_content);
});
module.exports = router;
