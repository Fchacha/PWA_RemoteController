/// https
const fs = require('fs');
const http = require('http');
const https = require('https');
const pKey = fs.readFileSync('./sslcert/server.key', 'utf8');
const cert = fs.readFileSync('./sslcert/server.crt', 'utf8');

/// express
const credentials = { key: pKey, cert: cert };
const express = require('express');
const morgan = require('morgan');
const app = express();

/// websocket
const webSocketServer = require('websocket').server;
const bodyParser = require('body-parser');
const webServerConfig = require('../config/web-server.js');
const { Console } = require('console');

let httpServer;
let httpsServer;

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
        httpServer = http.createServer(app);
        httpsServer = https.createServer(credentials, app);

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
        httpsServer.listen(webServerConfig.sport, err => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`Secure Web server listening on localhost:${webServerConfig.sport}`);

            resolve();
        });

        const wsServer = new webSocketServer({
            httpServer: httpServer
        });
        const wssServer = new webSocketServer({
            httpServer: httpsServer
        });

        const handleMessage = function (userID, message) {
            const msg = JSON.parse(message.utf8Data);

            // create a new room and assign the host to it
            if (msg.type === "host") {
                var roomCode = getUniqueSession();
                sessions.set(roomCode, { host: userID, offer: msg.sdp, members: new Array([userID]) });
                clients[userID].room = roomCode;
                // send back to room code to the host
                this.send(JSON.stringify({ type: 'hostingRoomCode', code: roomCode }));
            }
            // add a guest to the room
            else if (msg.type === "join") {
                if (sessions.has(msg.roomCode)) {
                    sessions.get(msg.roomCode).members.push(userID);
                    clients[userID].room = msg.roomCode;
                    // send the host spd to the new client
                    this.send(JSON.stringify({ type: 'remoteSDP', sdp: sessions.get(msg.roomCode).offer }));
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
                this.send(JSON.stringify({ type: 'error', message: 'unknown message type' }));
            }
        }

        const handleConnection = function (request) {
            var userID = getUniqueID();
            console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
            // You can rewrite this part of the code to accept only the requests from allowed origin
            const connection = request.accept(null, request.origin);
            clients[userID] = { client: connection, room: 1 };
            console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients))

            connection.on('message', handleMessage.bind(connection, userID));

            // handle remove client upon disconnection
            connection.on('close', function (code, desc) {
                console.log(userID, 'disconnected with code', code);
                delete clients[userID];
            });
        }

        wsServer.on('request', handleConnection);
        wssServer.on('request', handleConnection);

        app.options('/*', (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Method", "POST, GET, DELETE");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.setHeader("Access-Control-Max-Age", 600);
            res.end();
        });


        app.get('/', (req, res) => {
            res.statusCode = 200;
            res.end();
        });
    });
}

module.exports.initialise = initialise;

function close() {
    return new Promise((resolve, reject) => {
        httpsServer.close((err) => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

module.exports.close = close;