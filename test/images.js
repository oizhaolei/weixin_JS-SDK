var assert = require('assert');

var images = require("images");
var path = require('path');


describe('images', function () {
  it('normal', function (done) {

    images(path.join(__dirname, "1.pic_hd.jpg"))                     //Load image from file
    //加载图像文件
    //等比缩放图像到400像素宽
      .draw(images(path.join(__dirname, "132.jpg")).size(48), 270, 54)
      .draw(images(path.join(__dirname, "qrcode.jpg")).size(220), 50, 360)
      .draw(images(path.join(__dirname, "132.jpg")).size(48), 136, 446)
    //在(10,10)处绘制Logo
      .save("/tmp/output.jpg");
    done();
  });

});
