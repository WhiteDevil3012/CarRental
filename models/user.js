const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    name:{
        type: String
    },
    email:{
        type: String
    },
    phone:{
        type:String
    },
    location:{
        type : String,
        default: 'Sivakasi'
    },
    drive:{
        type: String
    },
    password:{
        type: String
    },
    image:{
        type: String,
        default: '/image/defaultuser.png' 
    },
    online:{
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default : false
    }
});
module.exports = mongoose.model('User',userSchema);