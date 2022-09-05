var conf = { iceServers: [{ "urls": "stun:stun.l.google.com:19302" }] };
var pc = new RTCPeerConnection(conf);
var signaler = new SignalingAPI();
var localStream, chatEnabled = true,
    context, source, hosting = false,
    _chatChannel, _inputChannel,
    bytesPrev = 0;
const INPUT_CHANNEL_KEY = 'inputChannel';
const CHAT_CHANNEL_KEY = 'chatChannel';
var remoteInputHandle = function (input) { console.log('[REMOTE INPUT]', input); };
/// Session
{
    function joinLauncher(roomCode) {
        host.style.display = "none";
        guest.style.display = "none";
        scanview.style.display = "none";
        session.style.display = "none"

        console.log("\'" + roomCode + "\'");

        // send room code to server
        signaler.join(roomCode);
    }

    function hostLauncher() {
        // create data channels
        if (chatEnabled) {
            _chatChannel = pc.createDataChannel(CHAT_CHANNEL_KEY);
            chatChannel(_chatChannel);
        }
        _inputChannel = pc.createDataChannel(INPUT_CHANNEL_KEY);
        inputChannel(_inputChannel);

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
}

/// Handles
{
    function errHandler(err) {
        console.log(err);
    }

    function roomCodeReceivedHandle(code) {
        sessionCode.innerHTML = code;
        hosting = true;
        host.style.display = "none";
        guest.style.display = "none";
        hostRoomCode.style.display = ""
        console.log('room code: ', code);
        var qrcode = new QRCode(document.getElementById("room_qrcode"), {
            width: room_qrcode.clientWidth,
            height: room_qrcode.clientHeight,
        });
        qrcode.makeCode(code);
    }

    function remoteSDPReceivedHandle(sdp) {
        var _remoteOffer = new RTCSessionDescription(JSON.parse(sdp));

        pc.setRemoteDescription(_remoteOffer).then(function () {
            console.log('setRemoteDescription ok');
            if (_remoteOffer.type == "offer") {
                pc.createAnswer().then(function (description) {
                    console.log('createAnswer 200 ok \n', description);
                    pc.setLocalDescription(description).then(function () { }).catch(errHandler);
                }).catch(errHandler);
            }
        }).catch(err => console.log(err));
    }
}

/// Channels
{
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

    function inputChannel(e) {
        _inputChannel.onopen = function (e) {
            console.log('input channel is open', e);
        }
        _inputChannel.onmessage = function (e) {
            //TODO pass to input manager
            remoteInputHandle(e.data);
        }
        _inputChannel.onclose = function () {
            console.log('input channel closed');
        }
    }

    /**
     * Adds a message to the chat box
     * @param {string} txt 
     * @param {boolean} fromMe 
     */
    function AddMsgToChat(txt, fromMe) {
        chatMsgs.innerHTML = chatMsgs.innerHTML + `<li class="${fromMe ? 'sent' : 'received'}">${txt}</li>`;

    }

    function sendMsg() {
        var text = sendTxt.value;
        _chatChannel.send(text);
        AddMsgToChat(text, true)
        sendTxt.value = "";
        return false;
    }

    function sendInput(inputKey) {
        var input = inputKey;
        console.log('send', input);
        _inputChannel.send(input);
        return false;
    }
}

/// Setup peer connection and signaler
{
    /// Peer Connection
    pc.ondatachannel = function (e) {
        if (e.channel.label == INPUT_CHANNEL_KEY) {
            console.log(`${INPUT_CHANNEL_KEY} Received -`, e);
            _inputChannel = e.channel;
            inputChannel(e.channel);
        }
        if (e.channel.label == CHAT_CHANNEL_KEY) {
            console.log(`${CHAT_CHANNEL_KEY} Received -`, e);
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

    pc.ontrack = function (e) {
        console.log('remote onaddstream', e.stream);
        remote.srcObject = e.stream;
    }
    pc.onconnection = function (e) {
        console.log('onconnection ', e);
    }

    /// Signaler
    signaler.onRoomCodeReceived = roomCodeReceivedHandle;

    signaler.onRemoteSDPReceived = remoteSDPReceivedHandle;
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

HostSession.onclick = hostLauncher;
JoinSession.onclick = function () {
    remoteController.classList.remove('hidden');
    remoteController.style.display = '';
    joinLauncher(remoteOffer.value);
};
ScanQR.onclick = function () {
    import('./libs/QRSCANNERJS/qr-scanner.min.js').then((module) => {
        const QrScanner = module.default;

        const qrScanner = new QrScanner(
            scanview,
            result => {
                console.log('decoded QR code:', result);
                remoteController.classList.remove('hidden');
                remoteController.style.display = '';
                joinLauncher(result.data);
                qrScanner.stop();
            },
            {});
        qrScanner.start();
    });
};

navBtn_up.onclick = function () { sendInput(12); };
navBtn_down.onclick = function () { sendInput(13); };
navBtn_left.onclick = function () { sendInput(14); };
navBtn_right.onclick = function () { sendInput(15); };
navBtn_enter.onclick = function () { sendInput(0); };
navBtn_back.onclick = function () { sendInput(1); };
navBtn_more.onclick = function () { sendInput(9); };