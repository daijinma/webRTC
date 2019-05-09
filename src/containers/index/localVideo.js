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


const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

let room = 1234,
    t = "NDNkMTc0ZTVjNDIwZjI4YzNkYTZhNjBiMzhhNjNmMmZiZjJiMTQ2NSwxNTQ1Mjg2Njc1MTI0";


class localVideo extends Component {
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
        if(msg.command == 1000 && this.pc){
          if(msg.payload.type="answer"){
            this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload))
            .then( ()=> {
              console.log("set  remoteDescription  ok")

              // this.pc.onicecandidate = function(e){
              //   if(e.candidate){
              //     this.addIceCandidate(new RTCIceCandidate(e.candidate));
              //   }
              //   console.log("onicecandidate", e)
              // }
        
        
            })
            .catch((err)=>{
              alert(err.message || err)
            })
          }
          
        }
      })

    })

      
  }


  login(){
    return f.Vegeta('https://ucenter.inyuapp.com/v1/login/auto?t='+t, {
      c:getCookie("c")
    }, "POST")
  }

  async start(){
    console.log('Requesting local stream');
    this.StartDisabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
      console.log('Received local stream');
      this.video.srcObject = stream;
      this.stream = stream;
      this.StartDisabled = false;
    } catch (e) {
      alert(`getUserMedia() error: ${e.name}`);
    }
  
  }

  async createOffer(){
    const localStream = this.stream
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}`);
    }
    if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}`);
    }

    this.pc = new RTCPeerConnection(null);
    localStream.getTracks().forEach(track => this.pc.addTrack(track, localStream));
    console.log('Added local stream to pc');

    

    try {
      console.log('pc createOffer start');
      const offer = await this.pc.createOffer(offerOptions);
      await this.onCreateOfferSuccess(offer);
    } catch (e) {
      onCreateSessionDescriptionError(e);
    }
  
  }

  async onCreateOfferSuccess(desc) {
    try {
      await this.pc.setLocalDescription(desc);
      await this.postLocalOffer(desc)
    } catch (e) {
      alert(e)
    }
  
  }

  async postLocalOffer(desc){
    f.inyufetch("https://janus.inyuapp.com/user?t="+this.user.t, 
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
      <br/>
      <br/>
        <Button id="startButton" onClick={()=>{
          if(!this.StartDisabled){
            this.start()
          }
          
        }}>Start</Button>
        <Button  onClick={()=>{
            this.createOffer()
        }}>创建offer</Button>
        <br/>
        <video ref={node=> this.video=node} id="localVideo" autoPlay ></video>

      </div>
    )
  }
}
export default localVideo