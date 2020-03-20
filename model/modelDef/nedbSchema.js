"use strict";

const fs = require('fs');
const path = require('path');
const config = require('../../config/config.json');
const sanitize = require("sanitize-filename");

module.exports.getSchema = (mail) => {

    mail.findAttachmentInfo = function (mailId, contentId) {
        return new Promise(((resolve, reject) => {
            this.findOne({
                _id: mailId,
                "attachments.contentId": contentId
            }, function (err, data) {
                if (err) {
                    reject(err);
                } else if (data && data.attachments) {
                    data.attachments.forEach((att) =>{
                        if (att.contentId === contentId) {
                            resolve(att);
                        }
                    })
                } else {
                    return null;
                }
            });
        }));
    };

    mail.findAllSimpleMails =  function (blacklist) {
        console.log(blacklist);
        return new Promise(((resolve, reject) => {
            this.find({
                user: {"$nin": blacklist}
            }).sort({
                date: -1
            }).exec(function (err, mails) {
                if (err) {
                    reject(err);
                } else {
                    resolve(mails);
                }
            });
        }));
    };

    mail.findAllFromUser = function (user) {
        console.log(user);
        return new Promise(((resolve, reject) => {
            this.find({
                user: user ? user : null
            }).sort({
                date: -1
            }).exec(function (err, mails) {
                if (err) {
                    reject(err);
                } else {
                    resolve(mails);
                }
            });
        }));
    };

    mail.saveMail = function (mail) {
        return new Promise(((resolve, reject) => {
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

            if (mail.user == undefined) {
                mail.user = null;
            }

            this.insert(mail,  function(err, inserted) {
                let p = [];
                attachmentFiles.forEach((att) => {
                    p.push(
                        new Promise((resolveFile, rejectFile) => {
                            fs.mkdir([config.attachmentDir, sanitize(inserted._id.toString())].join(path.sep), () => {
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
            });
        }))
    };

    return mail;
}