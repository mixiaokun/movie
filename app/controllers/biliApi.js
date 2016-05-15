var Promise = require('es6-promise').Promise;
const exec = require('child_process').exec;
var Movie = require('../models/movie')
var Chat = require('../models/chat')
var request = require('request');
var cheerio = require('cheerio');
var xml2js = require('xml2js');
var path = require('path');
var fs = require('fs');

// error type
var et = {
  de:'Download err',
  ds:'Download success',
  te:'Trans Code err',
  ts:'Trans Code success',
  us:'URL save to DB success',
  xe:'XML to DB err',
  xs:'XML to DB success',
  xh:'Local Have XML',
  vs:'Movie have Saved'
}

exports.bilispider = function (req,res) {
  res.json({1:1})
  // 自2016开始-每个月的数据收集一次排行榜数据
  // 收藏：stow
  // 评论数：review
  // 播放数：hot
  // 硬币数：promote
  // 用户评分：comment
  // 弹幕数：damku
  // 拼音：pinyin-{x}，x可以是A~Z中的一个
  // 投稿时间：default(越新放在越前面)
  var rank = 'stow'
  var year = new Date().getFullYear()
  var month = new Date().getMonth()
  var date = new Date().getDate()
  month = month + 1
  month = month > 9 ? month : '0' + month
  date = date > 9 ? date : '0' + date
  var updatetime = year + '-' + month + '-' + date

  if(year == 2016){
    var c = 0
    var interval = setInterval(function(){
      c++
      c = c > 9 ? c : '0' + c
      var startTime = '2016-' + c + '-01'
      d = parseInt(c) + 1
      d = d > 9 ? d : '0' + d
      if(d == 13) return false
      var endTime = '2016-' + d + '-01'
      // 第一次请求获取当前排行榜中有多少页数据
      var baseurl = 'http://www.bilibili.tv/list/' + rank + '-20-1-' + startTime + '~' + endTime +'-original.html'
      request(baseurl,function(error,response,body){
        var $ = cheerio.load(body)
        var pageCount = $('.endPage').text

        // 爬取当前月份的所有数据
        var page = 0
        var interval1 = setInterval(function () {
          page++

          console.log('month:' + c + ' page:' + page);
          var SpiderUrl = 'http://www.bilibili.tv/list/' + rank + '-20-'+ page +'-' + startTime + '~' + endTime +'-original.html'
          request(SpiderUrl,function(error,response,body){

            console.log(SpiderUrl);
            if (!error && response.statusCode == 200) {
              var $ = cheerio.load(body)
              var items = $('.vd-list').find('li')
              items.each(function(item){
                var video = $(this).find('div > a')
                var id = video.attr('href').split('/video/')[1].split('/')[0]
                var title = video.attr('title').trim().replace(/[\r\n]/g,"")
                var summary = $(this).find('.v-desc').text().replace(/[\r\n]/g,"")

                var hot = $(this).find('.gk > span').text()
                var damku = $(this).find('.dm > span').text()
                var stow = $(this).find('.sc > span').text()

                var up_id = $(this).find('.up-info > a').attr('href').split('.com/')[1]
                var up_name = $(this).find('.up-info > a').text()
                var up_uploadtime = $(this).find('.up-info > span').text()
                console.log(id + ' : ' + title);
                console.log('hot: ' + hot + 'damku: ' + damku + 'stow: ' + stow);
                console.log(up_id + up_name + up_uploadtime);
                Movie.findOne({mid:id},function(err,movie){
                  if(err){console.log(err);}
                  if(!movie){
                    var biliVideoInfo = new Movie({
                      mid:id,
                      title:title,
                      summary:summary,
                      fake_category:'bili',
                      updatetime:updatetime,
                      hot:hot,
                      damku:damku,
                      stow:stow,
                      up_id:up_id,
                      up_name:up_name,
                      up_uploadtime:up_uploadtime,
                    })
                    biliVideoInfo.save(function(err){
                      if(err){console.log(err);}
                    })
                  }else {
                    Movie.update({mid:id},{$set:{
                      hot:hot,
                      damku:damku,
                      stow:stow,
                      updatetime:updatetime
                    }},function(err){
                      if(err){console.log(err);}
                    })
                  }
                })
              })
            }
          })
          if(page == pageCount) clearInterval(interval1)
        }, 5000);
      })
      if(c == month-1) clearInterval(interval)
    },30000)
  }
};

