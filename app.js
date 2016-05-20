var express = require('express');
var app = express();
var fs = require('fs');
var port = process.env.PORT || 443;
var options = {
  key: fs.readFileSync('./file/SSL/ling.key','utf8'),
  cert: fs.readFileSync('./file/SSL/2_www.smkuse.info.crt','utf8'),
  passphrase:'tanling007'
}

var server = require('https').Server(options,app);
var mongoose = require('mongoose');
var dbUrl = 'mongodb://localhost/movie';
mongoose.connect(dbUrl);
var path = require('path');
var serveStatic = require('serve-static')
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
const session = require('express-session');
const mongoStore = require('connect-mongo')(session);

var morgan = require('morgan')
app.set('views', './app/views/pages');
app.set('view engine', 'jade');
app.locals.moment = require('moment')
app.use(serveStatic(path.join(__dirname, 'bower_components')));
app.use(serveStatic(path.join(__dirname, 'file')));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'Ling',
  store: new mongoStore({
    url:dbUrl,
    collection: 'sessions',
    ttl: 14 * 24 * 60 * 60,
  }),
  resave: true,
  saveUninitialized: true
}))

app.use(function(req, res, next) {
   var _user = req.session.user
   app.locals.user = _user
   next()
})

var env = process.env.NODE_ENV || 'development'
if('development' === env){
  app.set('ShowStackError',true)
  app.use(morgan('dev'))
  app.locals.pretty = true
  // mongoose.set('debug',true)
}

// 定时任务
var CronJob = require('cron').CronJob;
var BiliSpider = require('./app/controllers/biliApi')
var job = new CronJob({
  // Seconds: 0-59
  // Minutes: 0-59
  // Hours: 0-23
  // Day of Month: 1-31
  // Months: 0-11
  // Day of Week: 0-6
  cronTime: "00 00 00 * * *",
  onTick: function() {
    BiliSpider.bilispider()
  },
  // onComplete 这个触发的条件hava some promblem
  start:true, /* Start the job right now */
  timeZone:"Asia/Shanghai" /* Time zone of this job. use moment timezone */
});

server.listen(port);
require('./route')(app);
require('./chatserver')(server);
console.log("Server start: " + port);
