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

var teams = [];
var teamPicks = [];

app.get('/', function (req, res) {
    console.log('getting teams');

    res.render('pages/index', {
        teams: teams
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

        var teamName = req.form.teamName;
        var pickName = req.form.pickName;

        var team = teamPicks.find(function () {
            console.log(this);
            console.log(this.name);
            return this.name === teamName;
        });

        if (!team) {
            var newTeamPick = new Object();

            newTeamPick.name = teamName;
            newTeamPick.picks = [];

            var currentPick = new Object();
            currentPick.round = 1;
            currentPick.pick = pickName;

            newTeamPick.picks.push(currentPick);

            teamPicks.push(newTeamPick);

            res.redirect('/');
            return;
        }

        var currentPick = new Object();
        currentPick.round = team.picks.length + 1;
        currentPick.pick = pickName;

        for (var team in teamPicks) {
            if (teamPicks[team].name === teamName) {
                teamPicks[team].picks.push(currentPick);
            }
        }

        res.redirect('/');
        return;
});

app.get('/admin', function(req, res) {
    res.render('pages/admin')
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

        var newTeam = new Object();

        newTeam.name = req.form.teamName;
        newTeam.pickNum = req.form.pickNum;

        teams.push(newTeam);
});

app.post(/admin/delete, function(req, res) {
    teams = [];

    res.render('pages/admin');
});

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});