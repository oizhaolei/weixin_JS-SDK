var path = require('path');
var signature = require('../signature');
var config = require('../config')();

var createSignature = signature.getSignature(config);


router.get('/getSignature', function (req, res, next) {
  var url = req.body.url;
  console.log(url);
  createSignature(url, function(error, result) {
    if (error) {
      res.json({
        'error': error
      });
    } else {
      res.json(result);
    }
  });
});


router.get('/log', function (req, res, next) {
  console.log(req.body);
});
