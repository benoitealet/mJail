"use strict";

const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const config = require('../config/config.json');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport(config.smtpClient);

module.exports = (database) => {
    return (ws, broadcast) => {
        ws.on('message', async (e) => {
            const data = JSON.parse(e);
            const t = await database.sequelize.transaction();
            switch (data.type) {
                case 'setBlacklist':
                    ws.blacklist = data.payload;
                    break;

                case 'setForceChannel':
                    ws.forceChannel = data.payload;
                    break;

                case 'getMailsUser': {
                    const mails = await database.Models.Mail.getRepository().findAllFromUser(data.payload ? data.payload : null);

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
                }
                    break;

                case 'getInit': {
                    let mails;
                    if (!ws.forceChannel) {
                        mails = await database.Models.Mail.getRepository().findAllSimpleMails(ws.blacklist);
                    } else {
                        mails = await database.Models.Mail.getRepository().findAllFromUser(ws.forceChannel);
                    }

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
                }
                    break;

                case 'setRead': {
                    await database.Models.Mail.update({
                        read: true
                    }, {
                        where: {
                            id: data.payload
                        }
                    });

                    broadcast({
                        type: 'setRead',
                        payload: data.payload
                    });
                }
                    break;

                case 'setUnread': {
                    await database.Models.Mail.update({
                        read: false
                    }, {
                        where: {
                            id: data.payload
                        }
                    });

                    broadcast({
                        type: 'setUnread',
                        payload: data.payload
                    });
                }
                    break;

                case 'delete': {
                    await database.Models.Mail.destroy({
                        where: {
                            id: data.payload
                        }
                    });
                    broadcast({
                        type: 'deleted',
                        payload: data.payload
                    });

                    data.payload.forEach((mailId) => {
                        fsExtra.remove(config.attachmentDir + path.sep + mailId);
                    });
                }
                    break;

                case 'deleteByUser': {
                    const mailIds = await database.Models.Mail.getRepository().findAllFromUser(data.payload ? data.payload : null);
                    for (const mailId of mailIds) {
                        fsExtra.remove(config.attachmentDir + path.sep + mailId.id);
                    }

                    await database.Models.Mail.destroy({
                        where: {
                            user: data.payload ? data.payload : null
                        }
                    });

                    broadcast({
                        type: 'deletedByUser',
                        payload: data.payload
                    });
                }
                    break;

                case 'deliverMail': {
                    const dbMail = await database.Models.Mail.findOne({
                        where: {
                            id: data.payload.id
                        },
                        include: [
                            'from',
                            'to',
                            'cc',
                            'bcc',
                            'attachments'
                        ]
                    });
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
                                        dbMail.id,
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
                    } catch (e) {
                        console.warn(e);
                    }
                }
                    break;


                default:
                    console.log('Unknown message type received: ', data.type);
            }
            t.commit();
        });
    }
}