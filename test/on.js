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
    on.onSubscribe(openid, msgid, function() {
      done();
    });
  });
  it('onText & onTranslateCallback', function (done) {
    msgid = seed++;
    on.onText(openid, '你好', msgid, function() {
      var params = {"loginid":"3638","user_id":"3638","app_name":"chinatalk","message_id":"5324856","from_lang":"CN","from_content":"你好","from_content_length":"2","to_lang":"KR","fee":"0.0","auto_translate":"2","translator_id":null,"callback_id":msgid,"to_content":"안녕하세요."};
      on.onTranslateCallback(params, function() {
        done();
      });
    });
  });
  it('onVoice', function (done) {
    msgid = seed++;
    var mediaid = seed++;
    var url = 'http://file.tttalk.org/voice/SmJY1MmuL0rWZ2knfEKCiJ32kEsMQ2M1k5KN8hyRaXPGv72e5NAWp92tRuYn1A1y.amr';
    on.onVoice(openid, mediaid, url, msgid, function() {
      done();
    });
  });
  it('onImage', function (done) {
    msgid = seed++;
    var mediaid = seed++;
    var url = 'http://file.tttalk.org/original/1KWHqyXvsBiorawoUDbQxnt93bNmtK0y3Al-zp6BoD_xuP2Ck37twtofQYHnEDLx.jpg';
    on.onImage(openid, mediaid, url, msgid, function() {
      done();
    });
  });
});
