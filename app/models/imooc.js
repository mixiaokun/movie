var mongoose = require('mongoose')
var ImoocSchema = require('../schemas/imooc')
var Imooc = mongoose.model('Imooc', ImoocSchema)

module.exports = Imooc
