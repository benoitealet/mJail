"use strict";

const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const config = require('../config/config.json');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport(config.smtpClient);

module.exports = (model) => {
    return (ws, broadcast) => {
        ws.on('message', (e) => {
            const data = JSON.parse(e);
            switch (data.type) {
                case 'getBlacklist':
                    ws.blacklist = data.payload;
                    break;

                case 'getForceChannel':
                    ws.forceChannel = data.payload;
                    break;

                case 'getMailsUser':
                    model.getModel('Mail').findAllFromUser(data.payload ? data.payload : null).then((mails) => {
                        let delay = 0;
                        do {
                            let batch = mails.splice(0, 10);
                            setTimeout(() => {
                                ws.send(JSON.stringify({
                                    type: 'setInit',
                                    payload: {
                                        mails: batch
                                    }
                                }));}, delay);
                            delay += 100;
                        } while (mails.length);
                    });
                    break;

                case 'getInit':

                    if (!ws.forceChannel) {
                        model.getModel('Mail').findAllSimpleMails(ws.blacklist).then((mails) => {
                            let delay = 0;

                            do {
                                let batch = mails.splice(0, 10);
                                setTimeout(() => {
                                    ws.send(JSON.stringify({
                                        type: 'setInit',
                                        payload: {
                                            mails: batch
                                        }
                                    }));
                                }, delay);
                                delay += 100;
                            } while (mails.length);
                        });
                    } else {
                        model.getModel('Mail').findAllFromUser(ws.forceChannel).then((mails) => {
                            let delay = 0;

                            do {
                                let batch = mails.splice(0, 10);
                                setTimeout(() => {
                                    ws.send(JSON.stringify({
                                        type: 'setInit',
                                        payload: {
                                            mails: batch
                                        }
                                    }));
                                }, delay);
                                delay += 100;
                            } while (mails.length);
                        });
                    }
                    break;

                case 'setRead':
                    model.getModel('Mail').update({
                        _id: {
                            $in: data.payload
                        }
                    }, {
                        $set: {
                            read: true
                        }
                    }, function () {
                        broadcast({
                            type: 'setRead',
                            payload: data.payload
                        })
                    });
                    break;
                case 'setUnread':
                    model.getModel('Mail').update({
                        _id: {
                            $in: data.payload
                        }
                    }, {
                        $set: {
                            read: false
                        }
                    }, function () {
                        broadcast({
                            type: 'setUnread',
                            payload: data.payload
                        })
                    });
                    break;
                case 'delete':
                    model.getModel('Mail').remove({
                        _id: {
                            $in: data.payload
                        }
                    }, function () {
                        broadcast({
                            type: 'deleted',
                            payload: data.payload
                        })
                    });

                    data.payload.forEach((mailId) => {
                        fsExtra.remove(config.attachmentDir + path.sep + mailId);
                    });


                    break;
                case 'deleteByUser':
                    model.getModel('Mail').findAllFromUser(data.payload ? data.payload : null).then((mailIds) => {
                        mailIds.forEach((mailId) => {
                            fsExtra.remove(config.attachmentDir + path.sep + mailId._id);
                        });
                        model.getModel('Mail').remove({user: data.payload ? data.payload : null}, {multi: true}, function () {
                            broadcast({
                                type: 'deletedByUser',
                                payload: data.payload
                            });
                        });
                    });
                    break;

                case 'deliverMail':
                    model.getModel('Mail').findOne({
                        _id: data.payload.id
                    }, {
                    }, function (err, dbMail) {
                        try {
                            let mail = {};

                            mail.from = {
                                name: dbMail.from.name,
                                address: dbMail.from.address
                            }

                            if (data.payload.to) {
                                mail.to = [];
                                data.payload.to.forEach((to) => {
                                    mail.to.push({
                                        name: to.name,
                                        address: to.address
                                    });

                                });
                            }
                            if (data.payload.cc) {
                                mail.cc = [];
                                data.payload.cc.forEach((cc) => {
                                    mail.cc.push({
                                        name: cc.name,
                                        address: cc.address
                                    });
                                });
                            }
                            if (data.payload.bcc) {
                                mail.bcc = [];
                                data.payload.bcc.forEach((bcc) => {
                                    mail.bcc.push({
                                        name: bcc.name,
                                        address: bcc.address
                                    });
                                });
                            }

                            mail.subject = dbMail.subject;
                            mail.text = dbMail.text;
                            mail.html = dbMail.html;

                            mail.headers = {};
                            if (dbMail.headers) {
                                dbMail.headers.forEach((h) => {
                                    mail.headers[h.name] = h.value;
                                });
                            }

                            mail.attachments = [];
                            if (dbMail.attachments) {
                                dbMail.attachments.forEach((a) => {
                                    mail.attachments.push({
                                        filename: a.fileName,
                                        contentType: a.contentType,
                                        contentDisposition: a.contentDisposition,
                                        cid: a.contentId,
                                        path: [
                                            config.attachmentDir,
                                            dbMail._id.toString(),
                                            a.contentId.toString()
                                        ].join(path.sep)
                                    });
                                });
                            }
                            try {
                                transporter.sendMail(mail);
                            } catch (e) {
                                console.warn(e);
                            }
                        }catch(e) {
                            console.warn(e);
                        }
                    });



                    break;


                default:
                    console.log('Unknown message type received: ', data.type);
            }
        });
    }
}