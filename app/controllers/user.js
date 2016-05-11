var nodemailer = require('nodemailer');
var notp = require('../../notp');
var User = require('../models/user')
var Comment = require('../models/comment')

exports.sign = function(req,res){
  res.render('sign',{title:'登录与注册'})
}

exports.signup = function(req,res){
  var name = req.body.name
  var email = req.body.email
  var password = req.body.password
  var id_token = req.body.id_token
  var image_url = req.body.image_url
  var email_verify_flag = false

  User.findOne({email:email},function(err,user){
    if(err){console.log(err);}
    if(!user){
      if(email.search(/@gmail.com/) !== -1){
        password = id_token
        email_verify_flag = true
      }
      var _user = new User({
        name:name,
        email:email,
        password:password,
        id_token:id_token,
        image_url:image_url,
        email_verify_flag: email_verify_flag
      })
      _user.save(function(err,user){
        if(err){console.log(err);}
        if(user){
          res.json({success:"注册成功，您现在可以登录了。"})
        }else {
          res.json({err:'您的用户名重复！'})
        }
      })
    }else {
      if(user.email.search(/@gmail.com/) !== -1){
        if(user.id_token === id_token){
          req.session.user = user
          res.cookie('name', user.name, {expires: new Date(Date.now() + 10*24*60*60*1000)})
          res.json({success:'成功通过google登录！'})
        }else{
          res.json({err:'请重新刷新页面'})
        }
      }else {
        res.json({err:"输入的邮箱已被注册，您可以选择登录"})
      }
    }
  })
}

exports.signin = function(req,res){
  var email = req.body.email;
  var password = req.body.password;
  var referer = req.body.referer;
  User.findOne({email:email},function(err,user){
    if(err){console.log(err);}
    if(!user){
      return res.json({type:5, err:'请输入注册过的邮箱地址！'})
    }
    var startTimer = new Date(user.password_errtime)
    startTimer = startTimer.getTime()
    var endTimer = Date.now()
    var offset = endTimer-startTimer
    var times = user.password_errtimes
    if(times < 5){
      user.comparePassword(password, user.password, function(err,isMatch){
        if(err){console.log(err);}
        if(isMatch){
          User.update({email:email},{$set:{password_errtimes:0,status:'online'}},function(err,user){
            if(err){console.log(err);}
          })
          req.session.user = user
          res.cookie('name', user.name, {expires: new Date(Date.now() + 10*24*60*60*1000)})
          if(referer){
            res.json({type:1,success:referer})
          }else if(req.headers.referer.search(/sign/) !=  -1){
            res.json({type:0,success:'登录成功'})
          }else {
            res.redirect(req.headers.referer)
          }
        }else {
          user.password_errtimes += 1;
          User.update({email:email},{$set:{password_errtimes:user.password_errtimes}},function(err,user){
            if(err){console.log(err);}
          })
          if(user.password_errtimes == 5){
            user.password_errtime = Date.now()
            User.update({email:email},{$set:{password_errtime:user.password_errtime}},function(err,user){
              if(err){console.log(err);}
            })
            return res.json({type:4, err:'输入密码次数过多，请在30分钟后重试！'})
          }
          res.json({type:2,err:'密码错误，请重试!'+ user.password_errtimes })
        }
      })
    }else if (times == 5 && offset <= 30*60*1000) {
      res.json({type:3, err:'由于您输错了太多次密码，请稍后再试'})
    }else if (times == 5 && offset > 30*60*1000) {
      User.update({email:email},{$set:{password_errtimes:0,password_errtime:new Date('2016/1/1')}},function(err,user){
        if(err){console.log(err);}
      })
      user.comparePassword(password, user.password, function(err,isMatch){
        if(err){console.log(err);}
        if(isMatch){
          req.session.user = user
          res.cookie('name', user.name, {expires: new Date(Date.now() + 10*24*60*60*1000)})
          if(referer){
            res.json({type:1,success:referer})
          }else {
            res.json({type:0,success:'登录成功'})
          }
        }else {
          User.update({email:email},{$set:{password_errtimes:1}},function(err,user){
            if(err){console.log(err);}
          })
          res.json({type:2,err:'密码错误，请重试! 1' })
        }
      })
    }
  })
}

exports.list = function(req,res){
  User.fetch(function(err,users){
    if(err){console.log(err);}
    res.render('userlist',{
      title:"注册用户列表",
      users:users
    })
  })
}

exports.del = function (req,res) {
  var id = req.query.id
  User.remove({_id:id},function(err,user){
    if(err){
      console.log(err);
      res.json({err:0})
    }
    if(user){
      res.json({success:1})
    }
  })
};

exports.signinRequired = function(req,res,next){
  var user = req.session.user
  if(!user){
    return res.redirect('/user/sign')
  }
  next()
}

exports.adminRequired = function(req,res,next){
  var user = req.session.user
  if(user.role <= 1000){
    return res.redirect('/user/sign')
  }
  next()
}

