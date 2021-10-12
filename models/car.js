const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const carSchema = new Schema({
    regno :{
        type:String
    },
    make:{
        type: String
    },
    year:{
        type: Number
    },
    model:{
        type: String
    },
    type:{
        type: String,
    },
    tariff:{
        type: Schema.Types.ObjectId,
        ref: 'Tariff',
    },
    location:{
        type:String,
        default: 'SVKS',
    },
    isAvailable:{
        type: Boolean,
        default:true,
    },
    rating:{
        type:Number,
        default:0
    },
    image:{
            type: String,
            default:'/image/defcar.webp',
    },
});
module.exports = mongoose.model('Car',carSchema);