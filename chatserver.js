var User = require('./app/models/user')
var Chat = require('./app/models/chat')

module.exports = function(server){
  var io = require('socket.io')(server);
  var userlist = {}
  io.on('connection', function(socket){
    socket.on('join', function(data){
      console.log(data.name + '进入聊天频道:'+data.mid);
      socket.name = data.name
      socket.chanel = data.mid
      var chanel = data.mid
      userlist[socket.name] = socket

      console.log('当前所有在线用户：' + Object.keys(userlist));
      User.update({name:socket.name},{$set:{watching:chanel}},function(err,user){
        if(err){console.log(err);}
        socket.join(chanel)
        socket.broadcast.to(chanel).emit('new message',{msg_from:socket.name,msg:'进入了房间'})
        User.find({watching:chanel,status:'online'},function(err,users){
          if(err){console.log(err);}
          if(users){
            var chanelUsers = []
            for (var i = 0; i < users.length; i++) {
              chanelUsers.push(users[i].name)
              if(i == (users.length - 1)){
                io.in(chanel).emit('usernames',chanelUsers)
              }
            }
          }
        })
      })
      Chat.find({msg_to:socket.name},function(err,docs){
        socket.emit('load old secmsg',docs)
      })
      Chat.find({video_id:chanel},function(err,docs){
        socket.emit('load old msgs',docs)
      })
    })

    socket.on('send message', function(data,callback){
      var msg = data.msg.trim();
      var chanel = data.chanel
      if(msg.substr(0,3) === '/w '){
        msg = msg.substr(3).trim();
        var ind = msg.indexOf(' ');
        if(ind !== -1){
          var name = msg.substring(0, ind);
          var msg = msg.substring(ind + 1);
          User.findOne({name:name,watching:chanel},function(err,user){
            if(err){console.log(err);}
            if(user){
              var newWhsiperMsg = new Chat({
                msg:msg,
                msg_from:socket.name,
                msg_to:name,
                whisper_flag:true,
                read_flag:false,
                original_flag:'comment'
              })
              newWhsiperMsg.save(function(err){
                if(err){console.log(err);}
                if(userlist[name]){
                  userlist[name].emit('whisper', {msg: msg,msg_from:socket.name, msg_to:name});
                  socket.emit('whisper', {msg: msg,msg_from:socket.name, msg_to:name});
                }
              })
            }else {
              console.log(name);
              callback('错误！用户不存在！');
            }
          })
        }
      }else{
        var newMsg = new Chat({video_id:chanel,msg: msg,msg_from: socket.name});
        newMsg.save(function(err){
          if(err){console.log(err);}
          io.in(chanel).emit('new message', {msg: msg,msg_from: socket.name,msg_to:name});
        });
      }
    });

    socket.on('disconnect', function(data){
      socket.leave(socket.chanel)
      console.log('用户离开');
      var chanelUsers = []
      User.update({name:socket.name,status:'online'},{$set:{watching:'',}},function(err,user){
        if(err){console.log(err);}
        User.find({watching:socket.chanel},function(err,users){
          if(err){console.log(err);}
          if(users){
            var chanelUsers = []
            for (var i = 0; i < users.length; i++) {
              chanelUsers.push(users[i].name)
              if(i == (users.length - 1)){
                io.in(socket.chanel).emit('usernames',chanelUsers)
              }
            }
          }
        })
      })
    });
  });
};
