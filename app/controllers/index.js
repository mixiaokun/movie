var Movie = require('../models/movie')
var Category = require('../models/category')

exports.index = function(req, res) {
  Category
    .find({})
    .populate({
      path: 'movies',
      select: 'title poster',
      options: { limit: 6 }
    })
    .exec(function(err, categories) {
      if (err) {
        console.log(err)
      }
      res.render('index', {
        title:'Home',
        categories: categories
      })
    })
}

exports.search = function (req,res) {
  var count = 6
  var catId = req.query.cat
  var q = req.query.q
  var page = parseInt(req.query.p, 10) || 0
  var index = page * count
  if(catId){
    Category
    .findOne({_id:catId})
    .populate({
      path: 'movies',
      select: 'title poster',
    })
    .exec(function(err, category) {
      if (err) {
        console.log(err)
      }
      var category = category || {}
      var movies = category.movies || []
      var results = movies.slice(index, index + count)
      res.render('results', {
        title:category.name,
        keyword:category.name,
        query:'cat=' + catId,
        currentPage:(page + 1),
        totalPage:Math.ceil(movies.length / count),
        movies: results
      })
    })
  }else if (q) {
    Movie
      // .是另一个元字符，匹配除了换行符以外的任意字符。
      // *同样是元字符，不过它代表的不是字符，也不是位置，而是数量——它指定*前边的内容可以连续重复使用任意次以使整个表达式得到匹配
      .find({title: new RegExp(q + '.*', 'i'),fake_category:{$exists:false}})
      .exec(function(err,movies){
        if(err) console.log(err);
        var results =  movies.slice(index, index + count)
        res.render('results', {
          title:q,
          keyword:q,
          query:'q=' + q,
          currentPage:(page + 1),
          totalPage:Math.ceil(movies.length / count),
          movies: results
        })
      })

  }
};
