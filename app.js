var express = require('express');
var form = require('express-form');
var bodyparser = require('body-parser');
var cookies = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
var mysql = require('mysql');
var connection = mysql.createConnection(process.env.JAWSDB_NAVY_URL);

var field = form.field;

passport.use(new LocalStrategy (
    function(username, password, done) {

        // pretend im doing db work until i figure that out
        if (username !== 'justin') return done(null, false, { message: 'Incorrect username'});
        if (password !== 'foo') return done(null, false, { message: 'Incorrect password '});

        return done(null, { id: 1, username: 'justin', password: 'foo' });

        // User.findOne({ username: username }, function(err, user) {
        //     if (err) return done(err);
        //     if (!user) return done(null, false);
        //     if (!user.verifyPassword(password)) return done(null, false);

        //     return done(null, user);
        // });
    }
));

passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function(user, cb) {
    // pretend im doing db work until i figure that out
    if (user.id !== 1) return cb('error');

    cb(null, { id: 1, username: 'justin', password: 'foo' });
});

// mysql
connection.connect();
connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
    if (err) throw err;

    console.log('mysql: ' + rows[0].solution);
});

var app = express();

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(cookies());
app.use(bodyparser());
app.use(require('express-session')({ secret: 'fuck goodell' }));

app.use(passport.initialize());
app.use(passport.session());

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

app.get('/pickems', function(req, res) {
    res.render('pages/pickems');
});

app.get('/login', function(req, res) {

    res.render('pages/login');
});

app.post(
    '/login',
    passport.authenticate('local', { failureRedirect: '/login'}),
    function(req, res) {
        res.render('pages/pickems');
    }
);

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});