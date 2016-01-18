"use strict";
////set DEBUG=handle & node .\bin\www
var config = require('./config.json');
var fs = require("fs");

var express = require('express');
var app = express();

var path = require('path');
var logger = require('log4js').getLogger('app.js');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var i18n = require("i18n");
i18n.configure({
  locales : ['cn'],
  defaultLocale : 'cn',
  directory : path.join(__dirname, 'locales')
});

var hbs = require("hbs");
hbs.registerPartials(path.join(__dirname, 'views/partials'));
hbs.registerHelper("equal", require("handlebars-helper-equal"));
hbs.localsAsTemplateData(app);
// {{blocks}} {{extend}}
var blocks = {};
hbs.registerHelper('extend', function(name, context) {
  var block = blocks[name];
  if (!block) {
    block = blocks[name] = [];
  }

  block.push(context.fn(this)); // for older versions of handlebars, use block.push(context(this));
});

hbs.registerHelper('block', function(name) {
  var val = (blocks[name] || []).join('\n');

  // clear the block
  blocks[name] = [];
  return val;
});
hbs.registerHelper('json', function(val) {
  return JSON.stringify(val);
});
hbs.registerHelper('fen2yuan', function(val) {
  return parseFloat(val) / 100;
});
hbs.registerHelper('__', function () {
  return i18n.__.apply(this, arguments);
});
hbs.registerHelper('__n', function () {
  return i18n.__n.apply(this, arguments);
});
hbs.registerHelper('convUtcDateString', function(UTCDateString) {
  if (UTCDateString != null) {
    var convertdLocalTime  = new Date(UTCDateString);
    var hourOffset = convertdLocalTime.getTimezoneOffset() / 60;
    convertdLocalTime.setHours(convertdLocalTime.getHours() - hourOffset);
    return (convertdLocalTime.getMonth() + 1) + "-" + convertdLocalTime.getDate() + " " + convertdLocalTime.getHours() + ":" + convertdLocalTime.getMinutes();
  } else {
    return "";
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components',  express.static(path.join(__dirname, 'bower_components')));
app.use(i18n.init);


app.use(function(req, res, next) {
  logger.info('\n----------- New Request ---------\nurl: %s\nquery: %s\nbody: %s\n--------------------------------- ', req.originalUrl, JSON.stringify(req.query), JSON.stringify(req.body));
  next();
});

var readFile = function(filename) {
  var buf = fs.readFileSync(path.join(config.tmpdir, filename), "utf8");
  return buf;
};

var writeFile = function(filename, str) {
  fs.writeFileSync(path.join(config.tmpdir, filename), str, "utf8");
};
var nwSettings = require('node-weixin-settings');
var prefix = 'wx_';
nwSettings.registerSet(function(id, key, value, cb) {
  logger.debug('registerSet %s %s %s', id, key, JSON.stringify(value));
  writeFile(prefix + id + '_' + key, JSON.stringify(value));
  cb(null);
});
nwSettings.registerGet(function(id, key, cb) {
  var value = null;
  try{
    value = JSON.parse(readFile(prefix + id + '_' + key));
    logger.debug('registerGet %s %s %s', id, key, JSON.stringify(value));
  } catch (e) {
    logger.error(e);
  }
  cb(value);
});


var routes = require('./routes/index');
app.use('/', routes);

var weixin_routes = require('./routes/weixin');
app.use('/weixin', weixin_routes);

var wxpay_routes = require('./routes/wxpay');
app.use('/wxpay', wxpay_routes);

var wxcard_routes = require('./routes/wxcard');
app.use('/wxcard', wxcard_routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  logger.error(err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
