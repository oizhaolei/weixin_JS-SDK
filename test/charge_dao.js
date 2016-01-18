var assert = require('assert');


var charge_dao = require('../dao/charge_dao');

describe('account dao', function () {
  it('findCharges', function (done) {
    var openid = process.env.APP_OPENID;
    charge_dao.findCharges({
      openid : openid
    }, function(err, charges) {
      assert(!err);
      assert(charges);
      assert(charges.length > 0);
      done();
    });
  });
  it('findCharges with where', function (done) {
    var openid = process.env.APP_OPENID;
    charge_dao.findCharges({
      openid:openid,
      trade_type:'JSAPI'
    }, function(err, charges) {
      assert(!err);
      assert(charges);
      assert(charges.length > 0);
      done();
    });
  });
  it('findCharges with where', function (done) {
    var openid = process.env.APP_OPENID;
    charge_dao.findCharges({
      openid:openid,
      memo:'wxpay---'
    }, function(err, charges) {
      assert(!err);
      assert(charges);
      assert(charges.length === 0);
      done();
    });
  });

});
