$(function(){
  //- -------------------------------提交评论
  $('.comment').click(function(e) {
    var target = $(this)
    // toID 评论给谁 commentId 回复的是哪一条评论
    var toId = target.data('tid')
    var commentId = target.data('cid')

    // 判断是否已经存在隐藏域
    if ($('#toId').length > 0) {
      $('#toId').val(toId)
    }
    else {
      $('<input>').attr({
        type: 'hidden',
        id: 'toId',
        name: 'comment[tid]',
        value: toId
      }).appendTo('#commentForm')
    }

    if ($('#commentId').length > 0) {
      $('#commentId').val(commentId)
    }
    else {
      $('<input>').attr({
        type: 'hidden',
        id: 'commentId',
        name: 'comment[cid]',
        value: commentId
      }).appendTo('#commentForm')
    }
  })
})
