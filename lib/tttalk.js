//
var Tttalk = function () {
};

// 创建用户
Tttalk.prototype.createAccount = function (username, callback) {
  // ...
  if (callback) callback(null, {balance : 5001});
};

module.exports = new Tttalk();
