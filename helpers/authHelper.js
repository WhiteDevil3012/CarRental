module.exports = {
    requireLogin: (req,res,next) => {
        //console.log(req.user);
        if(req.isAuthenticated()) {
            return next();
        }else {
            res.redirect('/');
        }
    },
    ensureGuest:(req,res,next) => {
        if(req.isAuthenticated()) {
            res.redirect('/profile');
        }else {
            return next();
        }
    },
    checkAdmin:(req,res,next) => {
        if(req.user.role !== "User") {
            return next();
        }else {
            res.redirect('/');
        }
    },
    checkM:(req,res,next) => {
        if(req.user.role === "Manager" ) {
            return next();
        }else {
            res.redirect('/');
        }
    }
};