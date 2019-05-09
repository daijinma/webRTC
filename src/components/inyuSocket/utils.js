import {BigNumber} from 'bignumber.js';
import JSONbig from 'json-bigint'

var JSONstrict = JSONbig({"strict": true});


let COMMAND_AUTH = 0x0001;
let COMMAND_STOP = 0x0002;
let COMMAND_PING = 0x0003;
let COMMAND_PONG = 0x0004;

export default {
    COMMAND_AUTH,
    COMMAND_STOP,
    COMMAND_PING,
    COMMAND_PONG,
    serialize,
    parse,
    auth,
    ping,
    pong,
    buffer
}

/**
 * json 序列化
*/
function serialize(data) {
    var encoded = ""
    for (var name in data) {
        encoded += name + "=" + encodeURIComponent(data[name]) + "&"
    }
    return encoded
}


/**
 * parse to ArrarBuffer
* // 读取解析二进制包
*/
function parse(data) {
    let offset = 0,
        object = {},
        id = "0x",
        expire = "0x",
        get;

    get = new Uint8Array(data, offset, 4);
    object.version = get[0]; offset += 1;// version
    object.opcode = get[1]; offset += 1;
    object.priority = get[2]; offset += 1;
    /*object.resv = get[3]; */offset += 1; // resv;
    get = new Uint16Array(data, offset, 2);
    object.command = get[0]; offset += 2;
    object.length = get[1]; offset += 2;
    
    get = new Uint8Array(data, offset, 16);
    for(let i=0;i<8;++i) {
        id += get[7 - i].toString(16).padStart(2,'0');
    }
    offset += 8;
    object.id = new BigNumber(id);
    for(let i=0;i<8;++i) {
        expire += get[15 - i].toString().padStart(2, '0');
    }
    offset += 8;
    object.expire = new BigNumber(expire);
    get = new Uint8Array(data, offset);
    let dec = new TextDecoder(),
    strPlayload = dec.decode(get);
    object.payload = strPlayload.length>10?JSONstrict.parse(strPlayload):strPlayload

    return Object.freeze(object);
}


/**
 * auth 认证字符串
*/
function auth(uniq, option, dispatch) {
    let data = {
        uniq: uniq,
        user: option.user,
        room: option.room,
        time: dispatch.time,
        digest: dispatch.sign
    }

    return buffer(0, COMMAND_AUTH, 0, new BigNumber(0), new BigNumber(0), JSONstrict.stringify(data))
}

function ping() {
    let ti = Date.now().toString();

    console.log()
    return buffer(0, COMMAND_PING, 0, new BigNumber(ti), 0, null)
}

function pong() {
    return buffer(0, COMMAND_PONG, 0, 0, 0, null)
}

/**
 * buffer
 * // 生成构建二进制包
*/
function buffer(opcode, command, priority, id, expire, payload) {
    if(typeof(opcode) !== "number") {
        opcode = parseInt(opcode);
    }
    if(isNaN(opcode)) {
        opcode = 0;
    }
    if(typeof(command) !== "number") {
        command = parseInt(command);
    }
    if(isNaN(command)) throw Error("[WebSocket] 非法命令");
    if(typeof(priority) != "number") {
        priority = parseInt(priority);
    }
    if(isNaN(priority)) {
        priority = 0;
    }
    if(id && !(id instanceof BigNumber)) {
        throw Error("[WebSocket] 非法ID");
    }
    if(expire && !(expire instanceof BigNumber)) {
        throw Error("[WebSocket] 非法ID");
    }
    if(payload === null) {
        payload = "";
    }else if(typeof(payload) === "object") {
        payload = JSON.stringify(payload);
    }
    let body = (new TextEncoder()).encode(payload),
        data = new ArrayBuffer(24 + body.byteLength),
        offset = 0,
        set;

    set = new Uint8Array(data, offset, 4);
    set[0] = 0x01; offset += 1;// version
    set[1] = opcode; offset += 1;
    set[2] = priority; offset += 1;
    set[3] = 0x00; offset += 1; // resv;
    set = new Uint16Array(data, offset, 2);
    set[0] = command; offset += 2;
    set[1] = body.byteLength; offset += 2;
    
    set = new Uint8Array(data, offset, 16 + body.byteLength);
    id = id.toString(16).padStart(16, '0');
    for(let i=0;i<id.length;i+=2) {
        set[7 - i/2] = parseInt(id.substr(i, 2), 16);
    }
    expire = expire.toString(16).padStart(16, '0');
    for(let i=0;i<expire.length;i+=2) {
        set[15 - i/2] = parseInt(expire.substr(i, 2), 16);
    }
    for(let i=0;i<body.byteLength;++i) {
        set[16 + i] = body[i];
    }

    return data;
}
