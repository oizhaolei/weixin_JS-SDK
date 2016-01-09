var assert = require('assert');
var config = require('../config.json');

var mysql = require('mysql');
var main_config = config.mysql.weixin.main;
main_config.multipleStatements = true;
var mainPool = mysql.createPool(main_config);

var moment = require("moment");
var seed = moment().unix() ;

describe('/mysql', function () {

  it('multi selects', function (done) {
    var sql = 'SELECT * FROM tbl_user_charge limit 1;SELECT * FROM tbl_account limit 1;SELECT * FROM tbl_message limit 1' ;
    mainPool.query(sql, function(err, results) {
      if (err) throw err;
      console.log(results);
      assert.equal(results.length, 3);
      assert(results[0].length == 1);
      assert(results[1].length == 1);
      assert(results[2].length == 1);

      done();
    });
  });

  it('multi statements', function (done) {
    var username = 'u_'+seed;

    var sql = 'insert into tbl_account (username,create_date) values (?,utc_timestamp(3));SELECT * FROM tbl_account where username = ?;delete FROM tbl_account where username = ?' ;
    var args = [username,username,username];
    mainPool.query(sql, args, function(err, results) {
      if (err) throw err;
      console.log(results);
      assert.equal(results.length, 3);
      assert(results[0].affectedRows == 1);
      assert(results[1].length == 1);
      assert(results[1][0].username == username);
      assert(results[2].affectedRows == 1);

      done();
    });
  });


});