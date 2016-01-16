var assert = require('assert');
var config = require('../config.json');
var fs = require("fs");
var path = require('path');

var logger = require('log4js').getLogger('test/utils.js');
var readFile = function(filename) {
  var buf = fs.readFileSync(path.join(config.tmpdir, filename), "utf8");
  return buf;
};

var writeFile = function(filename, str) {
  fs.writeFileSync(path.join(config.tmpdir, filename), str, "utf8");
};

var randomInt = function(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
};
describe('utils', function () {

  it('util', function (done) {
    var now = new Date().getTime();
    logger.info("now: %s", now);

    assert(!'');
    assert(!null);

    done();
  });
  it('random', function (done) {
    console.log(randomInt(0, 99));
    done();
  });
  it('file io', function (done) {
    var key = 'key';
    var value = 'value';
    writeFile(key, value);
    var str = readFile(key);
    console.log(str);
    assert.equal(str, value);
    done();
  });
});
