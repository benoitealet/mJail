const fs = require('fs');
const path = require('path');

exports.router = (config, model) => (app) => {
        const express = require('express');
        const path = require('path');

        app.get('/', function (req, res) {
            res.send('hello world');
        });

        app.get('/getAttachment/:mailId/:contentId', function (req, res) {
            let mailId = req.params.mailId;
            let contentId = req.params.contentId;

            model.getModel('Mail').findAttachmentInfo(mailId, contentId).then((att) => {
                
                res.setHeader("content-type", att.contentType);
                res.setHeader("content-disposition", 'inline; filename="'+att.fileName+'"');
                
                fs.createReadStream([config.attachmentDir, mailId, contentId].join(path.sep)).pipe(res);
            }).catch(() => {
                res.status(404).send('Attachment not found');
            });
        });

        app.use(function (req, res, next) {
            res.status(404).send('Sorry can\'t find that!');
        });

    }