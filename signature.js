var config = require('./config.json');

var url = require('url');
var crypto = require('crypto');
var request = require('request');
var async = require('async');
var iconv = require('iconv-lite');
var logger = require('log4js').getLogger('signature.js');
var path = require('path');

var redis = require("redis");
var redisClient = redis.createClient(config.redis);

var key = 'cache.json';
var cache = {
    ticket: null,
    time: 0
};

exports.getSignature = function(url, cb) {
    logger.info('start getSignature');
    // 判断内存中是否有缓存
    if (!cache || !cache.ticket) {
      logger.info('readCache');
      redisClient.get(key, function(str) {
            if (str) {
                logger.info(str);
                cache = JSON.parse(str);
            }
            tryGetSignature(url, cb);
        });
    }
    else {
        tryGetSignature(url, cb);
    }
};

function getToken(cb) {
    var tokenUrl = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appId=' + config.appId + '&secret=' + config.appSecret;

    request.get(tokenUrl, function(error, response, body) {
        if (error) {
            cb('getToken error', error);
        }
        else {

            try {
                var token = JSON.parse(body).access_token;
                cb(null, token);
            }
            catch (e) {
                cb('getToken error', e);
            }
        }
    });
}

function getNewTicket(token, cb) {
    request.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + token + '&type=jsapi', function(error, res, body) {
        if (error) {
            cb('getNewTicket error', error);
        }
        else {
            try {
                logger.info(JSON.parse(body));
                var ticket = JSON.parse(body).ticket;
                cb(null, ticket);
            }
            catch (e) {
                cb('getNewTicket error', e);
            }
        }
    });
}

function tryGetSignature(u, cb) {
    // 判断cache 是否过期
    if (!cache.ticket || (new Date().getTime() - cache.time) > 7000000) {
        async.waterfall([function(cb) {
            logger.info('start getNew Ticket', cache);
            getToken(cb);
        }, function(token, cb) {
            getNewTicket(token, cb);
        }], function(error, result) {
            if (error) {
                cb('getToken getNewTicket error', error);
            }
            else {
                cache.ticket = result;
                cache.time = new Date().getTime();
              // 文件保存
              var value = JSON.stringify(cache);

              redisClient.set(key, value);
                logger.info(result);

                var timestamp = getTimesTamp();
                var noncestr = getNonceStr();
                var str = 'jsapi_ticket=' + result + '&noncestr='+ noncestr+'&timestamp=' + timestamp + '&url=' + u;
                logger.info(str);
                var signature = crypto.createHash('sha1').update(str).digest('hex');
                cb(null, {
                    appId: config.appId,
                    timestamp: timestamp,
                    nonceStr: noncestr,
                    signature: signature
                });
            }
        });
    }
    else {
        logger.info('缓存获取');
        var timestamp = getTimesTamp();
        var noncestr = getNonceStr();
        var str = 'jsapi_ticket=' + cache.ticket + '&noncestr=' + noncestr + '&timestamp=' + timestamp + '&url=' + u;
        logger.info(str);
        var signature = crypto.createHash('sha1').update(str).digest('hex');
        cb(null, {
            appId: config.appId,
            timestamp: timestamp,
            nonceStr: noncestr,
            signature: signature
        });
    }
}

function getTimesTamp() {
    return parseInt(new Date().getTime() / 1000) + '';
}

function getNonceStr() {
    return Math.random().toString(36).substr(2, 15);
}

function decodeBuffer(bf, encoding) {
    var val = iconv.decode(bf.toBuffer(), encoding || 'utf8');
    if (val.indexOf('�') != -1) {
        val = iconv.decode(bf.toBuffer(), 'gbk');
    }
    return val;
}
