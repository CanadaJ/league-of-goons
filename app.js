var express = require('express');
var logger = require('morgan');
var redis = require('redis');

var client = redis.createClient();
var app = express();

app.use(logger('dev'));

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    client.set('testkey', 'testvalue', redis.print);
    res.render('pages/index');
});

app.get('/admin', function(req, res) {
    var testValue = client.get('testkey');
    res.render('pages/admin', {
        value: testValue
    });
});

app.listen(3000, function() {
    console.log('Listening on port 3000');
});