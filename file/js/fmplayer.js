var playerList = []

$(function(){
  preDo()
  setDate()
  ranklist()
  datePicker()
  dropdownUserlist()
  changeChatChanel('0000')
})

function preDo(){
  var name;
  if(Cookies.get('name')){
    name = Cookies.get('name')
    $('.getname').text(name)
  }else{
    console.log('---');
    var html = '<a href=\'/user/sign\'>请登录</>'
    $('.getname').html(html)
  }
  $('.VideoPlay').click(function(){
    $('video').get(0).play()
  })

  $('.VideoPause').click(function(){
    $('video').get(0).pause()
  })

  $('video').on('timeupdate',function(){
    var currentTime = $('video').get(0).currentTime
    displayTime(currentTime)
  })
}

function setDate(){
  var year = new Date().getFullYear()
  var month = new Date().getMonth()
  var date = new Date().getDate()

  month = month + 1
  month = month > 9 ? month : '0' + month
  date = date > 9 ? date : '0' + date

  var startTime = year + '-' + month + '-' + date
  $('.startTime').val(startTime)
  $('.endTime').val(startTime)
}

function ranklist() {
  $('.submitRank').click(function(e){
    e.preventDefault;
    $.ajax({
      url:'/movie/fm',
      type:'post',
      data:{
        rank:$('.rank').val(),
        startTime:$('.startTime').val(),
        endTime:$('.endTime').val()
      },
      dataType:'json',
      success:function(data){
        var html = ''
        for(var i = 0; i < data.length; i++){
          html += "<li class=\"list-group-item\"> <a onclick=\"setSource(this,null)\" id= "+ data[i].id + ">"+ data[i].title + "</a></li>"
          playerList.push(data[i].id)
        }
        $('.videolist').html(html)
      }
    })
  })
}

function datePicker(){
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: 'yyyy-mm-dd',
      autoclose: true
    });
  });
}

function setSource(obj,id){
  if(!id){
    var mid = $(obj).attr('id')
    $('#load-player').empty()
    if(mid){
      Doajax(mid)
    }
  }else if(!obj){
    var mid = id;
    if(mid){
      Doajax(mid)
    }
  }
}

function Doajax(mid){
  $.ajax({
    url:'/movie/getBilibiliVideoUrl',
    type:'post',
    data:{mid:mid,pre_flag:'false'},
    dataType:'json',
    success:function(data){
      $('.videolist li a').each(function(){
        var active = $(this).attr('class','list-group-item-success')
        if(active){
          $(this).removeClass('list-group-item-success')
        }
      })
      if(data.err){
        var index = playerList.indexOf(mid)
        playerList = playerList.splice(index,1)
        $('#' + mid).parent().remove()
        setSource(null,playerList[index])
      }else{
        var index = playerList.indexOf(mid)
        preloadFile(playerList[index + 1])
        updateListDom(mid)
        danmuplayer(mid)
        changeChatChanel(mid)
        var playingItem = $('#' + mid)
        $('source').attr('src',data.videoUrl)
        playingItem.addClass('list-group-item-success')
        var player = $('video').get(0)
        player.pause()
        player.load()
        player.currentTime = 180
        player.play()
      }
    }
  })
}

function preloadFile(mid) {
  $.ajax({
    url:'/movie/getBilibiliVideoUrl',
    type:'post',
    data:{mid:mid,pre_flag:'true'},
    dataType:'json',
    success:function(data){
      if(data.videoUrl){
        console.log('预处理成功');
      }else if(data.err){
        console.log('未能正确处理视频信息，跳过该节点' + $('#' + mid).text() );
        var index = playerList.indexOf(data.err)
        playerList = playerList.splice(index,1)
        $('#' + mid).parent().remove()
      }
    }
  })
}

function updateListDom(mid){
  var index = playerList.indexOf(mid)
  var length = playerList.length
  var list = $('.videolist li a')
  for(var i = 0; i < index; i++){
    playerList[length + i] = $(list[i]).attr('id')
    $('#' + playerList[i]).parent().insertAfter($('#' + playerList[length-1 + i]).parent())
  }
  playerList = playerList.slice(index, length + index)
}

function dropdownUserlist(){
  $('.msg').on('keyup change', function() {
    var html = ''
    var text = $('.msg').val()
    var userlist = []
    var list = $('.userlist li')
    for (var i = 0; i < list.length; i++) {
      userlist.push($(list[i]).text())
    }
    if(text.substr(0,3) === '/w '){
      for(var j = 0; j < userlist.length; j++){
        html += "<li class = \"list-group-item\" onclick=\"selectname(this)\">" + userlist[j] + "</li>"
      }
      $('.dropdownUserlist').html(html)
    }else{
      $('.dropdownUserlist').html('')
    }
  })
}

function selectname(obj){
  var target = $(obj)
  var onlineUsername = target.text()
  $('.msg').val('/w ' + onlineUsername)
}

