//一个补救程序：指定需要更新的openid，重新获取一下profile
// node test/profile.js openid1 openid2 ...

require('../lib/wxsettings');
var on = require('../lib/on.js');
var async = require('async');

async.each(process.argv.slice(2), function(openid, callback) {
  on.profile(openid, callback);
}, function(err){
  console.log('All files have been processed successfully');
});
