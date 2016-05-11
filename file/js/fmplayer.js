var playerList = []

$(function(){
  preDo()
  setDate()
  ranklist()
  datepicker()
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

function datepicker(){
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      format: 'yyyy-mm-dd',
      autoclose: true
    });
  });
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
        //- 生成播放列表,同时获取视频播放源，并将下载的视频进行转码
        //- 如果要是能有bilibili的apikey哪里会这么麻烦
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

//- 自动获取列表当中一个视频的播放地址以及对视频进行转码等
//- 因为有两个地方会调用这个函数，所以就直接给了两个参数
function setSource(obj,id){
  if(!id){
    var mid = $(obj).attr('id')
    //- 因为这个是强行点击的呀
    $('#load-player').empty()
    $ajax(mid)
  }
  if(!obj){
    var mid = id;
    $ajax(mid)
  }
}

//- 提交ajax请求
function $ajax(mid){
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

      var errmid = data.err
      if(errmid){
        console.log("err");
        //- 异常处理:获取当前发生错误视频的下一个视频
        var index = playerList.indexOf(errmid)
        playerList = playerList.splice(index,1)//删除错误元素
        $('#' + mid).parent().remove()
        setSource(null,playerList[index+1])

      }else{
        updateListDom(mid)
        danmuplayer(mid)
        changeChatChanel(mid)
        var playingItem = $('#' + mid)
        $('source').attr('src',data.videoUrl)
        $('video').removeClass('hidden')
        playingItem.addClass('list-group-item-success')
        var player = $('video').get(0)
        player.pause()
        player.load()
        player.play()

        preloadFile(playerList[1])
      }
    }
  })
}

// 自动切换弹幕频道
function changeChatChanel(mid){
  var socket = io()
  var $msgbox = $('.msg')
  var info = {}
  info.mid = mid
  info.name = $('.getname').text()
  socket.emit('join',info)
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
    })
  }

  socket.on('new message', function(data){
    displayMsg(data);
  });

  socket.on('whisper',function(data){
    displayWhisper(data)
  })

  socket.on('load old msgs',function(docs){
    for(var i=docs.length-1; i >= 0; i--){
      displayMsg(docs[i]);
    }
  })
}


// 私信自动选择可选择用户
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


// 弹幕播放器处理逻辑
function danmuplayer(mid){

  $('.danmuPlayer').removeClass('hidden')
  $('.btn-group').removeClass('hidden')

  var cm = new CommentManager($('.commentContent').get(0));
  cm.init();
  var tmr = -1;//定时器
  var start = 0;
  var playhead = 0;//当前播放进度
  // 加载弹幕文件 与 获取弹幕文件
  var url = '/videos/' + mid + '.xml'
  $.get(url,function(data,status,xhr){
    if(xhr.status == 200){
      // B站弹幕格式<d p="23.146999359131,1,25,16777215,1461827218,0,80cfd0c4,1797881295">露露真棒</d>
      //                 0							 1 2  3				 4          5 6        7
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

  $('.VideoNext').click(function(){
    console.log('next');
  })

  $('.VideoDanmu').click(function(){
    console.log('danmu');
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
    $('video').addClass('hidden')

    console.log('--end--');
    setSource(null,playerList[1])
    $('.danmuPlayer').addClass('hidden')
    $('.btn-group').addClass('hidden')
  })

  $('video').on('waiting',function(){
    cm.stopTimer();
  })

  $('video').on('playing',function(){
    cm.startTimer();
  })

}

//- 第一次更新dom的时候就可以啊
function updateListDom(mid){
  //- 直接从当前点击的地方进行播放
  var index = playerList.indexOf(mid)
  var list = $('.videolist li a')
  for(var i = 0; i < index; i++){
    playerList[20+i] = $(list[i]).attr('id')
    $('#'+playerList[i]).parent().insertAfter($('#'+playerList[19+i]).parent())
  }
  playerList = playerList.slice(index, 20 + index)
}

// 预处理下一个需要播放的视频
// 如果preloadFile还没有处理完成，但是视频就结束了，开始新的请求，就会出现错误--需要强制结束上一个you-get请求
function preloadFile(mid) {
  $.ajax({
    url:'/movie/getBilibiliVideoUrl',
    type:'post',
    data:{mid:mid,pre_flag:'true'},
    dataType:'json',
    success:function(data){
      var mid = data.err
      // 如果预处理失败:告诉下次播放时不要请求该文件：直接在播放列表中移除失败项目--同时也要移除该dom
      if(data.videoUrl){
        console.log('--预处理成功--');
      }
      else if(mid){
        console.log('--未能正确处理视频信息，跳过该节点--' + $('#' + mid).text() );
        var index = playerList.indexOf(mid)
        playerList = playerList.splice(index,1)//删除错误元素
        $('#' + mid).parent().remove()
      }
    }
  })
}

//- 播放时间展示--playhead:当前视频播放时间 展示是基于秒
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
