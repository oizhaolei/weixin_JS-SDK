var assert = require('assert');


var message_dao = require('../dao/message_dao');

describe('account dao', function () {
  it('findMessages', function (done) {
    var openid = process.env.APP_OPENID;
    message_dao.findMessages({
      openid : openid
    }, function(err, messages) {
      assert(!err);
      assert(messages);
      assert(messages.length > 0);
      done();
    });
  });
  it('findMessages with where', function (done) {
    var openid = process.env.APP_OPENID;
    message_dao.findMessages({
      openid:openid,
      filetype:'text'
    }, function(err, messages) {
      assert(!err);
      assert(messages);
      assert(messages.length > 0);
      done();
    });
  });

});
