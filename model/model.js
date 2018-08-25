let models = [];

module.exports.connect = (mongoDbUrl) => {
    return new Promise((resolve, reject) => {
        const mongoose = require('mongoose');

        //Set up default mongoose connection

        mongoose.connect(mongoDbUrl, {
            useNewUrlParser: true
        }).then(resolve);


        // Get Mongoose to use the global promise library
        mongoose.Promise = global.Promise;
        //Get the default connection

        let db = mongoose.connection;

        //Bind connection to error event (to get notification of connection errors)
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));

        models['Mail'] = mongoose.model('Mail', require('./modelDef/mailSchema.js').getSchema(mongoose));
    })
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
            }, '_id', function(err, docs) {
                if(err) {
                    console.log(err);
                    process.exit(1);
                }

                let deleted = docs.map(d => d._id);

                models['Mail'].deleteMany({
                    _id: {
                        $in: deleted
                    }
                }, (err) => {
                    if(err) {
                        console.log(err);
                    }
                });
                onMailDeleted(deleted);
                console.log('Pruned '+ deleted.length + ' mails');
            });


        }, 1000);
    }
}