var server = "https://janus.inyuapp.com/api";
var janus = null;
var streaming = null;
var opaqueId = "streamingtest-"+Janus.randomString(12);
var myusername = "testPlayer";
var bitrateTimer = null;
var spinner = null;
var myroom = null;

var simulcastStarted = false, svcStarted = false;

var selectedStream = null;

var feeds = [];
var feedsSelected = null;
var bitrateTimer = [];
var inited = false;
document.querySelector("#btn").onclick = function() {
    if(inited){
        return 
    }
    inited = true;
    Janus.init({debug: "all", callback: function() {
        if(!Janus.isWebrtcSupported()) {
            alert("No WebRTC support... ");
            return;
        }

        initMyJanus() // 初始化
        .then(attachPlugin) // 注册插件
        .then(()=>{
            // 订阅房间
            let room = document.querySelector("#room").value || "1234"
            subscribeRoom(parseInt(room))
        })

        
        // 订阅流
        document.querySelector("#roomSelector").onclick = (e)=>{
            let id = e.target.getAttribute("data-id")
            let vi = null;

            if(feedsSelected == id){
                return 
            }

            feedsSelected = id;

            for(let i=0; i<feeds.length; i++){
                if(feeds[i].id == id){
                    vi = feeds[i]
                }
            }

            if(vi){
                newRemoteFeed(vi.id, vi.display, vi.audio, vi.video)
            }
        }

    }});

}


function initMyJanus(){
    return new Promise((resolve, reject)=>{
        janus = new Janus({
            server: server,
            success: function() {
                // Attach to streaming plugin
                resolve()
            },
            error: function(error) {
                Janus.error(error);
                // window.location.reload();
            },
            destroyed: function() {
                alert("destroyed")
                // window.location.reload();
            }
        });
    })
}


function attachPlugin(){
    return new Promise((resolve, reject)=>{
        janus.attach(
            {
                plugin: "janus.plugin.videoroom",
                opaqueId: opaqueId,
                success: function(pluginHandle) {
                    streaming = pluginHandle;
                    Janus.log("Plugin attached! (" + streaming.getPlugin() + ", id=" + streaming.getId() + ")");
                    // Setup streaming session
                    resolve()

                },
                error: function(error) {
                    Janus.error("  -- Error attaching plugin... ", error);
                    alert("Error attaching plugin... " + error);
                },
                onmessage: function(msg, jsep) {
                    Janus.debug(" ::: Got a message (publisher) :::");
                    Janus.debug(msg);
                    var event = msg["videoroom"];
                    Janus.debug("Event: " + event);

                    if(event != undefined && event != null) {
                        if(event === "joined") {
                            myid = msg["id"];
                            mypvtid = msg["private_id"];
                            Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                            $("#tips").html("Successfully joined room " + msg["room"] + " with ID " + myid)
                            // publishOwnFeed(true);
                            // Any new feed to attach to?
                        } else if(event === "destroyed") {
                            // The room has been destroyed
                            Janus.warn("The room has been destroyed!");
                            alert("The room has been destroyed");
                        } else if(event === "event") {
                            // Any new feed to attach to?

                            if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                var list = msg["publishers"];
                                Janus.debug("Got a list of available publishers/feeds:");
                                Janus.debug(list);
                                for(var f in list) {

                                    readyToLoad(list[f])
                                    // newRemoteFeed(id, display, audio, video);
                                }
                            } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                                // One of the publishers has gone away?
                                var leaving = msg["leaving"];
                                Janus.log("Publisher left: " + leaving);
                                publisherLeft(leaving)

                            } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                                // One of the publishers has unpublished?
                                var unpublished = msg["unpublished"];
                                Janus.log("Publisher left: " + unpublished);
                                publisherLeft(unpublished)
                                
                            } else if(msg["error"] !== undefined && msg["error"] !== null) {
                                if(msg["error_code"] === 426) {
                                    // This is a "no such room" error: give a more meaningful description
                                    $("#tips").html(
                                        "<p>Apparently room <code>" + myroom + "</code> (the one this demo uses as a test room) " +
                                        "does not exist...</p><p>Do you have an updated <code>janus.plugin.videoroom.cfg</code> " +
                                        "configuration file? If not, make sure you copy the details of room <code>" + myroom + "</code> " +
                                        "from that sample in your current configuration file, then restart Janus and try again."
                                    );
                                } else {
                                    console.log(msg["error"]);
                                }
                            }
                        }
                    }
                    if(jsep !== undefined && jsep !== null) {
                        Janus.debug("Handling SDP as well...");
                        Janus.debug(jsep);
                    }
                },
                onremotestream: function(stream) {
                    Janus.debug(" ::: Got a remote stream :::");
                    Janus.debug(stream);
                },
                oncleanup: function() {
                    Janus.log(" ::: Got a cleanup notification :::");
                    
                    if(bitrateTimer !== null && bitrateTimer !== undefined)
                        clearInterval(bitrateTimer);
                    bitrateTimer = null;
                    simulcastStarted = false;
                }
            });
    })
}


