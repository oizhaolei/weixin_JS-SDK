require('../lib/wxsettings');
var on = require('../lib/on.js');
var moment = require("moment");
var seed = moment().unix() ;

var account_dao = require('../dao/account_dao');

var openid = process.env.APP_OPENID;
var up_openid = process.env.APP_UP_OPENID;
var msgid = seed++;

describe('nomal test', function () {
  it('clean subscribe', function (done) {
    on.onUnsubscribe(openid, function() {
      account_dao.deleteAccount(openid, function(err, results) {
        done();
      });
    });
  });
  it('onSubscribe', function (done) {
 msgid = seed++;
    on.onSubscribe(openid, up_openid, msgid, function() {
      done();
    });
  });
  it('onText', function (done) {
    msgid = seed++;
    on.onText(openid, '你好', msgid, function() {
      done();
    });
  });
  it('onTranslateCallback', function (done) {
    var params = {"loginid":"3638","user_id":"3638","app_name":"chinatalk","message_id":"5324856","from_lang":"CN","from_content":"你好","from_content_length":"2","to_lang":"KR","fee":"0.0","auto_translate":"2","translator_id":null,"callback_id":msgid,"to_content":"안녕하세요."};
    on.onTranslateCallback(params, function() {
      done();
    });
  });
});
