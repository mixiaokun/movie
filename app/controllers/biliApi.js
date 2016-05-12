var Movie = require('../models/movie')
var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
var dbUrl = 'mongodb://localhost/movie';
mongoose.connect(dbUrl);

exports.bilispider = function () {
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
                Movie.findOne({mid:mid},function(err,move){
                  if(err){console.log(err);}
                  if(!movie){
                    var biliVideoInfo = new Movie({
                      mid:id,
                      title:title,
                      summary:summary,
                      fake_category:'bili'
                    })
                    biliVideoInfo.save(function(err){
                      if(err){console.log(err);}
                    })
                  }else {
                    console.log(mid +' have saved');
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
};

// exports.bilidown = function () {
//   var errlist = []
//   Movie.find({fake_category:'bili'},function(err,docs) {
//     var length = docs.length
//     // 分成多个线程下载数据
//     var task = 0
//     setInterval(function () {
//       task++
//
//       var child_task = 0
//       var child_Interval(function () {
//         child_task++
//
//         if(child_task == 1000) clearInterval(child_Interval)
//       }, 10);
//
//       if(task)
//     }, 24*60*60*1000);
//   })
// };
