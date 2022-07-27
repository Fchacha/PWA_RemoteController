class SignalingAPI {
    constructor() {
        this.connectionAttempts = 0;
        this.onRoomCodeReceived;
        this.onRemoteSDPReceived;
        // this._setupClient();
    }

    _setupClient() {
        console.log("Try opening WebSocket");
        this.connectionAttempts += 1
        this.client = new WebSocket(SignalingAPI.wss + SignalingAPI.wsUri);

        this.client.onopen = (ev) => {
            console.log('WebSocket client Connected', ev);
            session.classList.remove('hidden');
            session.style.display = 'flexible';
            RTCconnection.style.display = 'block';
            serverSelection.style.display = 'none';
        };

        this.client.onclose = (ev) => {
            console.log('WebSocket client Disconnected', ev);
        };

        this.client.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "hostingRoomCode") {
                if (this.onRoomCodeReceived)
                    this.onRoomCodeReceived(data.code);
            }
            if (data.type === "remoteSDP") {
                if (this.onRemoteSDPReceived)
                    this.onRemoteSDPReceived(data.sdp);
            }
        };
        this.client.onerror = (ev) => {
            RTCconnection.style.display = 'none';
            serverSelection.style.display = 'block';
            var timeout = this.connectionAttempts > 3 ? 60 : 15;
            console.log(`Unable to connect to WebRTC Server retrying in ${timeout}s`);
            window.setTimeout(() => {
                this._setupClient();
            }, 1000 * timeout);
        }
    }

    host(sdp) {
        this.client.send(JSON.stringify({
            type: "host",
            sdp: sdp,
        }));
    }

    join(roomCode) {
        this.client.send(JSON.stringify({
            type: 'join',
            roomCode: roomCode,
        }));
    }

    answerHost(sdp) {
        this.client.send(JSON.stringify({
            type: "answerHost",
            sdp: sdp,
        }));
    }
}

SignalingAPI.wss = 'wss://';
SignalingAPI.wsUri = 'localhost:3002';

changeserver.onclick = () => { SignalingAPI.wsUri = serverURL.value; signaler._setupClient(); };