exports.bilidown = function (req,res) {
  res.json({'开始下载':'downloading---'})
  var errlist = []
  Movie
    .find({up_uploadtime:{$gte:'2016-05-14 00:00'}})
    .sort({hot:-1})
    .limit(20)
    .exec(function(err,docs){
      var task = 0
      var length = docs.length
      var interval = setInterval(function () {
        task++
        var movie = docs[task]
        var mid = movie.mid
        if(movie.video_url && movie.xml){
          console.log(mid + ' : ' + et.vs);
        }else {
          var baseurl = "http://www.bilibili.com/video/" + movie.mid
          // ovn:originalVideoName,
          // tvn:TranscodedVideoName,
          // oxn:originalXmlFileName
          var ovn = mid + ".flv";
          var tvn = mid + ".mp4";
          downloadFile(ovn,baseurl).then(function(dv){
            // 下载成功 dv:Promise downloadFile return value
            console.log(mid + ' : ' + et.ds);
            transcodeVideo(ovn,tvn).then(function(tv){
              // 转码成功 tv: Promise transcodeVideo return value
              console.log(mid + ' : ' + et.ts);
            },function(tv){
              // 转码失败
              errlist.push(mid)
              console.log(mid + ' : ' + et.te);
            })
          },function(dv){
            // 下载失败
            errlist.push(mid)
            console.log(mid + ' : ' + et.de);
          })
        }
        // 只下载前四十个，服务器磁盘不够用
        if(task == 19) {
          clearInterval(interval)
          console.log(errlist);
        }
      }, 30*1000);
    })
};

exports.updateMovies = function (req,res) {
  // 所有数据以本地存在为准
  // vdu:video database url
  res.json({1:1})
  var a = new RegExp(/\bav\d{7}\.mp4\b/)
  var b = new RegExp(/.*cmt\.xml/)

  Movie.update({},{$unset:{video_url:1,xml:1}},{multi:true},function(err){
    if(err) console.log(err)
    var dirPath = path.dirname(process.argv[1]) + '/file/videos/'
    var files = fs.readdirSync(dirPath)
    var task = files.length
    console.log(task);

    var interval =  setInterval(function () {
      task--
      var file = files[task]
      if(a.test(file)){
        var mid = file.split(/.mp4/)[0]
        var vdu = '/videos/' + mid + '.mp4';
        Movie.update({mid:mid},{$set:{video_url:vdu}},function(err){
          if(err) console.log(err);
          console.log(task + ' : ' + mid);
        })
      }else if(b.test(file)) {
        var title = file.split(/.cmt.xml/)[0]
        Movie.update({title:title},{$set:{xml:true}},function(err){
          if(err) console.log(err);
          console.log(task + ' : ' + title);
        })
      }else {
        console.log('err');
      }

      if(task == 0) clearInterval(interval)
    }, 500);
  })
};

exports.bilidamku = function (req,res) {
  res.json({1:1})
  Movie
    .find({up_uploadtime:{$gte:'2016-05-14 00:00',$lt:'2016-05-15 00:00'},xml:true})
    .limit(20)
    .exec(function(err,movies){
      if(err) console.log(err);
      var i = 0
      var interval =  setInterval(function () {
        i++
        var mid = movies[i].mid
        console.log(mid);

        var title = movies[i].title
        var oxn = title + '.cmt.xml'
        var oxnp = './file/videos/' + oxn
        var parser = new xml2js.Parser()

        fs.readFile(oxnp,function(err,data){
          if(data) {
            parser.parseString(data,function(err,result){
              if(err) console.log(err)
              else if(result && result.i.d){
                var content = result.i.d
                var task = content.length
                console.log(task);

                for(var i = 0; i < task; i++){
                  // console.log(mid + ' : ' +task + ' : ' + i);
                  var msg = content[i]._
                  if(msg) msg = msg.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "")
                  var p = content[i].$.p
                  var chat = new Chat({
                    video_id:mid,
                    msg:msg,
                    p:p,
                    original_flag:'xml'
                  })
                  chat.save(function(err,doc){
                    if(err){console.log(err);}
                  })
                }
              }else console.log('err')
            })
          }else console.log('err: ' + mid)
        })
        if(i >= movies.length-1) clearInterval(interval)
      }, 1000);
    })
}

function downloadFile(ovn,baseurl){
  return new Promise(function(resolve, reject){
    var command = 'you-get  -o ./file/videos -O '+ ovn + ' ' + baseurl
    console.log(command);
    const child = exec(command,function(error,stdout,stderr){
      if(error) reject(Error(et.de))
      else if (stdout) {
        var errFlag = stdout.search(/Error:/)
        if (errFlag !== -1) reject(Error(et.de))
        else {resolve(et.ds)}
      }
    })
  })
}

function transcodeVideo(ovn,tvn){
  return new Promise(function(resolve, reject){
    var command = 'cd file/videos && ffmpeg -i ' + ovn + ' -codec copy ' + tvn +' -y'
    // console.log(command);
    const Transcoding = exec(command,function(error,stdout,stderr){
      if(error) reject(Error(et.te))
      else resolve(et.ts)
    })
  })
}
