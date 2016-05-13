var Promise = require('es6-promise').Promise;
const exec = require('child_process').exec;
var Movie = require('../models/movie')
var request = require('request');
var cheerio = require('cheerio');

exports.bilispider = function (req,res) {
  // 自2016开始-每个月的数据收集一次排行榜数据
  var rank = 'stow'
  var month = new Date().getMonth() + 1
  var year = new Date().getFullYear()
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
                var summary = $(this).find('.v-desc').text()
                console.log(id + ' : ' + title);
                Movie.findOne({mid:id},function(err,movie){
                  if(err){console.log(err);}
                  if(!movie){
                    var biliVideoInfo = new Movie({
                      mid:id,
                      title:title,
                      summary:summary,
                      fake_category:'bili',
                      rank_startTime:startTime,
                      rank_endTime:endTime
                    })
                    biliVideoInfo.save(function(err){
                      if(err){console.log(err);}
                    })
                  }else {
                    console.log(id +' have saved');
                  }
                })
              })
            }
          })
          if(page == pageCount) clearInterval(interval1)
        }, 10000);
      })
      if(c == month) clearInterval(interval)
    },30000)
  }
  res.json({start:'开始'})
};

exports.bilidown = function (req,res) {
  var errlist = []
  Movie.find({rank_startTime:'2016-05-01'},function(err,docs) {
    var task = 0
    var length = docs.length
    var interval = setInterval(function () {
      task++
      var movie = docs[task]
      var baseurl = "http://www.bilibili.com/video/" + movie.mid
      // ovn:originalVideoName,
      // tvn:TranscodedVideoName,
      // oxn:originalXmlFileName
      // vdu:video database url
      var ovn = movie.mid + ".flv";
      var tvn = movie.mid + ".mp4";
      var oxn = movie.title + '.cmt.xml'
      var vdu = '/videos/' + tvn

      downloadFile(tvn,baseurl).then(function(dv){
        // 下载成功 dv:Promise downloadFile return value
        console.log(movie.mid + ' : ' + et.ds);
        transcodeVideo(ovn,tvn).the(function(tv){
          // 转码成功 tv: Promise transcodeVideo return value
          console.log(movie.mid + ' : ' + et.ts);
          movie.update({mid:movie.mid},{$set:{video_url:vdu}},function(err,movieUpdate){
            if(err) console.log(err);
          })
          saveXmlFileToDB(oxn).then(function(xv){
            // xml 保存成功 xml文件数据保存到数据库：xv:Promise saveXmlFileToDB return value
            console.log(movie.mid + ' : ' + et.xs);
          },function(xv){
            // xml 保存失败
            console.log(movie.mid + ' : ' + et.xe);
          })
        },function(tv){
          // 转码失败
          errlist.push(movie.mid)
          console.log(movie.mid + ' : ' + et.te);
        })
      },function(dv){
        // 下载失败
        errlist.push(movie.mid)
        console.log(movie.mid + ' : ' + et.de);
      })
      if(task == length) clearInterval(interval)
    }, 60*1000);
  })
  res.json({'开始下载':'downloading---'})
};


// error type
var et = {
  de:'Download err',
  ds:'Download success',
  te:'Trans Code err',
  ts:'Trans Code success',
  xe:'XML to DB err',
  xs:'XML to DB success'
}

function downloadFile(tvn,baseurl){
  return new Promise(function(resolve, reject){
    var command = 'you-get  -o ./file/videos -O '+ tvn + ' ' + baseurl
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
    var command = 'cd file/videos && ffmpeg -i ' + ovn + ' -codec copy ' + tvn
    const Transcoding = exec(command,function(error,stdout,stderr){
      if(error){reject(Error(et.te))}
      else{resolve(et.ts)}
    })
  })
}

function saveXmlFileToDB(mid,oxn){
  return new Promise(function(resolve, reject) {
    Chat.remove({original_flag:'xml', video_id:mid},function(err,obj){
      if(err){console.log(err);}
      // oxnp : originalXmlFileNameWithPath
      oxnp = './file/videos/' + oxn
      var parser = new xml2js.Parser()
      fs.readFile(oxnp,function(err,data){
        parser.parseString(data,function(err,result){
          if(err) reject(Error(et.xe))
          else if(result && result.i.d){
            var content = result.i.d
            var task = content.length
            for(var i = 0; i < content.length; i++){
              task--
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
            if(task == 0) resolve(et.xs)
          }else reject(Error(et.xe))
        })
      })
    })
  });
}
