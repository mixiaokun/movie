var mongoose = require('mongoose')

var ImoocSchema = new mongoose.Schema({
  id:Number,
  name:String,
  url:String,
  parent:String,
  meta: {
    createAt: {
      type: Date,
      default: Date.now()
    },
    updateAt: {
      type: Date,
      default: Date.now()
    }
  }
})

ImoocSchema.pre('save',function(next) {

  if (this.isNew) {
  this.meta.createAt = this.meta.updateAt = Date.now()
  }
  else {
    this.meta.updateAt = Date.now()
  }
  next()
})

ImoocSchema.pre('save',function(next){
  if(this.isNew){
    this.meta.createAt = this.meta.updateAt = Date.now();
  }else{
    this.meta.updateAt = Date.now()
  }
  next()
})

// 这里的方法需要model编译之后才会能使用
ImoocSchema.statics = {
  fetch:function(cb){
    return this
      .find({})
      .sort('meta.updateAt')
      .exec(cb)
  },
  findById:function(id,cb){
    return this
      .findOne({_id:id})
      .exec(cb)
  }
}
// debug真是痛苦
module.exports = ImoocSchema