function danmuplayer(mid){
  var cm = new CommentManager($('.commentContent').get(0));
  cm.init();
  var tmr = -1;//定时器
  var start = 0;
  var playhead = 0;//当前播放进度
  var url = '/videos/' + mid + '.xml'
  $.get(url,function(data,status,xhr){
    if(xhr.status == 200){
      var tlist = BilibiliParser(xhr.responseXML,xhr.responseText)
      cm.load(tlist)
      cm.startTimer();
      // 同时恢复弹幕
      if(tmr !== -1)
        return
      cm.startTimer();
      tmr = setInterval(function(){
        var currentTime = $('video').get(0).currentTime
        cm.time(Math.floor(currentTime * 1000));;
      },100)
    }
  })

  // 视频播放控制，视频的状态会传递给弹幕播放器，弹幕播放器根据传递的事件控制弹幕的展示效果
  $('.VideoPlay').click(function(){
    $('video').get(0).play()
  })

  $('.VideoPause').click(function(){
    $('video').get(0).pause()
    cm.stopTimer();
    clearInterval(tmr);
    tmr = -1;
  })

  $('video').on('play',function(){
    cm.startTimer();
  })

  $('video').on('timeupdate',function(){
    var currentTime = $('video').get(0).currentTime
    displayTime(currentTime)
  })

  $('video').on('pause',function(){
    cm.stopTimer();
  })

  $('video').on('ended',function(){
    setSource(null,playerList[1])
  })

  $('video').on('waiting',function(){
    cm.stopTimer();
  })

  $('video').on('playing',function(){
    cm.startTimer();
  })
}

function changeChatChanel(mid){
  var socket = io()
  var $msgbox = $('.msg')
  var info = {}
  info.mid = mid
  info.name = $('.getname').text()
  if(info.name !== '请登录'){
    socket.emit('join',info)
  }
  socket.on('usernames', function(data){
    var html = '';
    for(var i=0; i < data.length; i++){
      html += "<li class=\"list-group-item\">" + data[i] + "</li>"
    }
    $('.userlist').html(html);
  });

  if(Cookies.get('name')){
    $('.msg').keypress(function(e) {
      if(e.which == 13) {
        var info = {}
        info.chanel = mid
        info.msg = $msgbox.val()
        socket.emit('send message', info, function(data){
          displayError(data)
        })
        $('.msg').val('');
        $('.dropdownUserlist').html('')
      }
    });

    $('.sendmsg').click(function(e){
      e.preventDefault();
      var info = {}
      info.chanel = mid
      info.msg = $msgbox.val()
      socket.emit('send message', info, function(data){
        displayError(data)
      })
      $('.msg').val('');
      $('.dropdownUserlist').html('')
    })
  }

  socket.on('new message', function(data){
    displayMsg(data);
  });

  socket.on('whisper',function(data){
    displayWhisper(data)
  })

  socket.on('load old msgs',function(docs){
    for(var i = docs.length - 1; i >= 0; i--){
      displayMsg(docs[i]);
    }
  })

  socket.on('load old secmsg',function(docs){
    for(var i = docs.length - 1; i >= 0; i--){
      displayWhisper(docs[i]);
    }
  })
}

function displayMsg(data){
  var list = $('.danmulist li')

  if(list.length >= 10){
    for (var i = 0; i < list.length-10; i++) {
      list[i].remove()
    }
  }

  if(!data.msg_from){
    data.msg_from = 'bili'
  }

  $('<li>').attr({
    class:'list-group-item',
  }).text(data.msg_from + ':'+data.msg)
  .appendTo('.danmulist')
}

function displayError(data){
  $('<li>').attr({class:'list-group-item'}).addClass('err')
  .text('ERR:'+'-'+data)
  .appendTo('.danmulist')
}

function displayWhisper(data){
  $('<li>').attr({class:'list-group-item'}).addClass('whisper')
  .text('SEC:'+ data.msg_from + '发送给'+data.msg_to + "-"+data.msg)
  .appendTo('.danmulist')
}

function displayTime(playhead){
  // 获取当前播放视频的时长
  var duration = $('video').get(0).duration
  var time = Math.floor(playhead);
  // 判断要采取什么样的时间展示格式
  var hour = Math.floor( duration / (60*60))
  var min  = Math.floor((duration - 3600 * hour ) / 60)
  var sec  = Math.floor( duration - 3600 * hour - 60 * min)
  if(hour > 0){
    hour = Math.floor(time / (60*60))
    min  = Math.floor((time - 3600 * hour ) / 60)
    sec  = Math.floor(time - 3600 * hour - 60 * min)
    hourText =  hour > 1 ? hour : 0
    minText  =  min  > 9 ? min  : "0" + min
    secText  =  sec  > 9 ? sec  : "0" + sec
    var timeText = hourText + ":" + minText + ":" + secText
  }else if(min > 0){
    min  = Math.floor((time) / 60)
    sec  = Math.floor(time - 60 * min)
    minText  =  min  > 9 ? min  : "0" + min
    secText  =  sec  > 9 ? sec  : "0" + sec
    var timeText = minText + ":" + secText
  }else{
    sec  = Math.floor(time)
    secText  =  sec  > 9 ? sec  : "0" + sec
    var timeText = secText
  }
  $('.VideoTime').text(timeText)
};
