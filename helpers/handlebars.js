var register = function(Handlebars) {
    var helpers = {
    isA: function(user, options) {
        if(user !== undefined)
        {
            return user.isAdmin;
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
