"use strict"

const fs = require('fs');

console.log('Starting ɱail');

const config = require(__dirname + '/config/config.json');

try {
    fs.accessSync(config.attachmentDir, fs.constants.W_OK | fs.constants.R_OK);
} catch (err) {
    console.error("Can't write on attachemnt folder");
    console.error("Defined in config.json, \"attachmentDir\"");
    console.error("Current value:", config.attachmentDir);
    process.exit(1);
}

const smtpServer = require(__dirname + '/modules/SmtpServer.js');
smtpServer.createServer(config.smtpPort, config.smtpMaxSizeKo, config.cert);

const webServer = require(__dirname + '/modules/WebServer.js');

const model = require(__dirname + '/model/model.js');
model.connect(config.mongoDbUrl);

webServer
        .createServer(
            config.httpPort, 
            config.cert,
            require('./router.js')(config, model), 
            require('./controller/websocketController.js')(model)
        ).catch((e) => {
            console.log(e);
            process.exit(1);
        });

let messageNumber = 0;

smtpServer.onMailReceived((mail) => {
    console.log(mail);
    model.getModel('Mail').saveMail(mail).then((mail) => {

        webServer.broadcast({
            type: 'mailReceived',
            payload: {
                mail: mail
            }
        })
    }).catch((err) => {
        console.log('Error while accepting mail: ', err);
    });
});




