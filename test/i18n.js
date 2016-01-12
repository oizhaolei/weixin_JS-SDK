var assert = require('assert');
var path = require('path');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, '../locales')
});

describe('i18n', function () {
  it('normal', function (done) {
    assert.equal(i18n.__('translating_pls_wait'), "正在人工翻译中，请稍等。。。");
    done();
  });
});
