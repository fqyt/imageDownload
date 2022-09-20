var request = require('request');
var cheerio = require('cheerio');
var url = 'http://image.so.com/i?q=%E7%8C%AB&src=tab_www';

request(url,function(err,res,body){
  if(!err && res.statusCode === 200){
    var $ = cheerio.load(body);
    var imgList = []
    JSON.parse($('script[id="initData"]').html()).list.forEach(function(item){
      imgList.push(item.img)
    });
    console.log(imgList);
  }
});


/*
var http = require("http");
var fs = require("fs");

var server = http.createServer(function(req, res){}).listen(50082);
console.log("http start");

var url = "http://s0.hao123img.com/res/img/logo/logonew.png";
http.get(url, function(res){
  var imgData = "";

  res.setEncoding("binary"); //一定要设置response的编码为binary否则会下载下来的图片打不开


  res.on("data", function(chunk){
    imgData+=chunk;
  });

  res.on("end", function(){
    fs.writeFile("./downImg/logonew.png", imgData, "binary", function(err){
      if(err){
        console.log("down fail");
      }
      console.log("down success");
    });
  });
});*/
