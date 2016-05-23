var mongoose = require('mongoose')
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10

var UserSchema = new mongoose.Schema({
    name:String,
    image_url:String,
    email:{
      unique:true,
      type:String
    },
    email_verify_flag:Boolean,
    id_token:String,
    password:String,
    password_errtimes:{
      type:Number,
      default:0
    },
    password_errtime:{
      type: Date,
      default:new Date('2016/1/1')
    },
    role: {
      type: Number,
      default:0
    },
    status:{
      type:String,
      default:'offline'
    },
    watching:String,
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

UserSchema.pre('save',function(next){

  var user = this
  if(this.isNew){
    this.meta.createAt = this.meta.updateAt = Date.now();
  }else{
    this.meta.updateAt = Date.now()
  }

  bcrypt.genSalt(SALT_WORK_FACTOR,function(err,salt){
    if(err) return next(err)
    bcrypt.hash(user.password,salt,function(err,hash){
      if(err) return next(err)
      user.password = hash
      next()
    })
  })
})

// 实例方法：实例化这个对象之后可以调用 new...
// 静态方法：模型直接可以调用
UserSchema.methods = {
  comparePassword:function(_password, hash, cb){
    bcrypt.compare(_password, hash, function(err, isMatch){
      if(err) return cb(err)
      cb(null,isMatch)
    })
  },
  genSaltPassword:function(password,cb){
    bcrypt.genSalt(SALT_WORK_FACTOR,function(err,salt){
      if(err) console.log(err);
      bcrypt.hash(password,salt,function(err,hash){
        if(err) console.log(err);
        cb(null,hash);
      })
    })
  }
}

UserSchema.statics = {
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

module.exports = UserSchema
