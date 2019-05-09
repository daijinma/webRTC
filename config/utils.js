// glob是webpack安装时依赖的一个第三方模块，还模块允许你使用 *等符号, 例如lib/*.js就是获取lib文件夹下的所有js后缀名的文件
var glob = require('glob');
const path = require('path');

    // 页面模板
var HtmlWebpackPlugin = require('html-webpack-plugin')
// 取得相应的页面路径，因为之前的配置，所以是src文件夹下的pages文件夹
var PAGE_PATH = path.resolve(__dirname, '../src/pages')
    // 用于做相应的merge处理
var merge = require('webpack-merge')



let _entry = glob.sync(PAGE_PATH + '/*.html')
let entryFiles = [];
_entry.forEach((filePath) => {
    var filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'))
    entryFiles.push({
        key:filename,
        html:filePath,
        js:path.resolve(__dirname, '../src/containers',filename,'index.js'),
    })
})


//多入口配置
// 通过glob模块读取pages文件夹下的所有对应文件夹下的js后缀文件，如果该文件存在
// 那么就作为入口处理
exports.entries = function() {
    var map = {};
    entryFiles.forEach((item) => {
        map[item.key] = [item.js];
    });

    return map
}

//多页面输出配置
// 与上面的多页面入口配置相同，读取pages文件夹下的对应的html后缀文件，然后放入数组中
exports.htmlPlugin = function() {
    let arr = []
    entryFiles.forEach((item) => {
        let filename = item.key;
        let conf = {
            // 模板来源
            template: item.html,
            // 文件名称
            filename: filename + '.html',
            // 页面模板需要加对应的js脚本，如果不加这行则每个页面都会引入所有的js脚本
            chunks: ['manifest', 'vendor', filename],
            inject: true
        }
        if (process.env.NODE_ENV === 'production') {
            conf = merge(conf, {
                minify: {
                    removeComments: false,
                    collapseWhitespace: false,
                    removeRedundantAttributes: false,
                    useShortDoctype: false,
                    removeEmptyAttributes: false,
                    removeStyleLinkTypeAttributes: false,
                    keepClosingSlash: true,
                    minifyJS: false,
                    minifyCSS: false,
                    minifyURLs: false,
                },
            })
        }
        arr.push(new HtmlWebpackPlugin(conf))
    })
    return arr
}
