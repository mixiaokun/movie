var Promise = require('es6-promise').Promise;
var Chat = require('../models/chat')
var Movie = require('../models/movie')
var Comment = require('../models/comment')
var Category = require('../models/category')
const exec = require('child_process').exec;
var fs = require('fs');
var url = require('url');
var path = require('path');
var http = require('http');
var _ = require('underscore')
var xml2js = require('xml2js');
var cheerio = require('cheerio');
var request = require('request');
var builder = require('xmlbuilder')

exports.list = function(req,res){
  var rank = req.query.rank
  if(rank){
    Movie
    .find({})
    .populate('category','name')
    .sort({'year':-1})
    .exec(function(err,movies){
      if(err){console.log(err);}
      res.render('movielist',{
        title:"电影列表",
        movies:movies,
      })
    })
  }else {
    Movie
    .find({})
    .populate('category','name')
    .exec(function(err,movies){
      if(err){console.log(err);}
      res.render('movielist',{
        title:"电影列表",
        movies:movies,
      })
    })
  }
}

exports.detail = function(req, res){
  var id = req.params.id
  if(id.match(/^[0-9a-fA-F]{24}$/)){
    Movie.update({_id:id},{$inc:{pv:1}},function(err){
      if(err){console.log(err);}
    })
    Movie.findById(id, function(err, movie){
      Comment
      .find({movie:id})
      .populate('from','name')
      .populate('reply.from','name')
      .populate('reply.to','name')
      .exec(function(err,comments){
        res.render('detail', {
          title:'详情页',
          movie:movie,
          comments:comments,
        })
      })
    })
  }
}

exports.new = function(req, res){
  Category.find(function(err,categories){
    if(err){console.log(err);}
    res.render('new', {
      title:'数据录入页',
      categories:categories,
      movie:{}
    })
  })
}

exports.update = function(req,res){
  var id = req.params.id
  if (id) {
    Movie.findById(id, function(err, movie) {
      Category.find({}, function(err, categories) {
        res.render('new', {
          title: '后台更新页',
          movie: movie,
          categories: categories
        })
      })
    })
  }
}

exports.categoryfind =function (req,res) {
  var category = req.body.category
  Category.findOne({name:category},function(err,result){
    if(err){console.log(err);}
    if(result){
      res.json({type:0,info:'分类信息已存在',id:result._id})
    }else(
      res.json({type:1,info:'可以新建分类',name:category})
    )
  })
}

exports.save = function(req,res){
  var movieObj = req.body.movie;
  var id = req.body.movie._id;
  var _movie
  if(req.poster){
    movieObj.poster = req.poster
  }
  // 这里一开始只测试了movie的save方法，由于movie/keyin路由最初始都为空
  if(id){
    // update
    Movie.findById(id, function (err, movie){
      if(err){console.log(err);}
      _movie = _.extend(movie, movieObj)
      _movie.save(function(err, movie) {
        if(err){console.log(err);}
        //分类的信息更新时也要做相应的调整
        res.redirect('/')
      })
    })
  }
  else{
    // new
    _movie = new Movie(movieObj)
    // categoryId为从category这个colleciton中获取的值
    var categoryId = movieObj.category//用于直接存储
    var categoryName = movieObj.categoryName//用户新建分类，同时在分类项目下保存新建的电影条目
    _movie.save(function(err, movie) {
      if(err){console.log(err);}
      if (categoryId) {
        Category.findById(categoryId, function(err, category) {
          category.movies.push(movie._id)
          category.save(function(err, category) {
            res.redirect('/movie/' + movie._id)
          })
        })
      }
      else if(categoryName) {
        var category = new Category({
          name:categoryName,
          movies:[movie._id]
        })
        category.save(function(err, category) {
          movie.category = category._id
          movie.save(function(err, movie) {
            res.redirect('/movie/' + movie._id)
          })
        })
      }
    })
  }
}

exports.savePoster = function(req, res, next) {
  var posterData = req.files.uploadPoster
  var filePath = posterData.path
  var originalFilename = posterData.originalFilename

  if (originalFilename) {
    fs.readFile(filePath, function(err, data) {
      var timestamp = Date.now()
      var type = posterData.type.split('/')[1]
      var poster = timestamp + '.' + type
      var newPath = path.join(__dirname, '../../', '/file/images/' + poster)

      fs.writeFile(newPath, data, function(err) {
        // 自定义
        req.poster = poster
        next()
      })
    })
  }
  else {
    next()
  }
}

