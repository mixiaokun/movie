var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId

var MovieSchema = new mongoose.Schema({
    mid:String,
    title:String,
    doctor:String,
    country:String,
    language:String,
    year:Number,
    poster:String,
    page:Number,
    summary:String,
    video_url:String,
    updatetime:String,
    fake_category:String,

    hot:Number,
    damku:Number,
    stow:Number,
    up_id:Number,
    up_name:String,
    up_uploadtime:String,
    xml:Boolean,

    pv: {
      type: Number,
      default: 0
    },
    category: {
      type: ObjectId,
      ref: 'Category'
    },
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

MovieSchema.pre('save',function(next){
  if(this.isNew){
    this.meta.createAt = this.meta.updateAt = Date.now();
  }else{
    this.meta.updateAt = Date.now()
  }
  next()
})

// 这里的方法需要model编译之后才会能使用
MovieSchema.statics = {
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

module.exports = MovieSchema
