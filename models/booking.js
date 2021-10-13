const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bookSchema = new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    car:{
        type: Schema.Types.ObjectId,
        ref: 'Car',
    },
    start:{
        type: Date,
        default:Date.now,
    },
    end:{
        type: Date,
    },
    hasCompleted:{
        type: Boolean,
        default: false, 
    },
});
module.exports = mongoose.model('Book',bookSchema);