"use strict"

//Fix pour envoie des mails
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
smtpServer.createServer(config.smtpPort, config.smtpMaxSizeKo, config.certTls);

const webServer = require(__dirname + '/modules/WebServer.js');

let model = "";
let connectParam = "";

if (config.db == "mongodb") {
    model = require(__dirname + '/model/model.js');
} else if (config.db == "nedb") {
    model = require(__dirname + '/model/nedb.js');
}

model.connect(config.dbPath, {
    useNewUrlParser: true
}).then(() => {
    model.startPruneMonitor(config.pruneDays, (mailsId) => {
        webServer.broadcast({
            type: 'deleted',
            payload: mailsId
        })
    });

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

    smtpServer.onMailReceived((mail) => {
        model.getModel('Mail').saveMail(mail).then((mail) => {
            webServer.broadcast({
                type: 'mailReceived',
                payload: {
                    mail: mail
                }
            }, function (ws, user) {
                if (ws.forceChannel) {
                    if (ws.forceChannel == user) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    if (ws.blacklist.includes(user)) {
                        return false;
                    } else {
                        return true;
                    }
                }
            })
        }).catch((err) => {
            console.log('Error while accepting mail: ', err);
        });
    });

});




