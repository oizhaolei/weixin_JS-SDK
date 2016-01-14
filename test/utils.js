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

  it('util', function (done) {
    var now = new Date().getTime();
    logger.info("now: %s", now);

    assert(!'');
    assert(!null);

    done();
  });
});
