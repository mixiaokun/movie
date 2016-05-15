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
    .find({fake_category:{$not:/bili/}})
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
    .find({fake_category:{$not:/bili/}})
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
      res.json({err: title + ' movie have saved'})
    }
  })
}

exports.fm = function(req,res){
  var page = req.query.p || 0
  var count = 20
  var index = page * count
  Movie.find({rank_startTime:'2016-05-01'},function(err,movies){
    if(err) console.log(err);
    var results = movies.slice(index, index + count)
    res.render('fm',{
      title:'FM',
      movies:movies,
      currentPage:(page + 1),
      totalPage:Math.ceil(movies.length / count)
    })
  })
}

exports.getList = function(req,res){
  var p = req.body.p || 0
  var rank = req.body.rank
  var startTime = req.body.startTime
  var endTime = req.body.endTime
  var querystart = startTime + ' 00:00'
  var queryend = endTime + ' 24:00'
  Movie
    .find({up_uploadtime:{$gte:querystart,$lt:queryend},video_url:{$exists:true}})
    .sort({rank:-1})
    .skip(20 * p)
    .limit(20)
    .exec(function(err,movies){
      if(err) console.log(err);
      res.json(movies)
    })
}

// et:error type
var et = {
  a:'Movie not Found',
}

exports.getVideo = function (req,res) {
  var mid = req.body.mid
  var xmlHeader = {version:"1.0", encoding:"UTF-8"}
  Chat.find({video_id:mid},function(err,docs){
    if(docs){
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
        }
        fs.writeFile(xmlFilePath, xmlstring, function(err){
          if(err){console.log(err);}
          console.log('xml写入本地成功');
          var xml = '/videos/' + mid + '.mp4'
          Movie.findOne({mid:mid},function(err,movie){
            if(err) console.log(err)
            if(movie){
              res.json({video_url:movie.video_url})
            }
            else res.json({err:et.a})
          })
        })
      })
    }else {
      Movie.findOne({mid:mid},function(err,movie){
        if(err) console.log(err)
        if(movie) res.json(movie)
        else res.json({err:a})
      })
    }
  })
};

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
