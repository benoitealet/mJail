let models = [];

module.exports.connect = (nedbPath) => {
    return new Promise(((resolve, reject) => {
        const Datastore = require('nedb');

        const mail = new Datastore({filename: nedbPath, autoload: true});

        mail.loadDatabase(function (err) {
            if (err) {
                console.log(err);
            }
        });

        resolve();

        models['Mail'] = require('./modelDef/nedbSchema.js').getSchema(mail);
    }))
}

module.exports.getModel = function (modelName) {
    if (models[modelName]) {
        return models[modelName];
    } else {
        return null;
    }
}

module.exports.startPruneMonitor = function (pruneDays, onMailDeleted) {

    if (pruneDays > 0) {
        setInterval(() => {
            models['Mail'].find({
                date: {
                    '$lt': require('moment')().subtract(pruneDays, 'days')
                }
            }, function (err, docs) {
                if (err) {
                    console.log(err);
                    process.exit(1);
                }

                let deleted = docs.map(d => d.id);

                models['Mail'].remove({
                    _id: {
                        $in: deleted
                    },
                }, {
                    multi: true
                }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
                onMailDeleted(deleted);
                console.log('Pruned ' + deleted.length + ' mails');
            })
        }, 1000);
    }
}