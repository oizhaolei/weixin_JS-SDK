var assert = require('assert');
var async = require('async');

require('../lib/wxsettings');
var wxcard = require('../lib/wxcard');

describe('wxcard', function () {
  it('list', function (done) {
    var openid = process.env.APP_OPENID;
    var card_id = process.env.APP_CARD_ID;
    wxcard.list(openid, card_id, function(err, card_list) {
      assert(!err);

      async.each(card_list, function(card, callback) {
        var card_id = card.card_id;
        var code = card.code;
        wxcard.detail(card_id, code, function(err, card) {
          assert(!err);
          assert(card);
          wxcard._check_consume(card_id, code, function(err, results) {
            assert(!err);
            assert(results);
            wxcard.consume(card_id, code, card.reduce_cost, function(err, results) {
              assert(!err);
              assert(results);
              callback();
            });
          });
        });
      }, function(err) {
        assert(!err);
        done();
      });
    });
  });

});
