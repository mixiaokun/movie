# node-movie

      ##1   基于+参考 www.imooc.com/learn/74 438 node+mongodb建站
      ##2   bilibili api 
            https://www.smkuse.info/movie/fm 实现需要的功能
            a
            www.bilibili.com/list/stow-20-1-2016-01-01~2016-01-30-original.html 
            获取排行数据--评论、弹幕和观看数
            存入mongodb title mid summary hot damku stow
            通过you-get 获取视频数据：.flv .xml,下载会出现各样的异常
            后面视频播放地址数据录入通过检查本地.flv->.mp4 以及.xml文件
            有相应的数据就去更新数据的video_url和xml_flag
            解析xml数据->保存到数据库
      
      ##3   模拟登陆imooc,课程信息和视频播放信息
            https://www.smkuse.info/imooc
