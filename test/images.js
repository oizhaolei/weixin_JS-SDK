var assert = require('assert');

var images = require("images");
var path = require('path');


describe('images', function () {
  it('normal', function (done) {

    images(path.join(__dirname, "4.pic.jpg"))                     //Load image from file
    //加载图像文件
      .size(800)                          //Geometric scaling the image to 400 pixels width
    //等比缩放图像到400像素宽
      .draw(images(path.join(__dirname, "qrcode.jpg")).size(682), 68, 57)
      .draw(images(path.join(__dirname, "132.jpg")), 344, 332)
    //在(10,10)处绘制Logo
      .save("/tmp/output.jpg");
    done();
  });

});
