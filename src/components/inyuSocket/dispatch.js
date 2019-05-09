const EventEmitter2 = require('eventemitter2').EventEmitter2;

class dispatch extends EventEmitter2 {
	constructor() {
		super()
	}

	onAllArray = []

	dOn(message) {
		if (message && message.command) {
			this.emit('cmd' + message.command, message.payload)
		} else {
			console.log('no cmd ws', message);
		}
	}

	onAll(event, fun){
		this.onAllArray.push({
			event, 
			fun,
		})
		this.on(event, fun);
	}
	
	removeAll(){
		console.log('游戏重启: 重载长链事件绑定');
		this.removeAllListeners()
		this.onAllArray.forEach(({event, fun})=>{
			this.on(event, fun);
		})
	}
}

const dispatcher =  new dispatch()


export default dispatcher