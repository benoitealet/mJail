const fs = require('fs').promises;
const sanitize = require("sanitize-filename");
const path = require('path');

module.exports.getRepository = function (models, config) {

    findAllSimpleMails = async function () {

        const list = await models.Mail.findAll({
            include: [
                'from',
                'to',
                'cc',
                'bcc',
                'attachments',
            ],
            order: [
                ['date', 'DESC']
            ]
        });
        return list;

    }

    findAllFromUser = async function (user) {

        const list = await models.Mail.findAll({
            include: [
                'from',
                'to',
                'cc',
                'bcc',
                'attachments',
            ],
            where: {
                user: user
            },
            order: [
                ['date', 'DESC']
            ]
        });

        return list;

    }

    saveMail = async function (mail) {

        const createdMail = await models.Mail.create(mail);

        if (mail.from) {
            models.Address.create({
                ...mail.from,
                from: createdMail.id
            });
        }

        if (mail.to) {
            mail.to.forEach(adr => {
                models.Address.create({
                    ...adr,
                    to: createdMail.id
                })
            });
        }

        if (mail.cc) {
            mail.cc.forEach(adr => {
                models.Address.create({
                    ...adr,
                    cc: createdMail.id
                })
            });
        }

        if (mail.bcc) {
            mail.bcc.forEach(adr => {
                models.Address.create({
                    ...adr,
                    bcc: createdMail.id
                })
            });
        }

        if (mail.headers) {
            mail.headers.forEach(h => {
                models.Header.create({
                    ...h,
                    mailId: createdMail.id
                })
            });
        }

        if (mail.attachments) {
            const allCopyPromises = [];
            for (const attachment of mail.attachments) {
                await models.Attachment.create({
                    ...attachment,
                    mailId: createdMail.id
                });

                try {
                    await fs.mkdir([config.attachmentDir, sanitize(createdMail.id.toString())].join(path.sep));
                    allCopyPromises.push(fs.writeFile([
                        config.attachmentDir,
                        sanitize(createdMail.id.toString()),
                        sanitize(attachment.contentId.toString())
                    ].join(path.sep), attachment.content));
                } catch (e) {
                    // allready exists, ignore. If other error, writeFile will fail
                }
            }
            await Promise.all(allCopyPromises);
        }
        return models.Mail.findOne({
            where: {
                id: createdMail.id
            },
            include: [
                'from',
                'to',
                'cc',
                'bcc',
                'attachments',
            ],
        });
    }


    return {
        findAllSimpleMails,
        saveMail,
        findAllFromUser
    }
}

