class SignalingAPI {
    constructor() {
        this.apiUrl = 'localhost:3000/'
        this.client = new WebSocket('ws://localhost:3000');
        this.onRoomCodeReceived;
        this.onRemoteSDPReceived;

        this.client.onopen = () => {
            console.log('WebSocket client Connected');
        };

        this.client.onclose = () => {
            console.log('WebSocket client Disconnected');
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