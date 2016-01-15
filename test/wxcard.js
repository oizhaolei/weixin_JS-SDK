var assert = require('assert');
var config = require('../config.json');

var wxcard = require('../lib/wxcard');

describe('wxcard', function () {
  it('list', function (done) {
    var openid = process.env.APP_OPENID;
    var card_id = config.card.first_pay;
    wxcard.list(openid, card_id, function(err, cards) {
      console.log(err);
      console.log(cards);
      assert(!err);
      done();
    });
  });

});
