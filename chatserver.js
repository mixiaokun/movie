var User = require('./app/models/user')
var Chat = require('./app/models/chat')

module.exports = function(server){
  var io = require('socket.io')(server);
  var userlist = {}
  io.on('connection', function(socket){
    socket.on('join', function(data){
      var name = socket.name = data
      userlist[socket.name] = socket
      socket.broadcast.emit('new message',{msg_from:socket.name,msg:'进入了房间'})
      io.emit('usernames',Object.keys(userlist))
      Chat.find({msg_to:name},function(err,docs){
        socket.emit('load old secmsg',docs)
      })
      Chat.find({},function(err,docs){
        socket.emit('load old msgs',docs)
      })
    })

    socket.on('send message', function(data,callback){
      var msg = data.trim();
      if(msg.substr(0,3) === '/w '){
        msg = msg.substr(3).trim();
        var ind = msg.indexOf(' ');
        if(ind !== -1){
          var name = msg.substring(0, ind);
          var msg = msg.substring(ind + 1);
          if(Object.keys(userlist).indexOf(name) !== -1){
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
            callback('错误！用户不存在！');
          }
        }
      }else{
        var newMsg = new Chat({msg: msg,msg_from: socket.name});
        newMsg.save(function(err){
          if(err){console.log(err);}
          io.emit('new message', {msg: msg,msg_from: socket.name});
        });
      }
    });

    socket.on('disconnect', function(data){
      delete userlist[socket.name]
      io.emit('usernames',Object.keys(userlist))
    });
  });
};
