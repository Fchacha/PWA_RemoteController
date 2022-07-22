var conf = { iceServers: [{ "urls": "stun:stun.l.google.com:19302" }] };
var pc = new RTCPeerConnection(conf);
var signaler = new SignalingAPI();
var localStream, chatEnabled = true, context, source, hosting = false,
    _chatChannel,
    bytesPrev = 0;

function errHandler(err) {
    console.log(err);
}

/**
 * 
 * @param {string} txt 
 * @param {boolean} fromMe 
 */
function AddMsgToChat(txt, fromMe) {
    chat.innerHTML = chat.innerHTML + `<p class="${fromMe ? 'sent' : 'received'}">${txt}</p>`;

}

function sendMsg() {
    var text = sendTxt.value;
    _chatChannel.send(text);
    AddMsgToChat(text, true)
    sendTxt.value = "";
    return false;
}

pc.ondatachannel = function (e) {
    if (e.channel.label == "chatChannel") {
        console.log('chatChannel Received -', e);
        _chatChannel = e.channel;
        chatChannel(e.channel);
    }
};

pc.onicecandidate = function (e) {
    var cand = e.candidate;
    if (!cand) {
        console.log('iceGatheringState complete\n', pc.localDescription.sdp);
        // answer the host after ice gather has finished
        if (!hosting) {
            signaler.answerHost(JSON.stringify(pc.localDescription));
        }
    } else {
        console.log(cand.candidate);
    }
}

pc.oniceconnectionstatechange = function () {
    console.log('iceconnectionstatechange: ', pc.iceConnectionState);
}

pc.onaddstream = function (e) {
    console.log('remote onaddstream', e.stream);
    remote.srcObject = e.stream;
}
pc.onconnection = function (e) {
    console.log('onconnection ', e);
}

signaler.onRemoteSDPReceived = (sdp) => {
    var _remoteOffer = new RTCSessionDescription(JSON.parse(sdp));

    pc.setRemoteDescription(_remoteOffer).then(function () {
        console.log('setRemoteDescription ok');
        if (_remoteOffer.type == "offer") {
            pc.createAnswer().then(function (description) {
                console.log('createAnswer 200 ok \n', description);
                pc.setLocalDescription(description).then(function () {
                }).catch(errHandler);
            }).catch(errHandler);
        }
    }).catch(err => console.log(err));
};

signaler.onRoomCodeReceived = (code) => { sessionCode.innerHTML = '<p/>' + code + '<p>' };


JoinSession.onclick = function () {
    host.style.display = "none";
    guest.style.display = "none";
    
    // send room code to server
    signaler.join(remoteOffer.value);
}

HostSession.onclick = function () {
    hosting = true;

    host.style.display = "none";
    guest.style.display = "none";

    if (chatEnabled) {
        _chatChannel = pc.createDataChannel('chatChannel');
        chatChannel(_chatChannel);
    }

    pc.createOffer().then(des => {
        console.log('createOffer ok ');
        pc.setLocalDescription(des).then(() => {
            setTimeout(function () {
                if (pc.iceGatheringState == "complete") {
                    console.log('ICE gathering state: complete');
                    return;
                }
            }, 2000);
            console.log('setLocalDescription ok');
            signaler.host(JSON.stringify(pc.localDescription));
        }).catch(errHandler);
        // For chat
    }).catch(errHandler);
}

function chatChannel(e) {
    _chatChannel.onopen = function (e) {
        console.log('chat channel is open', e);
    }
    _chatChannel.onmessage = function (e) {
        AddMsgToChat(e.data, false);
    }
    _chatChannel.onclose = function () {
        console.log('chat channel closed');
    }
}

function Stats() {
    pc.getStats(null, function (stats) {
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