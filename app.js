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

app.use(express.static(__dirname + '/public'));

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

        console.log('teamname ' + req.form.teamName);

        for (var team in teamPicks) {
            if (teamPicks[team].name === req.form.teamName) {
                var currentPick = new Object();
                currentPick.round = teamPicks[team].picks.length + 1;
                currentPick.pick = req.form.pickName;

                console.log('added team pick: ' + currentPick.pick);

                for (var team2 in teamPicks) {
                    if (teamPicks[team2].name === req.form.teamName) {
                        teamPicks[team2].picks.push(currentPick);
                    }
                }

                res.redirect('/');
                return;
            }
        }

        var newTeamPick = new Object();

        newTeamPick.name = req.form.teamName;
        newTeamPick.picks = [];

        console.log('req team name: ' + req.form.teamName);
        console.log('newTeamPick name: ' + newTeamPick.name);

        var currentPick = new Object();
        currentPick.round = 1;
        currentPick.pick = req.form.pickName;

        newTeamPick.picks.push(currentPick);

        teamPicks.push(newTeamPick);

        console.log('added team pick: ' + currentPick.pick);

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

        res.redirect('/admin');
});

app.post('/admin/delete', function(req, res) {
    teams = [];
    teamPicks = [];

    res.render('pages/admin');
});

app.get('/board', function(req, res) {

    res.render('pages/board',  {
        teamPicks: teamPicks
    });
});

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});