function subscribeRoom(room){
    myroom = room;
    return new Promise((resolve, reject)=>{
        var register = { "request": "join", "room": room, "ptype": "publisher", "display": myusername };
        streaming.send({"message": register});
        resolve()
    })
}


function readyToLoad(item){
    var id = item["id"];
    var display = item["display"];
    var audio = item["audio_codec"];
    var video = item["video_codec"];
    Janus.debug("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");

    feeds.push({
        id:id,
        display:display,
        audio:audio,
        video:video,
    })

    $("#roomSelector").append("<button data-id='"+id+"'>["+id+"]</button>")

    
}


function publisherLeft(id){

    if(feedsSelected == id){
        feedsSelected = null;
    }

    for(let i=0; i<feeds.length; i++){
        if(feeds[i].id == id){
            feeds.splice(i, 1);
            $("#roomSelector button").eq(i).remove()
            
            
        }
    }

}

function newRemoteFeed(id, display, audio, video) {
	// A new feed has been published, create a new plugin handle and attach to it as a subscriber
	var remoteFeed = null;
	janus.attach(
		{
			plugin: "janus.plugin.videoroom",
			opaqueId: opaqueId,
			success: function(pluginHandle) {
				remoteFeed = pluginHandle;
				remoteFeed.simulcastStarted = false;
				Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
				Janus.log("  -- This is a subscriber");
				// We wait for the plugin to send us an offer
				var subscribe = { "request": "join", "room": myroom, "ptype": "subscriber", "feed": id, "private_id": mypvtid };
				// In case you don't want to receive audio, video or data, even if the
				// publisher is sending them, set the 'offer_audio', 'offer_video' or
				// 'offer_data' properties to false (they're true by default), e.g.:
				// 		subscribe["offer_video"] = false;
				// For example, if the publisher is VP8 and this is Safari, let's avoid video
				if(Janus.webRTCAdapter.browserDetails.browser === "safari" &&
						(video === "vp9" || (video === "vp8" && !Janus.safariVp8))) {
					if(video)
						video = video.toUpperCase()
					toastr.warning("Publisher is using " + video + ", but Safari doesn't support it: disabling video");
					subscribe["offer_video"] = false;
				}
				remoteFeed.videoCodec = video;
				remoteFeed.send({"message": subscribe});
			},
			error: function(error) {
				Janus.error("  -- Error attaching plugin...", error);
				bootbox.alert("Error attaching plugin... " + error);
			},
			onmessage: function(msg, jsep) {
				Janus.debug(" ::: Got a message (subscriber) :::");
				Janus.debug(msg);
				var event = msg["videoroom"];
				Janus.debug("Event: " + event);
				if(msg["error"] !== undefined && msg["error"] !== null) {
					alert(msg["error"]);
				} else if(event != undefined && event != null) {
					if(event === "attached") {
						// Subscriber created and attached
                        remoteFeed.rfid = msg["id"];
                        remoteFeed.rfindex = 1;
						remoteFeed.rfdisplay = msg["display"];
                        $("#roomSelector1").html("");
                        Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);

                    } else if(event === "event") {
						// Check if we got an event on a simulcast-related event from this publisher
						var substream = msg["substream"];
						var temporal = msg["temporal"];
						if((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
							if(!remoteFeed.simulcastStarted) {
								remoteFeed.simulcastStarted = true;
								// Add some new buttons
								addSimulcastButtons(remoteFeed.rfindex, remoteFeed.videoCodec === "vp8");
							}
							// We just received notice that there's been a switch, update the buttons
							updateSimulcastButtons(remoteFeed.rfindex, substream, temporal);
						}
					} else {
						// What has just happened?
					}
				}
				if(jsep !== undefined && jsep !== null) {
					Janus.debug("Handling SDP as well...");
					Janus.debug(jsep);
					// Answer and attach
					remoteFeed.createAnswer(
						{
							jsep: jsep,
							// Add data:true here if you want to subscribe to datachannels as well
							// (obviously only works if the publisher offered them in the first place)
							media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
							success: function(jsep) {
								Janus.debug("Got SDP!");
								Janus.debug(jsep);
								var body = { "request": "start", "room": myroom };
								remoteFeed.send({"message": body, "jsep": jsep});
							},
							error: function(error) {
								Janus.error("WebRTC error:", error);
								bootbox.alert("WebRTC error... " + JSON.stringify(error));
							}
						});
				}
			},
			webrtcState: function(on) {
				Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
			},
			onlocalstream: function(stream) {
				// The subscriber stream is recvonly, we don't expect anything here
			},
			onremotestream: function(stream) {
				Janus.debug("Remote feed #" + remoteFeed.rfindex);
				var addButtons = false;
				if($('#remotevideo'+remoteFeed.rfindex).length === 0) {
					addButtons = true;
					// No remote video yet
					$('#videoremote'+remoteFeed.rfindex).append('<video class="rounded centered" id="waitingvideo' + remoteFeed.rfindex + '" width=320 height=240 />');
					$('#videoremote'+remoteFeed.rfindex).append('<video class="rounded centered relative hide" id="remotevideo' + remoteFeed.rfindex + '" width="100%" height="100%" autoplay playsinline/>');
					$('#videoremote'+remoteFeed.rfindex).append(
						'<span class="label label-primary hide" id="curres'+remoteFeed.rfindex+'" style="position: absolute; bottom: 0px; left: 0px; margin: 15px;"></span>' +
						'<span class="label label-info hide" id="curbitrate'+remoteFeed.rfindex+'" style="position: absolute; bottom: 0px; right: 0px; margin: 15px;"></span>');
					// Show the video, hide the spinner and show the resolution when we get a playing event
					$("#remotevideo"+remoteFeed.rfindex).bind("playing", function () {

                        var width = this.videoWidth;
						var height = this.videoHeight;
						$('#curres'+remoteFeed.rfindex).removeClass('hide').text(width+'x'+height).show();
						if(Janus.webRTCAdapter.browserDetails.browser === "firefox") {
							// Firefox Stable has a bug: width and height are not immediately available after a playing
							setTimeout(function() {
								var width = $("#remotevideo"+remoteFeed.rfindex).get(0).videoWidth;
								var height = $("#remotevideo"+remoteFeed.rfindex).get(0).videoHeight;
								$('#curres'+remoteFeed.rfindex).removeClass('hide').text(width+'x'+height).show();
							}, 2000);
						}
					});
				}
				Janus.attachMediaStream($('#remotevideo'+remoteFeed.rfindex).get(0), stream);
				var videoTracks = stream.getVideoTracks();
				if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
					// No remote video
					$('#remotevideo'+remoteFeed.rfindex).hide();
					if($('#videoremote'+remoteFeed.rfindex + ' .no-video-container').length === 0) {
						$('#videoremote'+remoteFeed.rfindex).append(
							'<div class="no-video-container">' +
								'<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
								'<span class="no-video-text">No remote video available</span>' +
							'</div>');
					}
				} else {
					$('#videoremote'+remoteFeed.rfindex+ ' .no-video-container').remove();
					$('#remotevideo'+remoteFeed.rfindex).removeClass('hide').show();
				}
				if(!addButtons)
					return;
				if(Janus.webRTCAdapter.browserDetails.browser === "chrome" || Janus.webRTCAdapter.browserDetails.browser === "firefox" ||
						Janus.webRTCAdapter.browserDetails.browser === "safari") {
					$('#curbitrate'+remoteFeed.rfindex).removeClass('hide').show();
					bitrateTimer[remoteFeed.rfindex] = setInterval(function() {
						// Display updated bitrate, if supported
						var bitrate = remoteFeed.getBitrate();
						$('#curbitrate'+remoteFeed.rfindex).text(bitrate);
						// Check if the resolution changed too
						var width = $("#remotevideo"+remoteFeed.rfindex).get(0).videoWidth;
						var height = $("#remotevideo"+remoteFeed.rfindex).get(0).videoHeight;
						if(width > 0 && height > 0)
							$('#curres'+remoteFeed.rfindex).removeClass('hide').text(width+'x'+height).show();
					}, 1000);
				}
			},
			oncleanup: function() {
				Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
				if(remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
					remoteFeed.spinner.stop();
				remoteFeed.spinner = null;
				$('#remotevideo'+remoteFeed.rfindex).remove();
				$('#waitingvideo'+remoteFeed.rfindex).remove();
				$('#novideo'+remoteFeed.rfindex).remove();
				$('#curbitrate'+remoteFeed.rfindex).remove();
				$('#curres'+remoteFeed.rfindex).remove();
				if(bitrateTimer[remoteFeed.rfindex] !== null && bitrateTimer[remoteFeed.rfindex] !== null)
					clearInterval(bitrateTimer[remoteFeed.rfindex]);
				bitrateTimer[remoteFeed.rfindex] = null;
				remoteFeed.simulcastStarted = false;
				$('#simulcast'+remoteFeed.rfindex).remove();
			}
		});
}
