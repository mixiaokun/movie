var playerList = []

$(function(){

  init()
  initGetList()
  clickGetList()
  autoGetVideo()
  chat()
})

function chat(){
  var socket = io()
  var $msgbox = $('.msg')
  var name = $('.getname').text()
  if(name !== '请登录'){
    socket.emit('join',name)
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
        var msg = $msgbox.val()
        socket.emit('send message', msg, function(data){
          displayError(data)
        })
        $('.msg').val('');
        $('.dropdownUserlist').html('')
      }
    });

    $('.sendmsg').click(function(e){
      e.preventDefault();

      var msg = $msgbox.val()
      socket.emit('send message', msg, function(data){
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

// 展示评论消息
function displayMsg(data){
  var list = $('.danmulist li')
  if(list.length >= 10){
    for (var i = 0; i < list.length-10; i++) {
      list[i].remove()
    }
  }
  // 如果是批量导入的bilibili评论
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


// 初始
function init(){
  // 格式化日期
  var year = new Date().getFullYear()
  var month = new Date().getMonth()
  var date = new Date().getDate()
  month = month + 1
  month = month > 9 ? month : '0' + month
  date = date > 9 ? date : '0' + date
  var startTime = year + '-' + month + '-' + date
  $('.startTime').val(startTime)
  $('.endTime').val(startTime)

  // 初始化日期选择插件
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: 'yyyy-mm-dd',
      autoclose: true
    });
  });

  // 检测用户是否登录：这个并不正确
  // 还是用ajax请求一下用户是否在线
  var name;
  if(Cookies.get('name')){
    name = Cookies.get('name')
    $('.getname').text(name)
  }else{
    console.log('---');
    var html = '<a href=\'/user/sign\'>请登录</>'
    $('.getname').html(html)
  }

  // 用户下拉列表
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

  // 绑定自定义播放器按钮
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

// 初始化播放列表
function initGetList(){
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
        var title = data[i].title.slice(0,32)
        var mid = data[i].mid
        playerList = []
        playerList.push(mid)
        html += "<a class = \"playbtn list-group-item\" id = "+ mid +">" + title + "</a>"
      }
      $('.videolist').html(html)
      clickGetVideo()
    }
  })
}

// 点击获取播放列表
function clickGetList() {
  $('.submitRank').click(function(e){
    e.preventDefault;
    initGetList()
  })
}

// 点击获取视频
function clickGetVideo(mid){
  $('.playbtn').click(function(e){
    e.preventDefault()
    var target = $(this)
    var mid = target.attr('id')
    getVideo(mid)
  })
}

// 视频播放时-视频结束时转跳下一个视频
function autoGetVideo(){
  $('video').on('ended',function(){
    var mid = $('a.list-group-item-success').next().attr('id')
    if(mid){
      getVideo(mid)
    }
  })
}

// ajax 请求电影数据
function getVideo(mid){
  $.ajax({
    url:'/movie/getVideo',
    type:'post',
    data:{mid:mid},
    dataType:'json',
    success:function(data){
      if(data.err){
        console.log(data.err);
      }else if(data.video_url) {
        console.log('success');
        $('a.list-group-item').each(function(){
          $(this).removeClass('list-group-item-success')
        })
        $('#' + mid).addClass('list-group-item-success')
        $('source').attr('src',data.video_url)
        var player = $('video').get(0)
        player.pause()
        player.load()
        player.play()
        danmuplayer(mid)
      }else {
        console.log('数据库中暂时还未同步相应数据');
      }
    }
  })
}

// 加载弹幕播放器
function danmuplayer(mid){
  var cm = new CommentManager($('.commentContent').get(0));
  cm.init();
  cm.clear();
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
    cm.stopTimer();
    cm.clear();
  })

  $('video').on('waiting',function(){
    cm.stopTimer();
  })

  $('video').on('playing',function(){
    cm.startTimer();
  })
}

// 下拉选择用户-自动补全名称
function selectname(obj){
  var target = $(obj)
  var onlineUsername = target.text()
  $('.msg').val('/w ' + onlineUsername)
}

// 格式化输出当前播放时间
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
