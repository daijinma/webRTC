// 防止 iframe 劫持
window.pandaRegexp = /(^|\.)panda(\.tv|tv\.com)$/;

(function (){
    if(top != window){
        // panda && 星颜 允许跨域
        try{
            var host = top.location.host;
            if(pandaRegexp.test(top.location.host)){
                return false;
            }
        }catch(e){
            try{
                top.location.href='http://xingyan.panda.tv'
            }catch(e){
                location.href='http://xingyan.panda.tv/proxy.html'
            }
        }
       
        
    }
})()

// 劫持 console

try{
var  _console = window.console;
window.console = (function(){
    var enable = (window._config_env!='online' || location.search.indexOf("log=true")>0);
    if(enable){
        _console && _console.log('log enable')
    }
    var c = {}; c.log = c.warn = c.debug = c.info = c.error = c.time = c.dir = c.profile 
    = c.clear = c.exception = c.trace = c.assert = function(){
        if(enable && _console && _console.log){
            try{
                _console.log.apply(window, arguments)
            }catch(e){
                _console.log(arguments)
            }
        }
    };
    return c;
})();
}catch(e){}
