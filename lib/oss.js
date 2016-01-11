var fs = require("fs");

var config = require('../config.json');
var logger = require('log4js').getLogger('lib/oss');

var ALY = require('aliyun-sdk');
var oss = new ALY.OSS(config.aliyun.oss);

exports.putObject = function(source, dest, contentType, counter, callback) {
  logger.debug('putObject %s to %s', source, dest);
  fs.readFile(source, function (err, data) {
    if (err) {
      logger.error('oss error:%s, %s, %s',source, dest, JSON.stringify(err));
      return;
    }

    oss.putObject({
      Bucket: config.aliyun.oss.bucket,
      Key: dest,
      Body: data,
      AccessControlAllowOrigin: '',
      ContentType: contentType,
      CacheControl: 'no-cache',         // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.9
      ContentDisposition: '',           // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec19.html#sec19.5.1
      ContentEncoding: 'utf-8',         // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.11
      ServerSideEncryption: 'AES256',
      Expires: (new Date()).getTime() + 3600 * 1000                       // 参考: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.21
    }, function (err, data) {
      if (err && err.code != 200) {
        logger.error('oss error:%s, %s, %s',source, dest, JSON.stringify(err));
        if (counter < 5) {
          setTimeout(putObject(source, dest, contentType, ++counter, callback), 1000);
        }
      } else {
        logger.debug('oss success:%s',JSON.stringify(data));
        if (callback) callback(err, data);
      }
    });
  });
};
exports.deleteObject = function(key, callback) {
  logger.debug('deleteObject %s', key);
    oss.deleteObject({
      Bucket: config.aliyun.oss.bucket,
      Key: key
    }, function (err, data) {
      if (callback) callback(err, data);
    });
};
