var assert = require('assert');

require('../lib/wxsettings');
var wxservice = require('../lib/wxservice');

describe('wxservice', function () {
  it('text', function (done) {
    var openid = process.env.APP_OPENID;
    wxservice.text(openid, 'hello', function(err, data) {
      assert(!err);
      assert.equal(data.errcode, 0);
      done();
    });
  });
  it('wxcard', function (done) {
    var openid = process.env.APP_OPENID;
    var card_id = process.env.APP_CARD_ID;
    wxservice.wxcard(openid, card_id, 0, function(err, data) {
      assert(!err);
      assert.equal(data.errcode, 0);
      done();
    });
  });

});
