var assert = require('assert');

var images = require("images");
var path = require('path');


describe('images', function () {
  it('normal', function (done) {

    images(path.join(__dirname, "image1.png"))                     //Load image from file
    //加载图像文件
      .size(800)                          //Geometric scaling the image to 400 pixels width
    //等比缩放图像到400像素宽
      .draw(images(path.join(__dirname, "qrcode.jpg")).size(200), 10, 10)   //Drawn logo at coordinates (10,10)
    //在(10,10)处绘制Logo
      .save("/tmp/output.jpg", {               //Save the image to a file,whih quality 50
        quality : 50                    //保存图片到文件,图片质量为50
      });
    done();
  });

});
