const fs = require('fs');
const path = require('path');
module.exports = (config, models) => (app) => {

    app.get('/getAttachment/:mailId/:contentId', async (req, res) => {
        let mailId = req.params.mailId;
        let contentId = req.params.contentId;

        const attachment = await models.Attachment.getRepository().findAttachmentInfo(mailId, contentId);
        try {
            if (attachment) {
                res.setHeader("content-type", attachment.contentType);
                res.setHeader("content-disposition", 'inline; filename="' + attachment.fileName + '"');
                fs.createReadStream([config.attachmentDir, mailId, contentId].join(path.sep)).pipe(res);
            } else {
                res.status(404).send('Attachment not found');
            }
        } catch (e) {
            console.log(e);
            res.status(500).send(e.message);
        }

    });

    app.use(function (req, res, next) {
        res.status(404).send('Sorry can\'t find that!');
    });

}