exports.saveBatch = function(req,res){
  var title =req.body.title
  var doctor =req.body.doctor
  var year =req.body.year
  var country = req.body.country
  var summary = req.body.summary
  var poster =req.body.poster
  var categoryName =req.body.categoryName

  Movie.findOne({title:title},function(err,savdMovie){
    if(err){console.log(err);}
    if(!savdMovie){
      var _movie = new Movie({
        title:title,
        doctor:doctor,
        country:country,
        poster:poster,
        year:year,
        summary:summary
      })

      _movie.save(function(err,movie){
        if(err){console.log(err);}
        Category.findOne({name:categoryName},function(err,category){
          if(err){console.log(err);}
          if(!category){
            var _category = new Category({
              name:categoryName,
              movies:[movie._id]
            });
            _category.save(function(err,category){
              if(err){console.log(err);}
              movie.category = category._id
              movie.save(function(err, movie) {
                res.json({status:200})
              })
            })
          }
          if(category){
            category.movies.push(movie._id)
            category.save(function(err,category){
              if(err){console.log(err);}
            })
            movie.category = category._id
            movie.save(function(err,movie){
              if(err){console.log(err);}
              res.json({status:200})
            })
          }
        })
      })
    }else {
      console.log(title);
      res.json({err:'movie have saved'})
    }
  })
}

exports.fm = function(req,res){
  // http://www.bilibili.tv/list/[stow]-[zone]-[page]-[year1]-[month1]-[day1]~[year2]-[month2]-[day2]-original.html
  res.render('fm',{
    title:"Movie FM"
  })
}

exports.getPlayList = function(req,res){
  var rank = req.body.rank
  var startTime = req.body.startTime
  var endTime = req.body.endTime
  var baseurl = 'http://www.bilibili.tv/list/' + rank + '-20-1-' + startTime + '~' + endTime +'-original.html'
  request(baseurl,function(error,response,body){
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body)
      var items = $('.vd-list').find('li')
      var lists = []
      items.each(function(item){
        var video = $(this).find('div > a')
        var id = video.attr('href').split('/video/')[1].split('/')[0]
        var title = video.attr('title').trim().replace(/[\r\n]/g,"")
        title = title.substring(0,30)
        var item = {id:id,title:title}
        lists.push(item)
      })
      res.json(lists)
    }
  })
}

exports.getBilibiliVideoUrl = function(req,res){
  var mid = req.body.mid
  var pre_flag = req.body.pre_flag
  console.log('mid: ' + mid + ' pre_flag: ' +pre_flag);
  var baseurl = "http://www.bilibili.com/video/" + mid
  const getXmlFileName = exec('you-get -u ' + baseurl, function(error, stdout, stderr){
    if(error){
      console.log('处理视频信息出错');
      res.json({err:mid})
    }
    else if(stderr){
      console.log('读取视频信息出错');
      res.json({err:mid})
    }
    else if(stdout){
      var title = stdout.split('Title:')[1].split('Type')[0].trim()
      var   originalVideoName = mid + ".flv";
      var TranscodedVideoName = mid + ".mp4";
      var originalXmlFileName = title + '.cmt.xml'
      var DBXmlFileName       = mid + '.xml'
      var videoUrl = '/videos/' + TranscodedVideoName
      var xmlUrl   = '/videos/' + DBXmlFileName
      var dirPath = path.dirname(process.argv[1]) + '/file/videos/'
      checkLocalFile(dirPath,TranscodedVideoName).then(function(val){
        console.log('val: ' + val );
        if(val == 1){
          console.log('mp4 file exit');
          checkDbMid(mid).then(function(val){
            if(val == 0){
              console.log('downloading: xml');
              downloadFile(originalVideoName,baseurl).then(function(val){
                saveXmlFileToDB(mid,originalXmlFileName,function(data){
                  if(data === 'ok'){
                    console.log('成功保存xml文件到数据库--success--返回视频和xml文件');
                    saveDBXmlFileToLocal(mid,function(data){
                      if(data === 'ok'){
                        var _movie = new Movie({
                          title:title,
                          mid:mid,
                          video_url:videoUrl
                        })
                        _movie.save(function(err,movie) {
                          if(err){return console.log(err);}
                          res.json({
                            videoUrl : videoUrl,
                            xmlUrl   : xmlUrl
                          })
                        })
                      }else if (data == 'err') {
                        res.json({err:mid})
                      }
                    })
                  }else if(data === 'err'){
                    console.log('保存xml文件到数据库出错--error--只返回视频数据');
                    res.json({videoUrl : videoUrl})
                  }
                })
              },function(val){
                // 异常
                console.log('download err');
                res.json({err:mid})
              })
            }else if (val == 'n') {
              saveDBXmlFileToLocal(mid,function(data){
                res.json({
                  videoUrl:videoUrl,
                  xmlUrl:xmlUrl
                })
              })
            }
          })
        }else if (val == 0) {
          console.log('downloading: mp4 xml');
          downloadFile(originalVideoName,baseurl).then(function(val){
            // 正常
            console.log('download success');
            transcodeVideo(originalVideoName,TranscodedVideoName).then(function(val){
              console.log('transcode success')
              saveXmlFileToDB(mid,originalXmlFileName,function(data){
                if(data === 'ok'){
                  console.log('成功保存xml文件到数据库--success--返回视频和xml文件');
                  saveDBXmlFileToLocal(mid,function(data){
                    if(data === 'ok'){
                      res.json({
                        videoUrl : videoUrl,
                        xmlUrl   : xmlUrl
                      })
                    }
                  })
                }
                else if(data === 'err'){
                  console.log('保存xml文件到数据库出错--error--只返回视频数据--');
                  res.json({videoUrl : videoUrl})
                }
              })
            },function(val){
              console.log('transcode err');
              res.json({err:mid})
            })
          },function(val){
            // 异常
            console.log('download err');
            res.json({err:mid})
          })
        }
      })
    }
  })
}

