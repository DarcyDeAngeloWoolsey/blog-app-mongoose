const mongoose = require('mongoose');

// this is our schema to represent a blog
const bloggerSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },

});

//generate a human readable string based on the author object
// we're storing in Mongo.
//bloggerSchema.virtual('authorString').get(function () {
//    return `${this.author.firstName} ${this.author.lastName}`.trim() //does this really need to be trimmed of white space?
//});


// this is an *instance method* which will be available on all instances
// of the model. This method will be used to return an object that only
// exposes *some* of the fields we want from the underlying data
bloggerSchema.methods.apiRepr = function () {

    return {
        id: this._id,
        title: this.title,
        content: this.content,
        author: this.author
    };
}

// note that all instance methods and virtual properties on our
// schema must be defined *before* we make the call to `.model`.
const Blogger = mongoose.model('Blogger', bloggerSchema);

module.exports = {
    Blogger
};
