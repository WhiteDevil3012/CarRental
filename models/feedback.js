const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const feedbackSchema = new Schema({
    book:{
        type: Schema.Types.ObjectId,
        ref: 'Book',
    },
    rating:{
        type:Number,
        default:5,
    },
    review:{
        type: String,
        default:'',
    },
    image:{
        type: String,
    },
    
});
module.exports = mongoose.model('Feedback',feedbackSchema);