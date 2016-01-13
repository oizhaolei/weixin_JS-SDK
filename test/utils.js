var assert = require('assert');
var config = require('../config.json');

var logger = require('log4js').getLogger('test/utils.js');
var signature = require('../signature');

describe('utils', function () {

  it('signature', function (done) {

    var url = '';
    signature.getSignature(url, function(error, result) {
      logger.info(error);
      logger.info(result);
      done();
    });
  });

  it('wxcard', function (done) {
    var openid = process.env.APP_OPENID;
    var cardId = config.cardId;
    var outerId =1; //test

    signature.wxcard(openid, cardId, outerId, function(err, data) {
      logger.info(err);
      logger.info(data);
      done();
    });
  });

  it('util', function (done) {
    assert(!'');
    assert(!null);

    done();
  });
});
