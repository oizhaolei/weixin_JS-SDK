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
  it('template', function (done) {
    var openid = process.env.APP_OPENID;
    wxservice.sendtemplate(openid, 'FFHuNX3MGU1EoxbOfmemisZeR0FRr1IH7NA0jrCzx5Y', 'http://wechat.tttalk.org', {
      "first": {
        "value":"恭喜你购买成功！",
        "color":"#173177"
      },
      "orderMoneySum":{
        "value":"102.82",
        "color":"#173177"
      },
      "orderProductName": {
        "value":"田一块",
        "color":"# 383232"
      },
      "remark":{
        "value":"欢迎再次购买！",
        "color":"#173177"
      }
    }, function(err, data) {
      assert(!err);
      assert.equal(data.errcode, 0);
      done();
    });
  });

});