function checkLocalFile(dirPath,TranscodedVideoName) {
  return new Promise(function(resolve, reject){
    fs.readdir(dirPath,function(err, files){
      var task = files.length
      if (err) {
        console.log(err);
      }else if (task == 0) {
        resolve(0)
      }else{
          files.forEach(function(file){
          fs.stat(dirPath + file, function(err,stats){
            task--
            if(err){console.log(err);}
            else if(stats.isFile()){
              if(file == TranscodedVideoName){
                resolve(1)
              }else if(task == 0) {
                resolve(0)
              }
            }else {
              resolve(0)
            }
          })
        })
      }
    })
  })
}

function checkDbMid(mid){
  return new Promise(function(resolve, reject){
    Chat.find({video_id:mid},function(err,docs){
      if(docs.length == 0){
        console.log('数据库中没有相应的xml数据--重新从bilibili下载视频以及xml数据');
        resolve(0)
      }else {
        console.log('数据库中存在相应数据，正在将数据重新生成xml');
        resolve('n')
      }
    })
  })
}

function downloadFile(TranscodedVideoName,baseurl){
  return new Promise(function(resolve, reject){
    var command = 'you-get  -o ./file/videos -O '+ TranscodedVideoName + ' ' + baseurl
    const child = exec(command,function(error,stdout,stderr){
      if(error){
        console.log(error);
        reject(Error('err'))
      }
      else if (stdout) {
        var errFlag = stdout.search(/Error:/)
        if (errFlag !== -1) {
          console.log(stdout);
          reject(Error('err'))
        }
        else {resolve('ok')}
      }
    })
  })
}

function transcodeVideo(originalVideoName,TranscodedVideoName){
  return new Promise(function(resolve, reject){
    var command = 'cd file/videos && ffmpeg -i ' + originalVideoName + ' -codec copy ' + TranscodedVideoName
    const Transcoding = exec(command,function(error,stdout,stderr){
      if(error){reject(Error('err'))}
      else{resolve('ok')}
    })
  })
}

function saveXmlFileToDB(mid,originalXmlFileName,callback){
  Chat.remove({original_flag:'xml', video_id:mid},function(err,obj){
    if(err){console.log(err);}
    if(obj.result.n == 0){console.log('数据库中不存在该番号的弹幕数据，直接写入新数据');}
    originalXmlFileNameWithPath = './file/videos/' + originalXmlFileName
    var parser = new xml2js.Parser()
    fs.readFile(originalXmlFileNameWithPath,function(err,data){
      parser.parseString(data,function(err,result){
        if(err){
          console.log(err);
          callback('err')
        }
        if(result && result.i.d){
          var content = result.i.d
          var task = content.length
          for(var i = 0; i < content.length; i++){
            task--
            var msg = content[i]._
            if(msg){
              msg = msg.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "")
            }
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
          if(task == 0){
            console.log('xml to json 已保存到数据库');
            callback('ok')
          }
        }else {
          callback('err')
        }
      })
    })
  })
}

function saveDBXmlFileToLocal(mid,callback){
  var xmlHeader = {version:"1.0", encoding:"UTF-8"}
  Chat.find({video_id:mid},function(err,docs){
    var xml = builder.create('i',xmlHeader)
    xml.ele('chatserver','smkuse.com')
    for(var i = 0; i < docs.length; i++){
      var item = xml.ele('d',{'p':docs[i].p},docs[i].msg)
    }
    var xmlstring = xml.end({pretty:true})
    var xmlFilePath = './file/videos/' + mid + '.xml'
    fs.open(xmlFilePath,'w',function(err){
      if(err){
        console.log(err);
        callback('err')
      }
      fs.writeFile(xmlFilePath, xmlstring, function(err){
        if(err){console.log(err);}
        console.log('xml写入本地成功');
        callback('ok')
      })
    })
  })
}

exports.del = function(req, res) {
  var id = req.query.id
  if (id) {
    Movie.remove({_id: id}, function(err, movie) {
      if (err) {
        console.log(err)
        res.json({success: 0})
      }
      else {
        res.json({success: 1})
      }
    })
  }
}

exports.categorylist = function(req,res){
  Category.find({},function(err, categories) {
    if (err) {console.log(err)}
    res.render('category',{
      title:'电影分类列表',
      categories:categories
    })
  })
}

exports.categorysave = function(req,res){
  var name = req.body.newcategory
  Category.findOne({name:name},function(err,category){
    if(err){console.log(err);}
    if(!category){
      category = new Category({name:name})
      category.save(function(err){
        if(err){console.log(err);}
        res.redirect('/category/list')
      })
    }
  })
}
