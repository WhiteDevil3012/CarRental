const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const paySchema = new Schema({
    book:{
        type: Schema.Types.ObjectId,
        ref: 'Book',
    },
    amount:{
        type:Number,
        default:100,
    },
    card:{
        type: String,
        default:'4242424242424242',
    },
    
});
module.exports = mongoose.model('Pay',paySchema);