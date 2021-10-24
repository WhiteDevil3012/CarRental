var register = function(Handlebars) {
    var helpers = {
    isA: function(user, options) {
        if(user !== undefined)
        {
            if(user.role === "Admin") return true;
            if(user.role === "Manager") return true;
        }
        return false;
    },
    isM: function(user, options) {
        if(user !== undefined)
        {
            //console.log(user);
            if(user.role === "Manager") return true;
        }
        return false;
    },
    isU: function(user, options) {
        if(user !== undefined)
        {
            //console.log(user);
            if(user.role === "User") return true;
        }
        return false;
    },
    
};

if (Handlebars && typeof Handlebars.registerHelper === "function") {
    for (var prop in helpers) {
        Handlebars.registerHelper(prop, helpers[prop]);
    }
} else {
    return helpers;
}

};

module.exports.register = register;
module.exports.helpers = register(null); 
