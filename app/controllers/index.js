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
        categories: categories
      })
    })
}
