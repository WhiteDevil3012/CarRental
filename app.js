const express = require('express');
const Handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const insecureHandlebars = allowInsecurePrototypeAccess(exphbs)
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const formidable = require('formidable');
//Init app
const app = express();
//Setup Middleware
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
//Configuration for authentication
app.use(cookieParser());
app.use(session({
    secret : 'mySecret',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
//Load Helpers
const {requireLogin,ensureGuest,checkAdmin} = require('./helpers/authHelper');
const {upload} = require('./helpers/aws');
//Require Passports
require('./passport/local');
//Make user Global
app.use((req,res,next) => {
    res.locals.user = req.user || null;
    next();
})
//Load Files
const keys = require('./config/keys');
//Load Collections
const User = require('./models/user');
const user = require('./models/user');
const Car = require('./models/car');
const Tariff = require('./models/tariff');
const tariff = require('./models/tariff');
//Connect
mongoose.connect(keys.MongoDB,{
    useNewUrlParser: true, 
    }).then(() => {
        console.log('MongoDB is connected');
    }).catch((err) =>{
        console.log(err);
});
const port = process.env.PORT||3000;
var hbsHelpers = exphbs.create({
    helpers: require("./helpers/handlebars.js").helpers,
    defaultLayout: 'main',
    extname: '.handlebars',
    handlebars: allowInsecurePrototypeAccess(Handlebars)
});

app.engine('.handlebars', hbsHelpers.engine);
app.set('view engine', '.handlebars');
/*
app.engine('handlebars',exphbs({
    defaultLayout : 'main'
}));
app.set('view engine','handlebars');
*/
app.use(express.static('public'));
app.get('/',ensureGuest,(req,res) => {
    res.render('home',{
        title: 'RKK Vehicle Rentals'
    });
});
app.get('/about',(req,res)=>{
    res.render('about',{
        title:'About'
    })
});
app.get('/login',ensureGuest,(req,res)=>{
    res.render('login',{
        title:'Login'
    })
});

app.get('/signup',ensureGuest,(req,res)=>{
    res.render('signup',{
        title:'Signup',
        
    })
});
app.post('/signup',ensureGuest,(req,res)=>{
    console.log(req.body);
    let errors=[];
    if(req.body.password !== req.body.password2) {
        errors.push({text: 'Passwords do not match!'});
    }
    if(req.body.password.length < 6 ) {
        errors.push({text: 'Password must be atleast 6 characters!'});
    }
    console.log(errors);
    if(errors.length > 0)
    {
        res.render('signup',{
            title:'Signup',
            errors:errors,
            name:req.body.name,
            email:req.body.email,
            phone:req.body.phone,
            location:req.body.location,
            drive:req.body.drive,
        });
    }else{
        User.findOne({email:req.body.email})
        .then((user) => {
            if(user){
                let errors = [];
                errors.push({text:"Email already exists"});
                res.render('signup',{
                    errors:errors,
                });
            }else{
                //Encrypt Password
                let salt = bcrypt.genSaltSync(10);
                let hash = bcrypt.hashSync(req.body.password,salt);
                
                const newUser = {
                    name:req.body.name,
                    email:req.body.email,
                    phone:req.body.phone,
                    location:req.body.location,
                    drive:req.body.drive,
                    password: hash,
                    image:`https://vrentalapp.s3.ap-south-1.amazonaws.com/${req.body.image}`,
                }
                new User(newUser).save((err,user) => {
                    if(err){
                        throw err;
                    }
                    if(user){
                        console.log('New User is created');
                        success=[];
                        success.push({text:"You can log in now"});
                        res.render('login',{
                            title:'Login',
                            success:success
                        });
                    }
                })
            }
            
        })
    }
});
app.post('/loginform',ensureGuest,passport.authenticate('local',{
    successRedirect: '/profile',
    failureRedirect : '/loginError'
}));

app.get('/profile',requireLogin,(req,res) => {
    User.findById({_id:req.user._id})
    .then((user) => {
        user.online=true,
        user.save((err,user) => {
            if(err){
                throw err;
            }
            if(user){
                user1={
                    _id:user._id,
                    name:user.name,
                    email:user.email,
                    image:user.image,
                    phone:user.phone,
                    location:user.location,
                    password:user.password,
                    online:true,
                    isAdmin:user.isAdmin,
                };
                res.render('profile',{
                    title:'Profile',
                    user:user1
                });
            }
        })
    });
});
app.get('/loginError',ensureGuest,(req,res) =>{
    let errors=[];
    errors.push({text:"Incorrect email or password"});
    res.render('login',{
        title:'Login',
        errors:errors
    });
});
app.get('/logout',requireLogin,(req,res) => {
    User.findById({_id:req.user._id})
    .then((user) => {
        user.online = false;
        user.save((err,user) => {
            if(err){
                throw err;
            }
            if (user){
                req.logout();
                res.redirect('/');
            }
        });
    });
});
app.get('/listcar',requireLogin,checkAdmin,(req,res) => {
    res.render('listcar',{
        title:'List a car',
    })
});
app.post('/tariff',requireLogin,checkAdmin,(req,res) => {
    const newCar = {
        regno:req.body.regno,
        model:req.body.model,
        make:req.body.make,
        year:req.body.year,
        type:req.body.type,
        location:req.body.location,
    }
    new Car(newCar).save((err,car) => {
        if(err){
            throw err;
        }
        if(car){
            newCar._id = car._id,
            res.render('tariff',{
                title:'Tariff',
                id: car._id,
            })
        }
    })
});
app.post('/dispcar',requireLogin,(req,res) => {
    Car.findById({_id:req.body.cid})
    .populate('tariff')
    .then((car) => {
        res.render('displaycar',{
            Title: car.model,
            car:car,
        })
    })
})
app.post('/image',requireLogin,checkAdmin,(req,res) => {
    console.log(req.body);
    const newTariff ={
        bp: req.body.bp,
        pph: req.body.pph,
        ppd: req.body.ppd,
        ppw: req.body.ppw,
    };
    new Tariff(newTariff).save((err,tariff) => {
        if(err){
            throw err;
        }
        if(tariff){
            Car.findById({_id:req.body.carID})
            .then((car) => {
                car.tariff=tariff._id;
                car.save((err,user) => {
                    if(err){
                        throw err;
                    }
                    if (car){
                        res.render('image',{
                            title:'Upload Image',
                            cid:car._id,
                        });
                    }
                });
            });    
        }
    })
});
app.post('/uploadcar',requireLogin,checkAdmin,(req,res) => {
    Car.findById({_id:req.body.cid})
            .then((car) => {
                car.image=`https://vrentalapp.s3.ap-south-1.amazonaws.com/${req.body.image}`;
                car.save((err,user) => {
                    if(err){
                        throw err;
                    }
                    if (car){
                        res.redirect('/showCars');
                    }
                });
            });
});
app.get('/showCars',requireLogin,(req,res) => {
    Car.find({isAvailable:true})
    .populate('tariff')
    .sort({rating:'desc'})
    .then((cars) => {
        res.render('showCars', {
            cars: cars
        })
    })
    
} )
app.post('/uploadImage',upload.any(),(req,res) => {
    const form = new formidable.IncomingForm();
    form.on('file',(field,file) => {
        console.log(file);
    });
    form.on('error',(err) => {
        console.log(err);
    });
    form.on('end',() => {
        console.log("Image received successfully");
    });
    form.parse(req);
});
app.listen(port,() => {
    console.log('Server is on port:' + port);
});
