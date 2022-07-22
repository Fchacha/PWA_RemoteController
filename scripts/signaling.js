class SignalingAPI {
    constructor() {
        this.apiUrl = 'http://192.168.16.221:3000/'
        this.client = new WebSocket('ws://192.168.16.221:3000');
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
                sessionCode.innerHTML = '<p/>' + data.code + '<p>';
            }
            if (data.type === "remoteSDP") {
                if (this.onRemoteSDPReceived)
                    this.onRemoteSDPReceived(JSON.parse(data.sdp));
            }
        };
    }

    host(sdp) {

        this.client.send(JSON.stringify({
            type: "host",
            sdp: sdp,
        }));

        // var req = new XMLHttpRequest();
        // req.open('POST', this.apiUrl + 'start_launcher', true);

        // req.setRequestHeader("Content-Type", "application/json");

        // var body = `{"sdp": ${sdp}}`;

        // req.onreadystatechange = function () {
        //     if (this.readyState === XMLHttpRequest.DONE && this.response.ok) {
        //         console.log(this.response);
        //     }
        // }

        // req.send(body);
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