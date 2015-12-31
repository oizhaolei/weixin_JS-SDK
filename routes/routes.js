var path = require('path');
var signature = require('../signature');
var config = require('../config')();


var createSignature = signature.getSignature(config);

module.exports = function(app) {
    app.post('/getsignature', getSignature);
};


function getSignature(req, res) {
    var url = req.body.url;
    console.log(url);
    createSignature(url, function(error, result) {
        if (error) {
            res.json({
                'error': error
            });
        } else {
            res.json(result);
        }
    });
}
