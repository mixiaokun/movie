var Index = require('./app/controllers/index')
var Movie = require('./app/controllers/movie')
var User = require('./app/controllers/user')
var Info = require('./app/controllers/info')
var BiliApi = require('./app/controllers/biliApi')
var multiparty = require('connect-multiparty')
var multipartMiddleware = multiparty();

module.exports = function(app){

  app.get('/', Index.index)
  app.get('/index/results',Index.search)

  app.get('/user/sign', User.sign)
  app.post('/user/signup', User.signup)
  app.post('/user/signin', User.signin)
  app.get('/user/logout', User.logout)
  app.get('/user/list',User.adminRequired,User.list)
  app.delete('/user/list', User.del)

  app.post('/user/comment',User.saveComment)

  app.get('/user/verify',User.signinRequired,User.verify)
  app.post('/user/emailcode',User.emailcode)
  app.get('/user/verifyemail',User.verifyemail)

  app.get('/user/forget',User.forget)
  app.post('/user/getcode',User.getcode)
  app.post('/user/verifycode',User.verifycode)
  app.post('/user/changepasswd',User.changepasswd)

  app.get('/movie/list',User.adminRequired,Movie.list)//电影列表，后台管理
  app.post('/movie/list',User.adminRequired,Movie.list)
  app.get('/movie/new', Movie.new)//新建电影条目
  app.get('/movie/update/:id',Movie.update)//更新电影信息
  app.post('/movie/save',multipartMiddleware,Movie.savePoster,Movie.save)//保存电影信息，以及上传海报
  app.post('/movie/saveBatch',Movie.saveBatch)//批量保存douban数据
  app.delete('/movie/list',Movie.del)//删除电影条目
  app.get('/movie/fm',Movie.fm)
  app.post('/movie/fm',Movie.getPlayList)//获取播放列表
  app.post('/movie/getBilibiliVideoUrl',Movie.getBilibiliVideoUrl)//获取bilibili视频播放地址,同时将下载视频，并将视频转码
  app.get('/movie/:id', Movie.detail)//电影详情页

  app.get('/category/list',Movie.categorylist)//分类列表
  app.post('/category/save',Movie.categorysave)//保存新建电影分类
  app.post('/category/find',Movie.categoryfind)

  app.get('/imooc',Info.imooc)//展示获取到的imooc课程数据
  app.post('/spider/imooc',Info.spiderImooc)//获取某门课程的课程信息,并经行处理
  app.post('/spdier/getlessondata',Info.getLessondata)//获取章节信息
  app.post('/spider/getCookie',Info.getCookie)//获取imooc登录之后的cookie信息
  app.get('/imooc/:id',Info.player)//获取视频信息并进行播放

  app.get('/savebili',User.adminRequired,User.signinRequired,BiliApi.bilispider)
  app.get('/bilidown',BiliApi.bilidown)
}
