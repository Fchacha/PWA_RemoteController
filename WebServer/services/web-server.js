const http = require('http');
const express = require('express');
const morgan = require('morgan');
const webSocketServer = require('websocket').server;
const bodyParser = require('body-parser');
const webServerConfig = require('../config/web-server.js');

let httpServer;

var clients = {};
var sessions = new Map();

// This code generates unique userid for everyuser.
const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

const getUniqueSession = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4();
};

function initialise() {
    return new Promise((resolve, reject) => {
        const app = express();
        httpServer = http.createServer(app);

        app.use(morgan('combined'));
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());

        httpServer.listen(webServerConfig.port, err => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`Web server listening on localhost:${webServerConfig.port}`);

            resolve();
        });
        const wsServer = new webSocketServer({
            httpServer: httpServer
        });



        wsServer.on('request', (request) => {
            var userID = getUniqueID();
            console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
            // You can rewrite this part of the code to accept only the requests from allowed origin
            const connection = request.accept(null, request.origin);
            clients[userID] = { client: connection, room: 1 };
            console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients))

            connection.on('message', function (message) {
                const msg = JSON.parse(message.utf8Data);

                // create a new room and assign the host to it
                if (msg.type === "host") {
                    var roomCode = getUniqueSession();
                    sessions.set(roomCode, { host: userID, offer: msg.sdp, members: new Array([userID]) });
                    clients[userID].room = roomCode;
                    // send back to room code to the host
                    connection.send(JSON.stringify({ type: 'hostingRoomCode', code: roomCode }));
                }
                // add a guest to the room
                else if (msg.type === "join") {
                    if (sessions.has(msg.roomCode)) {
                        sessions.get(msg.roomCode).members.push(userID);
                        clients[userID].room = msg.roomCode;
                        // send the host spd to the new client
                        connection.send(JSON.stringify({ type: 'remoteSDP', sdp: sessions.get(msg.roomCode).offer }));
                    }
                }
                // give the host the info about the new guest
                else if (msg.type === "answerHost") {
                    if (!clients[userID].room || !sessions.has(clients[userID].room)) {
                        console.log('host or room invalid');
                        return;
                    }
                    // prevent host from aswering himself
                    if (userID === sessions.get(clients[userID].room).host) {
                        return;
                    }
                    console.log('host found');
                    clients[sessions.get(clients[userID].room).host].client.send(JSON.stringify({ type: 'remoteSDP', sdp: msg.sdp }));
                } else {
                    connection.send(JSON.stringify({ type: 'error', message: 'unknown message type' }));
                }
            });
        });

        // app.options('/*', (req, res) => {
        //     res.setHeader("Access-Control-Allow-Origin", "*");
        //     res.setHeader("Access-Control-Allow-Method", "POST, GET, DELETE");
        //     res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        //     res.setHeader("Access-Control-Max-Age", 600);
        //     res.end();
        // });

        // app.get('/', (req, res) => {
        //     res.end('Hello World');
        // });

        // app.post('/start_launcher', (req, res) => {
        //     try {
        //         console.log(req.body.sdp);

        //         var data = req.body.sdp;

        //         var sessionCode = Math.ceil(Math.random() * 10) % 9;
        //         sessions;

        //         res.setHeader("Access-Control-Allow-Origin", "*");
        //         res.status(200).json({ 'launcher_key': sessionCode, });
        //         res.end();
        //     } catch (error) {
        //         res.setHeader("Access-Control-Allow-Origin", "*");
        //         res.status(500);
        //         res.end();
        //     }
        // });

        // app.delete('/close_launcher', (req, res) => {
        //     res.end();
        // });

        // app.post('/join_launcher', (req, res) => {
        //     res.end();
        // });

    });
}

module.exports.initialise = initialise;

function close() {
    return new Promise((resolve, reject) => {
        httpServer.close((err) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

module.exports.close = close;