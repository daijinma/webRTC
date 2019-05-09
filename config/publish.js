var publisher = require('publish-helper')
var path = require('path');
var fs = require('fs');

pass = fs.readFileSync("./.pass", "utf-8")
doUpload(pass)

function doUpload(pass) {

  new publisher({
    src: path.resolve(__dirname, '../output/*.html'),
    dist: path.resolve(__dirname, '../output'),
    iwantcdn: false,
    sourceMappingURL: false,
    chunk: false,
    uploadUrl: "http://fe.inyuapp.com/upload/file?pass=" + pass,
    chunkFilename: '/static/js/[name].chunk.js',
    hostname: function (type, data) { },
    onScand: function (map, next) {
      console.log('onScand');
      next();
    },
    onMoved: function (map, next) {
      console.log('onMoved')
      next();
    },
    onDone: function (map) {
      console.log('onDone')
    },
  });
}

