import React, { Component } from 'react'
import Socket from "../../components/inyuSocket"
import {
  message,
  Button
} from 'antd';
import {BigNumber} from 'bignumber.js';
import f from "../../fetch"
import getCookie from "../../util/getCookie"
import JSONbig from 'json-bigint'

var JSONstrict = JSONbig({ "strict": true });

let room = 1234,
    t = "NDNkMTc0ZTVjNDIwZjI4YzNkYTZhNjBiMzhhNjNmMmZiZjJiMTQ2NSwxNTQ1Mjg2Njc1MTI0";


class remoteVideo extends Component {
  constructor(props) {
    super(props)
  }
  state = {
    uid:""
  }

  componentDidMount() {
    this.video.addEventListener('loadedmetadata', function() {
        console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    });
    
    this.login()
    .then((res)=>{
      this.user = res.data;

      this.setState({
        uid:res.data.info.uid.toString()
      })

      this.socket = new Socket({
        DEBUG:true,
        room,
        user: res.data.info.uid,
        t:res.data.t,
        log: function([main, ...rest]){ 
          console.log.call(this, 
            "%c"+new Date().toLocaleString() + " %c"+main, "color:#bada55" ,"color:red" ,
            ...rest)
        },
      })
  
      this.socket.connect()
      this.socket.on("message", (msg)=>{
        console.log(msg.command)
        if(msg.command == 1001){
          this.start(msg.payload)
        }
      })
  
    })

      
  }


  login(){
    return f.Vegeta('https://ucenter.inyuapp.com/v1/login/auto?t='+t, {
      c:getCookie("c")
    }, "POST")
  }

  async start(data){
    console.log('create connection with remote offer');
    let self = this;
    try {
      this.pc = new RTCPeerConnection(null);

      this.pc.addEventListener('track', function(e){
        console.log('pc viwer got trick');
        if (self.video.srcObject != e.streams[0]) {
          self.pc.addStream(e.streams[0])
          self.video.srcObject = e.streams[0];
          console.log('pc received remote stream');
          console.log('got track', e.track, e.streams);
        }
      });

      this.pc.addEventListener('addstream', function(e){
        console.log('pc onaddstream',e);
        if (e.stream) {
          self.video.srcObject = e.stream;
        }
      });

      await this.pc.setRemoteDescription(new RTCSessionDescription(data))

      console.log('pc createAnswer start');
      await this.createAnswer();

    } catch (e) {
      alert("error in setRemoteDescription")
    }
  
  }
  
  async createAnswer(){
    try {
      const answer = await this.pc.createAnswer();
    
      await this.postLocalAnswer(answer);
      setTimeout(()=>{
        this.pc.setLocalDescription(answer);
      }, 1000)
    } catch (err) {
      console.log(`Failed to create session description: ${error.toString()}`);
    }
  }

  async postLocalAnswer(desc){
    return f.inyufetch("https://janus.inyuapp.com/user?t="+this.user.t, 
    JSONstrict.stringify({
        type: desc.type,
        sdp: desc.sdp,
        uid: this.user.info.uid
      })
    , "POST")
    .then(res=>{
      console.log(`dispatch to server --->`);
      console.log(res)
    })
    .catch((res)=>{
      console.log(res)
    })
  }

  


  render() {
    return (
      <div className="netdata">
        uid:{this.state.uid}
        <br/>
        <video ref={node=> this.video=node} id="localVideo" autoPlay controls ></video>
      </div>
    )
  }
}
export default remoteVideo