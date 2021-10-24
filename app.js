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
const {requireLogin,ensureGuest,checkAdmin,checkM} = require('./helpers/authHelper');
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
//Load Stripe
const stripe = require('stripe')(keys.StripeSecretKey);
//Load Collections
const User = require('./models/user');
const Car = require('./models/car');
const Tariff = require('./models/tariff');
const Book = require('./models/booking');
const Pay = require('./models/payments');
const Feedback = require('./models/feedback');
const feedback = require('./models/feedback');
const tariff = require('./models/tariff');
//Connect
mongoose.connect(keys.MongoDB,{
    useNewUrlParser: true, 
    }).then(() => {
        console.log('MongoDB is connected');
    }).catch((err) =>{
        console.log(err);
});
const port = process.env.PORT||4000;
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
        title: 'Drip Wheels | Car Rental '
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
            firstname:req.body.firstname,
            lastname:req.body.lastname,
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
                let img=`https://vrentalapp.s3.ap-south-1.amazonaws.com/${req.body.image}`;
                if(req.body.image==="")
                    img="/image/defaultuser.png";
                const newUser = {
                    firstname:req.body.firstname,
                    lastname:req.body.lastname,
                    email:req.body.email,
                    phone:req.body.phone,
                    location:req.body.location,
                    drive:req.body.drive,
                    password: hash,
                    image:img,
                    role:"User",
                }
                new User(newUser).save((err,user) => {
                    if(err){
                        throw err;
                    }
                    if(user){
                        console.log('New User is created');
                        success=[];
                        success.push({text:"You can log in now"});
                        res.render('signup',{
                            title:'Signup',
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
                Book.find({user:user._id})
                .populate('car')
                .sort({end:'desc'})
                .then((books) => {
                    //console.log(books); 
                    res.render('profile',{
                        title:'Profile',
                        user:user,
                        books:books,
                    });
                })
                
            }
        })
    });
});
app.get('/loginError',ensureGuest,(req,res) =>{
    let errors=[];
    errors.push({text:"Incorrect email or password"});
    res.render('signup',{
        title:'Signup',
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
app.get('/createA',requireLogin,checkM,(req,res) => {
    res.render('addadmin',{
        title:'Add admin',
    })
});
app.get('/deletec',requireLogin,checkM,(req,res) => {
    Car.find()
    .populate('tariff')
    .then((cars) => {
        res.render('showCars',{
            cars:cars,
            action:'delcar',
            message:'Delete Car',
        })
    })
})
app.post('/delcar',requireLogin,checkM,(req,res) => {
    console.log(req.body);
    Car.findById({_id:req.body.cid})
    .then((car) => {
        Tariff.findByIdAndDelete({_id:car.tariff})
        .then((err,del) =>{
            if(err){
                console.log(err);
            }
            if(del){
                console.log("Deleted:",del);
            }
        })
    });
    Car.findByIdAndDelete({_id:req.body.cid})
        .then((err,del) =>{
            if(err){
                console.log(err); 
            }
            if(del){
                console.log("Deleted:",del);
            }
        });
    res.redirect('/showCars');

})
app.post('/tariff',requireLogin,checkAdmin,(req,res) => {
    console.log("In tariff");
    console.log(req.body);
    if(req.body.carID==='')
    {
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
    }
    else{
        Car.findById({_id:req.body.carID})
    .then((car) =>{
        if(car){
            car.regno=req.body.regno;
        car.model=req.body.model;
        car.make=req.body.make;
        car.year=req.body.year;
        car.type=req.body.type;
        car.location=req.body.location;
        car.save((err,car) => {
            if(err){
                throw err;
            }
            if(car){
                res.render('tariff',{
                    title:'Tariff',
                    id: car._id,
                })
            }
        })
        }
    })
    }
    
});
app.post('/backtolist',requireLogin,(req,res) => {
    Car.findById({_id:req.body.carID})
    .then((car) => {
        res.render('listcar',{
            title:'List Car',
            id: car._id,
            regno:car.regno,
            model:car.model,
            make:car.make,
            year:car.year,
            type:car.type,
            location:car.location,
        })
    })
})
app.post('/dispcar',requireLogin,(req,res) => {
    
    Car.findById({_id:req.body.cid})
    .populate('tariff')
    .then((car) => {
        Feedback.find()
        .populate('book')
        .then((feedbacks) => {
            avf=[];
            for(let i=0;i<feedbacks.length;i++)
            {
                //console.log(feedbacks[i].book.car);
                //console.log(car._id);
                if(JSON.stringify(feedbacks[i].book.car) === JSON.stringify(car._id) )
                {
                    console.log("Push");
                    avf.push(feedbacks[i]);
                }
            }
            console.log(avf);
            res.render('displaycar',{
                Title: car.model,
                car:car,
                feedbacks: avf,
            })
        })
    })
})
app.post('/image',requireLogin,checkAdmin,(req,res) => {
    if(req.body.tid==='')
    {
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
                                tid:tariff._id,
                            });
                        }
                    });
                });    
            }
        })
    }
    else{
        Tariff.findById({_id:req.body.tid})
    .then((tariff) => {
        if(tariff)
        {
            tariff.bp= req.body.bp;
            tariff.pph= req.body.pph;
            tariff.ppd= req.body.ppd;
            tariff.ppw= req.body.ppw;
            tariff.save((err,tariff) => {
                if(err){
                    console.log(err);
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
                                    tid:tariff._id,
                                });
                            }
                        });
                    });    
                }
            })
        }
    })
    
    }
});
app.post('/backtotariff',requireLogin,checkAdmin,(req,res) => {
    Tariff.findById({_id:req.body.tid})
    .then((tariff) => {
        if(tariff){
            res.render('tariff',{
                bp: req.body.bp,
                pph: req.body.pph,
                ppd: req.body.ppd,
                ppw: req.body.ppw,
                id:req.body.cid,
                tid:req.body.tid, 
            });
        }
    })
})
app.post('/uploadcar',requireLogin,checkAdmin,(req,res) => {
    Car.findById({_id:req.body.cid})
            .then((car) => {
                console.log(req.body.image);
                car.image=`https://vrentalapp.s3.ap-south-1.amazonaws.com/${req.body.image}`;
                car.isAvailable=true;
                if(req.body.image!=="")
                    img="/image/defcar.webp";
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
            cars: cars,
            action:'dispcar',
            message:'Show Car',
        })
    })
    
} );
app.post('/createA',requireLogin,checkM,(req,res)=>{
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
        res.render('addadmin',{
            title:'Add admin',
            errors:errors,
            firstname:req.body.firstname,
            lastname:req.body.lastname,
            email:req.body.email,
            phone:req.body.phone,
            location:req.body.location,
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
                let img=`https://vrentalapp.s3.ap-south-1.amazonaws.com/${req.body.image}`;
                if(req.body.image==="")
                    img="/image/defaultuser.png";
                const newUser = {
                    firstname:req.body.firstname,
                    lastname:req.body.lastname,
                    email:req.body.email,
                    phone:req.body.phone,
                    location:req.body.location,
                    password: hash,
                    role: "Admin",
                    image: img,
                }
                new User(newUser).save((err,user) => {
                    if(err){
                        throw err;
                    }
                    if(user){
                        console.log('New Admin is created');
                        res.render('profile',{
                            title:'Profile',
                        });
                    }
                })
            }
            
        })
    }
});
app.post('/rentcar',requireLogin,(req,res)=> {
    console.log(req.body);
    let caravailable=true;
    Car.findById({_id:req.body.cid})
    .then((car) => {
            caravailable=car.isAvailable;
        }
    )
    Book.findOne({user:req.body.uid,hasCompleted:false})
    .then((book)=> {
        if(!book && caravailable){
            newBook={
                user:req.body.uid,
                car:req.body.cid,
            }
            new Book(newBook).save((err,book) => {
                if(err){
                    throw err;
                }
                if(book){
                    console.log('New Booking is done');
                    Car.findById({_id:req.body.cid})
                    .then((car) => {
                        car.isAvailable=false,
                        car.save((err,car) => {
                            if(err){
                                throw err;
                            }
                            if (car){
                                res.redirect('/profile');
                            }
                        });
                    });
                }
            })
        }
        if(book){
            console.log("User has booked");
            let errors=[];
            errors.push({text:"You have already booked"});
            res.render('profile',{
                title:'Error',
                errors:errors,
            });
        }
        if(!caravailable){
            console.log("Car is currently unavailable");
            Car.find({isAvailable:true})
            .populate('tariff')
            .sort({rating:'desc'})
            .then((cars) => {
                res.render('showCars', {
                    cars: cars,
                    error:"Sorry the car has been booked just now by another user. check other cars",
                })
    })
        }
    });
    
});
app.get('/ipcar',(req,res)=> {
    res.render('image',{
        title:'Upload Image',
    });
})
app.post('/uploadImage',upload.any(),(req,res) => {
    console.log("Input request arrived");
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
/*
app.post('/dispOrders',requireLogin,(req,res) => {
    Book.find({user:req.user._id})
    .populate('car')
    .sort({end:'desc'})
    .then((books) => {
        res.render('myorders', {
            books: books,
            title :"Your Orders",
        })
    })
});
*/
function msToTime(duration) {
    const msInWeek = 1000 * 60 * 60 * 24 *7;
    const weeks = Math.trunc(duration / msInWeek);
    duration = duration - (weeks * msInWeek);
    const msInDay = 1000 * 60 * 60 * 24;
    const days = Math.trunc(duration / msInDay);
    duration = duration - (days * msInDay);
    const msInHour = 1000 * 60 * 60;
    let hours = Math.trunc(duration / msInHour);
    duration = duration - (hours * msInHour);
    if(duration > 60*1000*30)
        hours+=1;
    time={
        weeks: weeks,
        days: days,
        hours: hours,
    };
    return time;
}
app.post('/return',requireLogin,(req,res) => {
    Book.findById({_id:req.body.bid})
    .then((book) =>{
        if(book){
            //book.hasCompleted = true;
            book.end=Date.now();
            console.log(msToTime(book.end-book.start));
            book.save((err,book) => {
                if(err){
                    throw err;
                }
                if (book){
                    Car.findById({_id:book.car})
                    .then((car) => {
                        car.isAvailable = true;
                        car.save((err,user) => {
                            if(err){
                                throw err;
                            }
                            if (car){
                                res.redirect('/makePayment');
                            }
                        });
                    })
                }
            });
        }
    })
})
app.get('/makePayment',requireLogin,(req,res) => {
    Book.findOne({user:req.user._id,hasCompleted:false})
    .populate({
        path: "car",
        populate : {
            path:"tariff",
        }
    })
    .then((book) => {
        pay=msToTime(book.end-book.start);
        //console.log(book);
        //console.log(pay);
        const amount=pay.hours*book.car.tariff.pph+pay.days*book.car.tariff.ppd+pay.weeks*book.car.tariff.ppw+book.car.tariff.bp;
        console.log(amount);
        res.render('pay',{
            amount:amount,
            book:book,
            StripePublishKey:keys.StripePublishKey,

        })
    })
});
app.post('/pay',(req,res) =>{
    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken,
    })
    .then((customer) => {
        stripe.charges.create({
            amount:req.body.amount*100,
            description:`${req.body.amount} for Booking #${req.body.id}`,
            currency: 'inr',
            customer: customer.id,
            receipt_email:customer.email,
        },(err,charge) => {
            if(err){
                console.log(err);
                console.log("Enter details properly");
            }
            if(charge){
                newPay={
                    book:req.body.bid,
                    amount:req.body.amount,
                }
                new Pay(newPay).save((err,pay)=>{
                    if(pay){
                        console.log("Payment added successfully");
                        //console.log(pay);
                    }
                    if(err){
                        console.log(err);
                    }
                });
                Book.findById({_id:req.body.bid})
                .then((book)=>{
                    book.hasCompleted=true;
                    book.save((err,book) =>{
                        if(err){
                            console.log(err);
                        }
                        if(book){
                            res.render('feedback',{
                                bid:book._id,
                            })
                        }
                    })                    
                })
            }
        })
    }).catch((err) => {console.log(err);})
})
app.post('/feedback',(req,res) => {
    
    newFeedback ={
        book:req.body.bid,
        rating: parseInt(req.body.rating),
        review: req.body.review,
    };
    if(req.body.image!=='')
        newFeedback.image=`https://vrentalapp.s3.ap-south-1.amazonaws.com/${req.body.image}`;
    new Feedback(newFeedback).save((err,feed) =>{
        if(err){
            console.log(err);
        }
        if(feed){
            console.log(feed);
            let r=0,rl=0;
            Book.findById({_id:feed.book})
            .then((book) =>{
                Feedback.find()
                .populate('book')
                .then((feedback) => {
                for(let i=0;i<feedback.length;i++){
                    //console.log(feedback[i].book.car);
                    //console.log(book.car);
                    if(JSON.stringify(feedback[i].book.car) === JSON.stringify(book.car)){
                        //console.log("Equal");
                        r+=feedback[i].rating;
                        rl++;
                    }
                }
                r=r/rl;
                //console.log(r);
                Car.findById({_id:book.car})
                .then((car) =>{
                    if(car){
                        car.rating=r;
                        car.save((err,car) => {
                            if(err){
                                console.log(err);
                            }
                            if(car){
                                console.log(car.rating);
                                console.log('Feedback stored');
                                let success=[];
                                success.push({text:"Booking complete. You can rent now"});
                                Book.find({user:book.user})
                                .populate('car')
                                .sort({end:'desc'})
                                .then((books) => {
                                //console.log(books);
                                User.findById({_id:book.user})
                                .then((user)=>{
                                    res.render('profile',{
                                        title:'Profile',
                                        user:user,
                                        success:success,
                                        books:books,
                                    });
                                }) 
                                
                })
                            }
                        })
                    }
                })  
            })
            })
        }
    })
})
app.get('/viewf',(req,res)=>{
    Feedback.find()
    .populate({
        path: "book",
        populate : {
            path:"car",
        }
    })
    .then((feedbacks) =>{
        res.render('listfeedbacks',{
            feedbacks:feedbacks,
            title:'Feedbacks'
        })
    })
})
app.get('/viewo',(req,res)=>{
    Book.find()
    .populate('car')
    .populate('user')
    .then((books) =>{
        res.render('listorders',{
            books:books,
            title:'Orders'
        })
    })
})

app.listen(port,() => {
    console.log('Server is on port:' + port);
});
