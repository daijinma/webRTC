import f from "../../fetch"
import utils from "./utils"
import { BigNumber } from 'bignumber.js';

const EventEmitter2 = require('eventemitter2').EventEmitter2;

const RECONNECT_TIME_RANGE = 10 // 长链建立成功 无消息间隔
const TIMEOUT_BREAK = 10 //主备用线路均失败 重连间隔 
const TIMEOUT_FROZEN = 60; // 防僵死重连 定时

const ROOM_AUTH = "s1-match"; //
const APPLICATIOM_AUTH = "s1-daily"; //

let UNIQ = null;

export default class inyuSocket extends EventEmitter2 {
	constructor({
		room,
		DEBUG = false,
		log = function () { },
		t = '',
		user = "",
		dispatcher = "online.inyuapp.com",
		cluster = ``,
		protocol = "wss"
	} = {}) {
		super()

		let params = {
			room,
			DEBUG,
			log,
			t,
			user,
			dispatcher,
			cluster,
			protocol
		}
		this.ONLINE_TIME_PATH_TIMES = 0;  // 长链err 和 online.dispatch 报错次数 
		this.TIMEOUT_FROZEN_TIMER = 0;  //防僵死重连 定时器 id
		this._connectTimes = 0;  // 连接次数
		this._connecting = false; // 尝试建立连接中状态
		this.reconnectTimeID = null;
		this.cached = []; // 缓冲网络未建立前发送的消息
		this.confirmMsg = {}; // 需要但还未确认的消息
		this._DEBUG = DEBUG;
		this._tempLog = log;
		this.options = Object.assign({}, params)
	}


	connect(_sign) {

		this.log(`初始化长连,请求端口数据`);

		this._fetchSocketUrl()
			.then((res) => {
				if(!res) return 
				let data = res.data
				let servers = data.servers
				this.dispatch = {
					time: data.time,
					sign: data.sign,
				}
				this.servers = servers

				localStorage.setItem("user_uniq", data.uniq)

				this.log(`获取端口数据完成：主线路`, servers[0]);
				this.log(`获取端口数据完成：备用线路`, servers[1]);

				if (this._connecting === true) {
					this.log("weboskcket is connecting!");
				}
				this._connecting = true;

				this.log(`尝试建立连接`);

				this._createWebScoket(_sign);
			})
	}

	_fetchSocketUrl() {
		let op = this.options;
		UNIQ = new BigNumber(localStorage.getItem("user_uniq"));
		let roomS = op.room.toString();
		let cluster = ((roomS == "" || roomS == "0") ? APPLICATIOM_AUTH : ROOM_AUTH)
		let socketUrl = `https://${op.dispatcher}/v1/apply`
		let data = {
			cluster,
			uniq: UNIQ.toString(),
			_plat: "pc_web",
			t: op.t,
			room: op.room
		}

		return f.Vegeta(socketUrl + "?" + utils.serialize(data))
			.then((data) => {
				if (data && data.data && data.data.uniq) {
					this.emit("dispatched", data);
					return data;
				} else {
					throw new Error(data.error);
				}
			})
			.catch((error) => {
				this._onConnectError(error);
			})
	}

	log() {
		let arr = ["[inyuSocket]", ...arguments];
		this._DEBUG && this._tempLog(arr);
	}


	_createWebScoket(_sign) {

		this._connectTimes++;
		this.log(`第${this._connectTimes}次`, '尝试连接主线路:建立长链');
		this._connect(this.servers[0], false, _sign)
			.then((result) => {
				if (!result) return

				this.socket.onclose = (event) => {
					let timeout = parseInt(TIMEOUT_BREAK + 5 * Math.random(), 10)
					this.emit("close");
					this.log("websocket closed", event.code, event.reason);
					// 重新连接必须有一定的间隔
					if (event.code !== 1000) {
						this.reconnectTimeID = setTimeout(() => {
							this.connect();
						}, parseInt(timeout * 1000, 10))
						this.log("[notify]", "websocket closed, reconnect in", timeout + "s");
					} else {
						this.log("[notify]", "websocket closed");
					}
				}

			})
	}

