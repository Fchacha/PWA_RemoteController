var conf = { iceServers: [{"urls":"stun:stun.l.google.com:19302"}] };
var pc = new RTCPeerConnection(conf);
console.log(pc);
var localStream, chatEnabled = true, context, source,
    _chatChannel, sendFileDom = {},
    recFileDom = {},
    receiveBuffer = [],
    receivedSize = 0,
    file,
    bytesPrev = 0;

function errHandler(err) {
    console.log(err);
}

// navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
//     localStream = stream;
//     micused.innerHTML = localStream.getAudioTracks()[0].label;
//     pc.addStream(stream);
//     local.srcObject = stream;
//     local.muted = true;
// }).catch(errHandler);

function sendMsg() {
    var text = sendTxt.value;
    chat.innerHTML = chat.innerHTML + "<pre class=sent>" + text + "</pre>";
    _chatChannel.send(text);
    sendTxt.value = "";
    return false;
}

pc.ondatachannel = function(e) {
    if (e.channel.label == "chatChannel") {
        console.log('chatChannel Received -', e);
        _chatChannel = e.channel;
        chatChannel(e.channel);
    }
};

pc.onicecandidate = function(e) {
    var cand = e.candidate;
    if (!cand) {
        console.log('iceGatheringState complete\n', pc.localDescription.sdp);
        localOffer.value = JSON.stringify(pc.localDescription);
    } else {
        console.log(cand.candidate);
    }
}
pc.oniceconnectionstatechange = function() {
    console.log('iceconnectionstatechange: ', pc.iceConnectionState);
}

pc.onaddstream = function(e) {
    console.log('remote onaddstream', e.stream);
    remote.srcObject = e.stream;
}
pc.onconnection = function(e) {
    console.log('onconnection ', e);
}

remoteOfferGot.onclick = function() {
    var _remoteOffer = new RTCSessionDescription(JSON.parse(remoteOffer.value));
    console.log('remoteOffer \n', _remoteOffer);
    pc.setRemoteDescription(_remoteOffer).then(function() {
        console.log('setRemoteDescription ok');
        if (_remoteOffer.type == "offer") {
            pc.createAnswer().then(function(description) {
                console.log('createAnswer 200 ok \n', description);
                pc.setLocalDescription(description).then(function() {}).catch(errHandler);
            }).catch(errHandler);
        }
    }).catch(errHandler);
}
localOfferSet.onclick = function() {
    if (chatEnabled) {
        _chatChannel = pc.createDataChannel('chatChannel');

        chatChannel(_chatChannel);
    }
    pc.createOffer().then(des => {
        console.log('createOffer ok ');
        pc.setLocalDescription(des).then(() => {
            setTimeout(function() {
                if (pc.iceGatheringState == "complete") {
                    console.log('ICE gathering state: complete');
                    return;
                } else {
                    console.log('after GetherTimeout');
                    localOffer.value = JSON.stringify(pc.localDescription);
                }
            }, 2000);
            console.log('setLocalDescription ok');
        }).catch(errHandler);
        // For chat
    }).catch(errHandler);
}

function chatChannel(e) {
    _chatChannel.onopen = function(e) {
        console.log('chat channel is open', e);
    }
    _chatChannel.onmessage = function(e) {
        chat.innerHTML = chat.innerHTML + "<pre class=received>" + e.data + "</pre>"
    }
    _chatChannel.onclose = function() {
        console.log('chat channel closed');
    }
}

function Stats() {
    pc.getStats(null, function(stats) {
        for (var key in stats) {
            var res = stats[key];
            console.log(res.type, res.googActiveConnection);
            if (res.type === 'googCandidatePair' &&
                res.googActiveConnection === 'true') {
                // calculate current bitrate
                var bytesNow = res.bytesReceived;
                console.log('bit rate', (bytesNow - bytesPrev));
                bytesPrev = bytesNow;
            }
        }
    });
}

/* Summary
    //setup your video
    pc = new RTCPeerConnection
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    pc.addStream(stream)

    //prepare your sdp1
    pc.createOffer() - des
    pc.setLocalDescription(des)
    pc.onicecandidate
    pc.localDescription
    
    //create sdp from sdp1
    _remoteOffer = new RTCSessionDescription sdp
    pc.setRemoteDescription(_remoteOffer)
    _remoteOffer.type == "offer" && pc.createAnswer() - desc
    pc.setLocalDescription(description)
    pc.onaddstream
*/