var express = require('express');
var bodyParser = require('body-parser');
var form = require('express-form');
var logger = require('morgan');
var redis = require('redis');

var field = form.field;

var client = redis.createClient({
    "url": "redis://h:p652853b2eff65febda93a260c728d5593f13ba6c0db9ead23ac45e6cffa7adf9@ec2-34-231-155-48.compute-1.amazonaws.com:18469"
});

client.on('error', function(err) {
    console.log('redis error: ' + err);
});

var app = express();

app.use(logger('dev'));
app.use(bodyParser());

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    console.log('getting teams');

    client.hgetall('teams', function(err, obj) {
        console.log('got obj: ' + obj);

        res.render('pages/index', {
            teams: obj
        });
    });
});

app.post(
    '/',
    form(
        field("teamName").trim().required(),
        field("pickName").trim().required()
    ),
    function(req, res) {
        if (!req.form.isValid) {
            console.log(req.form.errors);
            res.redirect('/');
            return;
        }

        var teams = client.get('teamPicks', function(err, reply) {
            var teamJson = JSON.parse(reply);

            var teamPicks = teamJson[req.form.teamName];

            teamPicks.push(req.form.pickName);

            teamJson[req.form.teamName] = teamPicks;

            client.set('teamPicks', teamJson, redis.print);

            res.redirect('/');
        });

    
});

app.get('/admin', function(req, res) {
    var testValue = '';

    client.get('testkey', function(err, reply) {
        console.log('redis reply: ' + reply);
        
        res.render('pages/admin', {
            keyValue: reply
        });

    });
});

app.post(
    '/admin',
    form (
        field('teamName').trim().required(),
        field('pickNum').trim().required()
    ),
    function(req, res) {
        if (!req.form.isValid) {
            console.log("form errors: " + req.form.errors);
            console.log("vals: " + req.form.teamName + " : " + req.form.pickNum);
            res.redirect('/admin');
            return;
        }

        console.log('adding to redis: ' + req.form.teamName);
        console.log('adding to redis: ' + req.form.pickNum);

        client.hmset('teams', { 
                teamName : req.form.teamName,
                pickNum: req.form.pickNum
            }, function(err, reply){
            console.log('err: ' + err);
            console.log('reply: ' + reply);
            res.redirect('/admin');
        });
});

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});