	_connect(url, isBackUp, _sign) {
		let socket = null;
		let that = this;

		return new Promise((resolve, reject) => {
			try {
				socket = new WebSocket(`${that.options.protocol}://${url}/`);
				socket.binaryType = "arraybuffer";
				socket.onerror = (e) => {
					that.log("error", JSON.stringify(e));
					reject(1);
				};
			} catch (e) {
				that.log(e);
				reject(2);
			}
			if (socket) {
				that.socket = socket;
				that._addSocketListener(socket, resolve, _sign);

				/**
				 * 设定一个定时，如果 ${RECONNECT_TIME_RANGE} 秒之后, 没有收到 长链的握手
				 * 也认为是建立长链失败
				*/
				clearTimeout(that.reconnectTimeID);
				that.reconnectTimeID = setTimeout(() => {
					if (socket.readyState === WebSocket.OPEN) {
						that._listenFrozen();
						resolve(socket);
						return;
					}

					that.log("长链认证超时")
					socket.close()
					that.emit("fail", socket.readyState);
					reject(3);
				}, RECONNECT_TIME_RANGE * 1000);
			} else {
				that.emit("fail");
				reject(4);
			}
		})
			.catch(() => {
				if (isBackUp) {
					return Promise.reject()
						.catch(() => {
							that.log(`第${that._connectTimes}次`, '建立长链失败');
							if (that._connectTimes >= 1) {
								this._onConnectError('长链链接失败');
								return false;
							} else {
								that.log('准备下一次连接');
								that.connect();
								return false;
							}
						})
				} else {
					// that.log(`第${that._connectTimes}次`, '尝试连接备用线路:建立长链');
					// return that._connect(that.servers[1], true);
					that.log(`第${that._connectTimes}次`, '尝试连接备用线路:建立长链');
					return that._connect(that.servers[0], true);
				}
			})
	}

	_addSocketListener(socket, resolve, _sign) {
		if (!socket) return;

		let confirmMsg = this.confirmMsg;

		socket.onopen = () => {
			this._connecting = false;
			this._auth();
		}
		socket.onmessage = (e) => {
			var packet = utils.parse(e.data);

			this._listenFrozen();

			switch (packet.command) {
				case utils.COMMAND_AUTH: // 应用协议握手成功
					this.log("<- 认证成功");
					clearTimeout(this.reconnectTimeID);
					this.emit("ready", _sign);
					break;
				case utils.COMMAND_STOP: // 服务端要求停止
					this.log("-> 服务器要求终端长链");
					this.destroy();
					break;
				case utils.COMMAND_PING: // 服务端 PING 客户端
					this.log("<- ping");
					this._pong();
					break;
				case utils.COMMAND_PONG: // 客户端主动 PING 收到回复
					this._pongSuccess();
					break;
				default: // 业务消息
					this.log("message:", packet);
					this.emit("message", packet);
			}
		}
	}

	destroy() {
		clearTimeout(this.TIMEOUT_FROZEN_TIMER);
		if (this.socket) {
			this.socket.close(1000, "CLOSE_NORMAL");
			this.socket = null;

			this._connectTimes = 0;
			this.emit("destroy");
		}
	}

	_pong() {
		this.log("-> pong");
		this.socket.send(utils.pong());
	}

	ping() {
		let that = this
		this.log("-> ping");
		if (this.socket) {
			this.socket.send(utils.ping());
			// 长链认证 超时 ID 用作 ping pong 
			clearTimeout(this.reconnectTimeID);
			this.reconnectTimeID = setTimeout(() => {
				that.log("回响超时, 重新链接")
				that.emit("no_response", that.socket.readyState);
				that.socket.close(1000, "CLOSE_NO_RESPONSE")

				that.socket = null;
				that._connectTimes = 0;
				clearTimeout(that.reconnectTimeID);
				that.connect();

			}, RECONNECT_TIME_RANGE * 1000);
		}


	}

	_pongSuccess() {
		clearTimeout(this.reconnectTimeID);
		this.log("<- pong");
	}

	_listenFrozen() {
		let that = this;
		clearTimeout(this.TIMEOUT_FROZEN_TIMER);
		// 强制重连，防止僵死
		this.TIMEOUT_FROZEN_TIMER = setTimeout(() => {
			that.socket.close(1000, "TIMEOUT_FROZEN")
			that.log("[notify]", 'timeout_frozen ');
			this._onConnectError("TIMEOUT_FROZEN_TIMER")
		}, parseInt(TIMEOUT_FROZEN + 100 * Math.random(), 10) * 1000);
	}

	_auth() {
		this.log('-> 开始认证');
		UNIQ = new BigNumber(localStorage.getItem("user_uniq"));
		this.socket.send(utils.auth(UNIQ, this.options, this.dispatch))
	}

	_onConnectError(sign) {
		let timeout = parseInt(TIMEOUT_BREAK + 5 * Math.random(), 10);

		this.ONLINE_TIME_PATH_TIMES++;
		this.emit("close");
		this.log("websocket closed", "NET_WORK_ERROR", sign);
		clearTimeout(this.TIMEOUT_FROZEN_TIMER);
		if (this.ONLINE_TIME_PATH_TIMES > 10) {
			this.ONLINE_TIME_PATH_TIMES = 0;
			this.log("websocket closed", "NET_WORK_ERROR", "永久关闭");
		} else {
			clearTimeout(this.reconnectTimeID);
			this.reconnectTimeID = setTimeout(() => {
				this.connect(sign);
			}, parseInt(timeout * 1000, 10))
			this.log("[notify]", "websocket closed, reconnect in", timeout + "s");
		}
	}

}