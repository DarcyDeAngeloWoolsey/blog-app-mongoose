const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const {
    PORT, DATABASE_URL
} = require('./config');
const {
    Blogger
} = require('./models');

const app = express();
app.use(bodyParser.json());


// GET requests to /blogger => return 10 blogs
app.get('/blogger', (req, res) => {
    Blogger
        .find()
        .limit(10)
        // `exec` returns a promise
        .exec()
        // success callback: for each blog we got back, we'll
        // call the `.apiRepr` instance method we've created in
        // models.js in order to only expose the data we want the API return.
        .then(blogger => {
            res.json({
                blogger: blogger.map(
                    (blogger) => blogger.apiRepr())
            });
        })
        .catch(
            err => {
                console.error(err);
                res.status(500).json({
                    message: 'Internal server error'
                });
            });
});

// send back a single  blog by ID
app.get('/blogger/:id', (req, res) => {
    Blogger
    // this is a convenience method Mongoose provides for searching
    // by the object _id property
        .findById(req.params.id)
        .exec()
        .then(blogger => res.json(blogger.apiRepr()))
        .catch(err => {
            console.error(err);
            res.status(500).json({
                message: 'Internal server error'
            })
        });
});


app.post('/blogger', (req, res) => {

    const requiredFields = ['title', 'content', 'author'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`
            console.error(message);
            return res.status(400).send(message);
        }
    }

    Blogger.create({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author
        })
        .then(
            blogger => res.status(201).json(blogger.apiRepr()))
        .catch(err => {
            console.error(err);
            res.status(500).json({
                message: 'Internal server error'
            });
        });
});


app.put('/blogger/:id', (req, res) => {
    // ensure that the id in the request path and the one in request body match
    if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
        const message = (
            `Request path id (${req.params.id}) and request body id ` +
            `(${req.body.id}) must match`);
        console.error(message);
        res.status(400).json({
            message: message
        });
    }

    // we only support a subset of fields being updateable.
    // if the user sent over any of the updatableFields, we udpate those values
    // in document
    const toUpdate = {};
    const updateableFields = ['title', 'content', 'author'];

    updateableFields.forEach(field => {
        if (field in req.body) {
            toUpdate[field] = req.body[field];
        }
    });

    Blogger
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
        .findByIdAndUpdate(req.params.id, {
            $set: toUpdate
        })
        .exec()
        .then(blogger => res.status(204).end())
        .catch(err => res.status(500).json({
            message: 'Internal server error'
        }));
});

app.delete('/blogger/:id', (req, res) => {
    Blogger
        .findByIdAndRemove(req.params.id)
        .exec()
        .then(blogger => res.status(204).end())
        .catch(err => res.status(500).json({
            message: 'Internal server error'
        }));
});

// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function (req, res) {
    res.status(404).json({
        message: 'Not Found'
    });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl = DATABASE_URL, port = PORT) {

    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                    console.log(`Your app is listening on port ${port}`);
                    resolve();
                })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
    runServer().catch(err => console.error(err));
};

module.exports = {
    app, runServer, closeServer
};
