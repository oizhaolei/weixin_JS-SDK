var moment = require('moment-timezone');

describe('moment-timezone', function () {
  it('normal', function () {
    var moment = require('moment-timezone');
    var utc = moment.tz("2016-01-12 06:07:09.284:", "UTC");
    var shanghai = utc.clone().tz("Asia/Shanghai");
    console.log('Shanghai:' + shanghai.format('MM-DD HH:mm:ss'));
  });
});
