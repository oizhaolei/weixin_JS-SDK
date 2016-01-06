////set DEBUG=handle & node .\bin\www
var config = require('./config.json');

var express = require('express');
var app = express();

var parseurl = require('parseurl');

var path = require('path');
var logger = require('log4js').getLogger('app');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

app.use(cookieParser());

var hbs = require("hbs");
hbs.registerPartials(__dirname + '/views/partials');
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
hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

//auth: 访问 /account/* 的话，都需要 login
app.use(function(req, res, next){
  var pathname = parseurl(req).pathname;
  logger.info(pathname);
  next();
});

var routes = require('./routes/index');
app.use('/', routes);

var weixin_routes = require('./routes/weixin');
app.use('/weixin', weixin_routes);

var wxpay_routes = require('./routes/wxpay');
app.use('/wxpay', wxpay_routes);

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
app.use(function (err, req, res, next) {var block = blocks[name];
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
hbs.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

//auth: 访问 /account/* 的话，都需要 login
app.use(function(req, res, next){
  var pathname = parseurl(req).pathname;
  logger.info(pathname);
  next();
});

var routes = require('./routes/index');
app.use('/', routes);

var weixin_routes = require('./routes/weixin');
app.use('/weixin', weixin_routes);

var wxpay_routes = require('./routes/wxpay');
app.use('/wxpay', wxpay_routes);

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
    logger.error(err);
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
  logger.error(err);  var block = blocks[name];
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
hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

//auth: 访问 /account/* 的话，都需要 login
app.use(function(req, res, next){
  var pathname = parseurl(req).pathname;
  logger.info(pathname);
  next();
});

var routes = require('./routes/index');
app.use('/', routes);

var weixin_routes = require('./routes/weixin');
app.use('/weixin', weixin_routes);

var wxpay_routes = require('./routes/wxpay');
app.use('/wxpay', wxpay_routes);

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
app.use(function (err, req, res, next) {var block = blocks[name];
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
hbs.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

//auth: 访问 /account/* 的话，都需要 login
app.use(function(req, res, next){
  var pathname = parseurl(req).pathname;
  logger.info(pathname);
  next();
});

var routes = require('./routes/index');
app.use('/', routes);

var weixin_routes = require('./routes/weixin');
app.use('/weixin', weixin_routes);

var wxpay_routes = require('./routes/wxpay');
app.use('/wxpay', wxpay_routes);

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
    logger.error(err);
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
