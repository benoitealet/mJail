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

const database = require(__dirname + '/model/model.js').connect(config);
(async () => {
    await Promise.all([
        database.Models.Address.sync(),
        database.Models.Attachment.sync(),
        database.Models.Header.sync(),
        database.Models.Mail.sync(),
    ]);
})();


webServer
    .createServer(
        config.httpPort,
        config.cert,
        require('./router.js')(config, database.Models),
        require('./controller/websocketController.js')(database)
    ).catch((e) => {
    console.log(e);
    process.exit(1);
});

smtpServer.onMailReceived(async (mail) => {
    const t = await database.sequelize.transaction();

    try {
        const createdMail = await database.Models.Mail.getRepository().saveMail(mail, config.attachmentDir);

        t.commit();
        webServer.broadcast({
            type: 'mailReceived',
            payload: {
                mail: createdMail
            }
        }, function (ws, user) {
            // callback function executed on the broadcast loop to check if this client should be warned
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
        });
    } catch(e) {
        console.log(e);
        t.rollback();
    }

});

database.startPruneMonitor(config.pruneDays, (mailsId) => {
    webServer.broadcast({
        type: 'deleted',
        payload: mailsId
    })
});


