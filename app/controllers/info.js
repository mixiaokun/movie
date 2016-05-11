var Imooc = require('../models/imooc')
var superagent = require('superagent');
var request = require('request');
var cheerio = require('cheerio');

exports.imooc = function(req,res){
  Imooc.find({parent:null},function(err,docs){
    if(err){console.log(err);}
    res.render('imooc',{
      title:'在学慕课网课程',
      savedLesson:docs
    })
  })
}

exports.spiderImooc = function(req,res){
  var url = req.body.url
  request(url,function(error,response,body){
    var $ = cheerio.load(body)
    var chapters = $('.chapter')
    var courseName = $(".path").find("span").text()
    var lesson_id = $("#learnOn").attr('href').split('learn/')[1]
    var _lesson = new Imooc({
      id:lesson_id,
      name:courseName,
      parent:null
    })
    _lesson.save(function(err){
      if(err){console.log(err);}
    })
    chapters.each(function(item) {
      var chapter = $(this);
      var chapterTitle = chapter.find('strong').text();
      var videos = chapter.find('li')
      var parent = chapter.find('strong').text();
      var _chapter = new Imooc({
        name:chapterTitle,
        parent:"course" + lesson_id
      })
      _chapter.save(function(err){
        if(err){console.log(err);}
      })
      videos.each(function(item) {
        var video = $(this).find('.studyvideo');
        var videoTitle = video.text().trim().replace(/[\r\n]/g,"");
        var id = video.attr('href').split('video/')[1]
        var videolink = video.attr('href')
        var _section = new Imooc({
          name:videoTitle,
          id:id,
          parent:parent
        })
        _section.save(function(err){
          if(err){console.log(err);}
        })
      })
    })
  })
  res.json({1:1})
}

exports.getLessondata = function(req,res){
  var _id = req.body._id;
  var chapterName = req.body.parent
  if(_id){
    var data = {};
    Imooc.findById(_id,function(err,lesson){
      if(err){console.log(err);}
      var lessonId = 'course'+lesson.id;
      data.lessonName = lesson.name;
      data.chapters = []
      Imooc.find({parent:lessonId},function(err,docs){
        for(var i = 0; i < docs.length; i++){
          var chapterName = docs[i].name
          data.chapters[i] = {};
          data.chapters[i].name = chapterName;
        }
        res.json(data);
      })
    })
  }
  if(chapterName){
    Imooc.find({parent:chapterName},function(err,sections){
      if(err){console.log(err);}
      res.json(sections)
    })
  }
}

exports.getCookie = function(req,res){
  var accout = req.body.accout;
  var password = req.body.password;
  getCookie(accout,password,function(data){
    req.session.apsid = data;
    console.log(data);
    res.json({success:1})
  })
}

exports.player= function(req,res){
  var mid = req.params.id;
  var apsid = req.session.apsid;
  var cookie = "apsid=" + apsid;
  getImoocVideoUrl(cookie,mid,function(url){
    res.render('player',{
      src:url
    })
  })
}

function getCookie(accout,password,callback){
  var post_url = "http://www.imooc.com/passport/user/login"
  var contents = {
    username:accout,
    password:password,
    verify:'',
    remember:'1',
    referer:'http://www.imooc.com'
  }
  var browserMsg0 = {
    "Accept":"application/json, text/javascript, */*; q=0.01",
    "Accept-Encoding":"gzip deflate",
    "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6",
    "Connection":"keep-alive",
    "Content-Length":"98",
    "Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",
    "Host":"www.imooc.com",
    "Origin":"http://www.imooc.com",
    "Referer":"http://www.imooc.com/",
    "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36",
    "X-Requested-With":"XMLHttpRequest"
  }
  superagent.post(post_url).set(browserMsg0).send(contents).end(function(err,res){
    if(err){console.log(err);}
    var str = res.text;
    var info = JSON.parse(str)
    var link = info.data.url[0]
    var expando = "jQuery" + ('1.9.1' + Math.random()).replace(/\D/g, "")
    var number = parseInt(Date.now()) + 1
    var query = '&callback=' + expando + '_' + Date.now() + '&_=' + number
    var url = link + query
    superagent.get(url).end(function(err,res){
      if(err){console.log(err);}
      var cookies = res.headers['set-cookie']
      cookies = cookies.toString()
      var apsid = cookies.split('apsid=')[1].split(';')[0]
      callback(apsid)
    })
  });
}

function getImoocVideoUrl(cookie,mid,callback){
  var browserMsg1 = {
    'Accept':'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding':'gzip, deflate, sdch',
    'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6',
    'Cache-Control':'max-age=0',
    'Connection':'keep-alive',
    'Cookie':cookie,
    'Host':'www.imooc.com',
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
    'X-Requested-With':'XMLHttpRequest'
  }
  var link = "http://www.imooc.com/course/ajaxmediainfo/?mid="+mid+"&mode=html";
  superagent.get(link).set(browserMsg1).end(function(err,res){
    var info = JSON.parse(res.text)
    var url = info.data.result.mpath[2]
    callback(url)
  })
}
