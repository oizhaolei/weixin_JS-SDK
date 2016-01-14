var assert = require('assert');
var config = require('../config.json');

var logger = require('log4js').getLogger('test/utils.js');

describe('utils', function () {

  it('util', function (done) {
    var now = new Date().getTime();
    logger.info("now: %s", now);

    assert(!'');
    assert(!null);

    done();
  });
});
