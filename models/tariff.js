const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tariffSchema = new Schema({
    tid :{
        type: String,
    },
    bp:{
        type: Number,
    },
    pph:{
        type:Number
    },
    ppd:{
        type:Number
    },
    ppw:{
        type:Number
    },
});
module.exports = mongoose.model('Tariff',tariffSchema);