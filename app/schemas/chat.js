var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var ChatSchema = mongoose.Schema({
  video_id:String,
  // msg_from:{type: ObjectId, ref: 'User'},
  // msg_to:{type: ObjectId, ref: 'User'},
  msg_from:String,
  msg_to:String,
  msg:String,
  read_flag:Boolean,
  whisper_flag:Boolean,
  p:String,
  original_flag:String,
  created:{type: Date,default:Date.now}
})

ChatSchema.statics = {
  sort:function(id,cb){
    return this
      .find({})
      .sort('-created')
      .limit(10)
      .exec(cb)
  }
}

module.exports = ChatSchema
