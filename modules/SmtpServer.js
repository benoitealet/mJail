"use strict"

const SMTPServer = require('smtp-server').SMTPServer;
const MailParser = require("mailparser-mit").MailParser;

let listeners = [];


function onAuth(auth, session, callback) {
    callback(null, {
        user: auth.username
    });
}

function onData(maxSmtpSizeKo) {
    return (stream, session, callback) => {
        
        let sumData = maxSmtpSizeKo;
        let discard = false;
        
        let mailparser = new MailParser({
        });
        
        stream.on('data', (data) => {
            if(sumData > maxSmtpSizeKo * 1024) {
                if(!discard) {
                    console.log('Discarded mail after total smtp data:', Math.floor(sumData/1024), 'Kb');
                    discard = true;
                    stream.end();
                }
            } else {
                sumData += data.length;
                mailparser.write(data);
            }
        });
        stream.on('end', () => {
            if(!discard) {
                mailparser.end();
                callback();
            } else {
                let err = new Error('Message exceeds fixed maximum message size ('+maxSmtpSizeKo+' Kb)' );
                err.responseCode = 552;
                return callback(err);
            }
        });

        mailparser.on('end', (mail) => {
            if(!discard) {
                broadcastListeners(mail, session);
            }
        });
    }
}

function broadcastListeners(mail, session) {
    listeners.forEach((l) => {

        l({
            messageId: mail.messageId,
            date: mail.date,
            subject: mail.subject,
            from: (mail.from && mail.from[0])?{
                address: mail.from[0] ? mail.from[0].address : null,
                name: mail.from[0] ? mail.from[0].mail : null
            }:null,
            to: mail.to ? mail.to.map(t => {
                return {
                    address: t.address,
                    name: t.name
                }
            }) : null,
            cc: mail.cc ? mail.cc.map(t => {
                return {
                    address: t.address,
                    name: t.name
                }
            }) : null,
            bcc: mail.bcc ? mail.bcc.map(t => {
                return {
                    address: t.address,
                    name: t.name
                }
            }) : null,
            text: mail.text,
            html: mail.html,
            attachments: mail.attachments ? mail.attachments.map(a => {
                return {
                    contentType: a.contentType,
                    contentDisposition: a.contentDisposition,
                    contentId: a.contentId,
                    fileName: a.fileName,
                    length: a.length,
                    content: a.content
                }
            }) : null,
            headers: Object.keys(mail.headers)
                    .map(key => {
                        return {
                            name: key,
                            value: mail.headers[key]
                        }
                    })
            ,
            user: session.user
        })
    });
}

module.exports.createServer = (smtpPort, maxSmtpSizeKo) => {
    const fs = require('fs');
    const smtpServer = new SMTPServer({
        banner: 'jMail!',
        authOptional: true,
        disabledCommands: ['STARTTLS'],
        allowInsecureAuth: true,
        onAuth: onAuth,
        onData: onData(maxSmtpSizeKo),
        maxAllowedUnauthenticatedCommands: 50,
        //logger: true,
    });

    smtpServer.listen(smtpPort);
    console.log('SMTP Listen on port', smtpPort);

    smtpServer.on('error', (error) => {
        console.log('ERROR');
        console.log(error);
    });
};

module.exports.onMailReceived = (callback) => {
    if (typeof callback === 'function') {
        listeners.push(callback);
    }
};


