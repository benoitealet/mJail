"use strict";

const fs = require('fs');
const path = require('path');
const config = require('../../config/config.json');
const sanitize = require("sanitize-filename");

module.exports.getSchema = (mongoose) => {

    let mailSchema = new mongoose.Schema({
        messageId: 'String',
        date: 'Date',
        subject: 'String',
        from: {
            address: 'String',
            name: 'String'
        },
        to: [
            {
                address: 'String',
                name: 'String'
            }
        ],
        cc: [
            {
                address: 'String',
                name: 'String'
            }
        ],
        bcc: [
            {
                address: 'String',
                name: 'String'
            }
        ],
        text: 'String',
        html: 'String',
        attachments: [{
                contentType: 'String',
                contentDisposition: 'String',
                contentId: 'String',
                fileName: 'String',
                length: 'Number',
                content: 'Buffer'
            }],
        headers: [{
                name: 'String',
                value: 'String'
            }],
        user: 'String',
        read: 'Boolean'
    });


    mailSchema.statics.findAttachmentInfo = function (mailId, contentId) {
        return new Promise((resolve, reject) => {
            this.findOne({
                _id: mailId,
                'attachments.contentId': contentId
            }, [
                'attachments.contentType',
                'attachments.fileName',
                'attachments.contentId',
            ], (err, data) => {
                if(err) {
                    reject(err);
                } else if(data && data.attachments) {
                    data.attachments.forEach((att) => {
                        if(att.contentId === contentId) {
                            resolve(att);
                        }
                    })
                    
                } else {
                    return null;
                }
            });
        });
    }

    mailSchema.statics.findAllSimpleMails = function () {

        return new Promise((resolve, reject) => {
            this.find({}, [
                'subject',
                'from',
                'to',
                'cc',
                'bcc',
                'date',
                'html',
                'text',
                'attachments.fileName',
                'attachments.contentType',
                'attachments.contentDisposition',
                'attachments.contentId',
                'attachments.length',
                'attachments._id',
                'user',
                'read',
                'headers'
            ], {
                'sort': {
                    'date': -1
                }
            },(err, mails) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(mails);
                }
            })
        });
    }

    mailSchema.statics.saveMail = function (mail, attachmentDir) {

        return new Promise((resolve, reject) => {

            let attachmentFiles = [];
            if (mail.attachments) {
                for (let i = 0, m = mail.attachments.length; i < m; i++) {
                    attachmentFiles.push({
                        buffer: mail.attachments[i].content,
                        contentId: mail.attachments[i].contentId
                    });
                    delete mail.attachments[i].content;
                }
            }

            this.create(mail).then((inserted) => {

                let p = [];
                attachmentFiles.forEach((att) => {
                    p.push(
                            new Promise((resolveFile, rejectFile) => {
                                fs.mkdir([config.attachmentDir, sanitize(inserted._id.toString())].join(path.sep), (err) => {
                                    //ignore error, maybe the folder allready exists. If other error, writeFile will fail too, and this error will be returned
                                    fs.writeFile([
                                        config.attachmentDir,
                                        sanitize(inserted._id.toString()),
                                        sanitize(att.contentId.toString())
                                    ].join(path.sep), att.buffer, (err) => {
                                        if (err) {
                                            rejectFile(err);
                                        } else {
                                            resolveFile();
                                        }
                                    });

                                });
                            })
                            );
                });

                Promise.all(p).then(() => {
                    resolve(inserted);
                }).catch(reject);
            }).catch(reject);
        });
    }

    return mailSchema;
}