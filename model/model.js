let models = [];

module.exports.connect = (mongoDbUrl) => {
    return new Promise((resolve, reject) => {
        var mongoose = require('mongoose');

        //Set up default mongoose connection

        mongoose.connect(mongoDbUrl).then(resolve);


        // Get Mongoose to use the global promise library
        mongoose.Promise = global.Promise;
        //Get the default connection

        db = mongoose.connection;

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