exports.logout = function(req,res){
  delete req.session.user
  res.redirect('/')
}

exports.verify = function(req,res){
  res.render('verify',{title:"验证邮箱"})
}

exports.emailcode = function(req,res){
  var email = req.body.email
  User.findOne({email:email},function(err,user) {
    if(err){console.log(err);}
    if(!user){return res.json({result:'请输入正确的邮箱'})}
    if(user.email_verify_flag){
      return res.json({result:'您的邮箱已被验证过！'})
    }else {
      var K = user._id.toString()
      var token = notp.totp.gen(K)
      var queryurl = 'https://localhost:4000/user/verifyemail?email='+email+'&code='+token
      var smtpConfig = {
        service:'gmail',
        auth: {
          user: 'smkuse@gmail.com',
          pass: 'Cos90=0941026?1'
        }
      };
      var transporter = nodemailer.createTransport(smtpConfig)
      var mailOptions = {
          from: '"tanling" <smkuse@gmail.com>',
          to: email,
          subject: '邮箱验证',
          text: '请不要将这个邮箱地址屏蔽',
          html: '<b>请点击这个链接验证邮箱地址: </b><p>' + queryurl + '</p>'
      };
      transporter.sendMail(mailOptions, function(error, info){
        if(error){  return console.log(error);}
        res.json({result:'已经成功发送验证链接到您的注册邮箱『'+ email +'』'})
      });
    }
  })
}

exports.verifyemail = function(req,res){
  var email = req.query.email
  var code = req.query.code
  User.findOne({email:email},function(err,user){
    if(err){console.log(err);}
    if(user){
      var K = user._id.toString()
      if(notp.totp.verify(code, K)){
        user.email_verify_flag = true
        user.save(function(err,user){
          if(err){console.log(err);}
          res.json({success:'成功验证邮箱'})
        })
      }else {res.json({err:"您输入的TOTP CODE错误"})}
    }else{
      res.json({err:'请不要伪造数据'})
    }
  })
}

exports.forget = function(req,res){
  res.render('forget',{title:"忘记密码"})
}

exports.getcode = function(req,res){
  var email = req.body.email
  User.findOne({email:email},function(err,user) {
    if(err){console.log(err);}
    if(!user){
      return res.json({result:'您输入的邮箱地址有错！'})
    }
    if(user.email_verify_flag){
      var K = user._id.toString()
      var token = notp.totp.gen(K)
      var smtpConfig = {
        service:'gmail',
        auth: {
          user: 'smkuse@gmail.com',
          pass: 'Cos90=0941026?1'
        }
      };
      var transporter = nodemailer.createTransport(smtpConfig)
      var mailOptions = {
          from: '"tanling" <smkuse@gmail.com>',
          to: email,
          subject: '测试项目功能',
          text: 'you can who you are please do no block this eamil',
          html: '<b>您的验证码是: </b><p>' + token + '</p>'
      };
      transporter.sendMail(mailOptions, function(error, info){
        if(error){  return console.log(error);}
        res.json({type:0,result:'验证码已发送到：'+ email })
      });
    }else{
      res.json({type:1,result:'您未验证您的邮箱，暂时不能提供密码修改服务！'})
    }
  })
}

exports.verifycode = function (req,res) {
  var email = req.body.email
  var code = req.body.code
  User.findOne({email:email},function(err,user) {
    if(err){console.log(err);}
    var K = user._id.toString()
    if(notp.totp.verify(code, K)){
      res.json({type:0,result:'验证成功'})
    }else {
      res.json({type:1,result:'输入的验证码有误！'})
    }
  })
}

exports.changepasswd = function(req,res){
  var password = req.body.passwd;
  var email = req.body.email
  User.findOne({email:email},function(err,user){
    if(err){console.log(err);}
    user.genSaltPassword(password,function(err,hash){
      if(err){
        console.log(err);
        res.json({type:1,result:'密码修改失败！'})
      }else if(hash){
        User.update({email:email},{$set:{password:hash,password_errtimes:new Date('2016/1/1'),password_errtimes:0}},function(err,user){
          if(err){console.log(err);}
          res.json({type:0,result:'成功修改密码！'})
        })
      }
    })
  })
}

exports.saveComment = function(req,res){
  var _comment = req.body.comment
  var movieId = _comment.movie
  if(_comment.cid){
    Comment.findById(_comment.cid,function(err,comment){
      var reply = {
        from:_comment.from,
        to:_comment.tid,
        content:_comment.content
      }
      console.log(reply);
      comment.reply.push(reply)
      comment.save(function(err,comment){
        if(err){console.log(err);}
        res.redirect('/movie/' + movieId)
      })
    })
  }else {
    var comment = new Comment(_comment)
    comment.save(function(err,comment){
      if(err){console.log(err);}
      res.redirect('/movie/' + movieId)
    })
  }
}
