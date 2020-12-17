const fs = require('fs').promises;
const sanitize = require("sanitize-filename");
const path = require('path');

module.exports.getRepository = function (models, config, op) {

    findAllSimpleMails = async function (blacklist) {

        console.log(blacklist);
        const list = await models.Mail.findAll({
            include: [
                'from',
                'to',
                'cc',
                'bcc',
                'attachments',
                'header'
            ],
            where: {
              user: {
                  [op.notIn]: blacklist ? blacklist : []
              }
            },
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
                'header'
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
            await models.Address.create({
                ...mail.from,
                from: createdMail.id
            });
        }

        if (mail.to) {
            await Promise.all(mail.to.map(adr => {
                return models.Address.create({
                    ...adr,
                    to: createdMail.id
                })
            }));
        }

        if (mail.cc) {
            await Promise.all(mail.cc.map(adr => {
                return models.Address.create({
                    ...adr,
                    cc: createdMail.id
                })
            }));
        }

        if (mail.bcc) {
            await Promise.all(mail.bcc.map(adr => {
                models.Address.create({
                    ...adr,
                    bcc: createdMail.id
                })
            }));
        }

        if (mail.headers) {
            await Promise.all(mail.headers.map(h => {
                models.Header.create({
                    ...h,
                    mailId: createdMail.id
                })
            }));
        }

        if (mail.attachments) {
            const allCopyPromises = [];
            for (const attachment of mail.attachments) {
                allCopyPromises.push(
                    models.Attachment.create({
                        ...attachment,
                        mailId: createdMail.id
                    })
                );

                try {
                    await fs.mkdir([config.attachmentDir, sanitize(createdMail.id.toString())].join(path.sep));
                } catch (e) {
                    // folder allready exists, ignore mkdir. If other error, writeFile will fail
                }

                allCopyPromises.push(fs.writeFile([
                    config.attachmentDir,
                    sanitize(createdMail.id.toString()),
                    sanitize(attachment.contentId.toString())
                ].join(path.sep), attachment.content));
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
                'header'
            ],
        });
    }


    return {
        findAllSimpleMails,
        saveMail,
        findAllFromUser
    }
}

