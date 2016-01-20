var assert = require('assert');


var message_dao = require('../dao/message_dao');
var openid = process.env.APP_OPENID;

var moment = require("moment");
var seed = moment().unix() ;
var msgid = seed++;

describe('message_dao', function () {
  it('findMessages', function (done) {
    message_dao.findMessages({
      openid : openid
    }, function(err, messages) {
      assert(!err);
      assert(messages);
      assert(messages.length >= 0);
      done();
    });
  });
  it('saveMessage', function (done) {
    var from_lang = 'CN';
    var to_lang = 'KR';
    var filetype = 'text';
    var content = '你好';
    message_dao.saveMessage(msgid, from_lang, to_lang, filetype, content, openid, function(err, results) {
      assert(!err);
      assert(results);
      assert.equal(results.affectedRows, 1);
      done();
    });
  });
  it('updateMessage', function (done) {
    var to_content = 'hello';
    message_dao.updateMessage(msgid, {
      to_content : to_content
    }, function(err, results, message) {
      assert(!err);
      assert.equal(results.affectedRows, 1);
      assert(message);
      assert.equal(message.to_content, to_content);
      done();
    });
  });
  it('findMessages with where', function (done) {
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
  it('deleteCharge', function (done) {
    message_dao.getMessage(msgid, function(err, message) {
      assert(!err);
      assert(message);
      assert.equal(message.msgid, msgid);
      message_dao.deleteMessage(msgid, function(err, results) {
        assert(!err);
        assert(results);
        assert.equal(results.affectedRows, 1);
        message_dao.getMessage(msgid, function(err, message) {
          assert(!err);
          assert.equal(message, null);
          done();
        });
      });
    });
  });


});
