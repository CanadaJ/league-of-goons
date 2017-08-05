var express = require('express');
var logger = require('morgan');
var redis = require('redis');

var client = redis.createClient({
    "url": "redis://h:p652853b2eff65febda93a260c728d5593f13ba6c0db9ead23ac45e6cffa7adf9@ec2-34-231-155-48.compute-1.amazonaws.com:18469"
});

client.on('error', function(err) {
    console.log('redis error: ' + err);
});

var app = express();

app.use(logger('dev'));

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    client.set('testkey', 'testvalue', redis.print);
    res.render('pages/index');
});

app.get('/admin', function(req, res) {
    var testValue = '';

    client.get('testkey', function(err, reply) {
        console.log('redis reply: ' + reply);
        testValue = reply;
    });

    res.render('pages/admin', {
        value: testValue
    });
});

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});