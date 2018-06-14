"use strict"

const WebSocket = require('ws');
const SocketServer = WebSocket.Server;
const express = require('express');

let wss = null;

module.exports.createServer = function (httpPort, cert, routing, onWsClient) {
    return new Promise((resolve, reject) => {
        try {
            const app = express();


            /*
             app.use(function (req, res, next) {
             res.header("Access-Control-Allow-Origin", "*");
             res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
             next();
             });
             */
            app.use('/', express.static(__dirname + '/../public'));

            routing(app);



            console.log('HTTP Listen on port', httpPort);

            let server;
            if (cert) {
                const https = require('https');
                const fs = require('fs');


                var options = {
                    key: fs.readFileSync(cert.key),
                    cert: fs.readFileSync(cert.cert),
                    requestCert: false,
                    rejectUnauthorized: false
                };
                server = https.createServer(options, app);
                console.log('HTTPS');
            } else {
                server = app.listen(httpPort);
                console.log('HTTP');
            }

            server.listen(httpPort, function() {
                console.log( 'Express server listening on port ' + server.address().port );
            });
            
            wss = new SocketServer({server});

            wss.on('connection', (ws) => {
                onWsClient(ws, wss.broadcast)
            });

            wss.broadcast = (data) => {
                let clientCount = 0;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        clientCount++;
                        client.send(JSON.stringify(data));
                    }
                });
                console.log('Broadcast to ' + clientCount + ' clients');
            };

            resolve();
        } catch (e) {
            console.error('Error in WebServer creation', e);
            reject();
        }
    });
}

module.exports.broadcast = (data) => {
    if (wss) {
        wss.broadcast(data);
    } else {
        throw "Websocket is not ready";
    }
}