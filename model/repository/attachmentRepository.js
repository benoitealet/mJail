module.exports.getRepository = function(models, config) {

    findAttachmentInfo = async function (mailId, contentId) {

        const attachment = await models.Attachment.findOne({
            where: {
                mailId: mailId,
                contentId: contentId
            }
        })


        return attachment;

    }

    return {
        findAttachmentInfo
    }
}

