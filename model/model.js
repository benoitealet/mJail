const {Sequelize, Model, DataTypes, Op} = require('sequelize');
const moment = require('moment');
const uuid = require('uuid/v4');

function connect(config) {

    const sequelize = new Sequelize({
        ...config.database,
        define: {
            timestamps: false
        }

    });

    class Address extends Model {
    }

    class Mail extends Model {
    }

    class Header extends Model {
    }

    class Attachment extends Model {
    }

    Address.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        address: {
            type: DataTypes.STRING(512),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        to: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        from: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        cc: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        bcc: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    }, {
        sequelize
    });

    Mail.init({
        id: {
            type: DataTypes.UUIDV4,
            defaultValue: () => uuid(),
            primaryKey: true
        },
        messageId: {
            type: DataTypes.STRING(512),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE(),
            allowNull: false,
        },
        subject: {
            type: Sequelize.STRING(512),
            allowNull: false,
        },
        html: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        text: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        user: {
            type: Sequelize.STRING(64),
            allowNull: true,
        },
        read: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

    }, {
        sequelize
    });


    Header.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        mailId: {
            type: DataTypes.UUIDV4,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(64),
            allowNull: false,
        },
        value: {
            type: DataTypes.STRING(512),
            allowNull: true,
        }
    }, {
        sequelize
    });

    Attachment.init({
        mailId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        contentId: {
            type: DataTypes.STRING(128),
            allowNull: true,
            primaryKey: true,
        },
        contentType: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        contentDisposition: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },

        fileName: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        length: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }

    }, {
        sequelize
    });

    Mail.hasOne(Address, {as: 'from', sourceKey: 'id', foreignKey: 'from', onDelete: 'cascade'});
    Mail.hasMany(Address, {as: 'to', sourceKey: 'id', foreignKey: 'to', onDelete: 'cascade'});
    Mail.hasMany(Address, {as: 'cc', sourceKey: 'id', foreignKey: 'cc', onDelete: 'cascade'});
    Mail.hasMany(Address, {as: 'bcc', sourceKey: 'id', foreignKey: 'bcc', onDelete: 'cascade'});
    Mail.hasMany(Header, {as: 'header', sourceKey: 'id', foreignKey: 'mailId', onDelete: 'cascade'});
    Mail.hasMany(Attachment, {as: 'attachments', sourceKey: 'id', foreignKey: 'mailId', onDelete: 'cascade'});

    const models = {
        Address,
        Mail,
        Header,
        Attachment,
    }

    Mail.getRepository = () => {
        return require(__dirname + '/repository/mailRepository.js').getRepository(models, config);
    }
    Attachment.getRepository = () => {
        return require(__dirname + '/repository/attachmentRepository.js').getRepository(models, config);
    }


    const startPruneMonitor = function (pruneDays, onMailDeleted) {

        if (pruneDays > 0) {
            setInterval(async () => {

                const deleteIdList = await Mail.findAll({
                    attributes: ['id'],
                    where: {
                        date: {
                            [Op.lt]: moment().subtract(pruneDays, 'days')
                        }
                    }
                });

                await Mail.destroy({
                    where: {
                        id: deleteIdList
                    }
                });

                onMailDeleted(deleteIdList);
                console.log('Pruned ' + deleteIdList.length + ' mails');

            }, 1000);
        }
    };

    return {
        Models: models,
        startPruneMonitor,
        sequelize
    }
}

module.exports = {
    connect
}

