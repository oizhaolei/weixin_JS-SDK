var assert = require('assert');
var config = require('../config.json');
var redis = require("redis");
var redisClient = redis.createClient(config.redis);

redisClient.on("error", function (err) {
    console.log("Error " + err);
});

describe('/redis', function () {

  it('redis set url', function (done) {

    var key = 'test_url';
    var image_url = 'http://graph.facebook.com/828701563817098/picture?type=large';

    redisClient.set(key, image_url);
    redisClient.get(key, function(err, reply) {
      assert.equal(reply, image_url, 'reply must be equal to original');
      done();
    });
  });

  it('redis set', function (done) {
    var key = 187;

    redisClient.set(key, key);
    redisClient.get(key, function(err, reply) {
      assert(reply == key);
      redisClient.del(key, function() {
        redisClient.get(key, function(err, reply) {
          assert(!reply);
          done();
        });
      });
    });
  });

});