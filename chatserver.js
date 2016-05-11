var User = require('./app/models/user')
var Chat = require('./app/models/chat')

module.exports = function(server){
  var io = require('socket.io')(server);
  var userlist = {}
  io.on('connection', function(socket){
    socket.on('join', function(data){
      console.log('midOfChat:'+data.mid);
      socket.name = data.name
      socket.chanel = data.mid
      var chanel = data.mid
      userlist[socket.name] = socket

      console.log(Object.keys(userlist));
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
          User.find({name:name,watching:chanel},function(err,user){
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
                socket.emit('whisper', {msg: msg,msg_from:socket.name, msg_to:name});
                for(var i = 0; i < userlist.length; i++){
                  if(name == userlist[i]){
                    userlist[name].emit('whisper', {msg: msg,msg_from:socket.name, msg_to:name});
                  }
                }
              })
            }else {
               callback('错误！user not found！');
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
      delete userlist[socket.name]
      console.log('del----------------------');
      var chanelUsers = []
      User.update({name:socket.name,status:'online'},{$set:{watching:'0000',}},function(err,user){
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
