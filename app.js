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
        connection.query(`CALL user_login(?, ?)`, [username, password], function(err, rows) {
            if (err) return done(err);

            return done(null, rows[0][0]);
        });
    }
));

passport.serializeUser(function(user, cb) {
    cb(null, user.iduser);
});

passport.deserializeUser(function(user, cb) {
    connection.query(`select u.iduser, u.name from users u where u.iduser = ?`, [user], function(err, rows) {
        cb(err, rows[0]);
    });
});

// mysql
connection.connect();

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

    var user = req.user;

    res.render('pages/index', {
        teams: teams,
        user: user ? user[0] : null
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
    var user = req.user;
    res.render('pages/admin', {
        user: user ? user[0] : null
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

        var newTeam = new Object();

        newTeam.name = req.form.teamName;
        newTeam.pickNum = req.form.pickNum;

        teams.push(newTeam);

        res.redirect('/admin');
});

app.post('/admin/delete', function(req, res) {
    teams = [];
    teamPicks = [];

    var user = req.user;

    res.render('pages/admin', {
        user: user ? user[0] : null
    });
});

app.get('/board', function(req, res) {

    var user = req.user;

    res.render('pages/board',  {
        teamPicks: teamPicks,
        user: user ? user[0] : null
    });
});

app.get('/pickems', isLoggedIn, function(req, res) {

    var userPicks = [];

    connection.query('CALL pickem_userpicks(?)', [req.user.iduser], function(err, rows) {
        if (err) throw err;
        for (var idx in rows[0]) {
            userPicks.push(
                { 
                    idmatchup: rows[0][idx].idmatchup,
                    week: rows[0][idx].week,
                    home: rows[0][idx].home, 
                    away: rows[0][idx].away, 
                    gametime: rows[0][idx].gametime, 
                    userpick: rows[0][idx].userpick,
                    canupdate: rows[0][idx].canupdate,
                    idhometeam: rows[0][idx].idhometeam,
                    idawayteam: rows[0][idx].idawayteam,
                    userid: req.user.iduser
                });
        }

        var user = req.user;

        res.render('pages/pickems', {
            pickems: userPicks,
            user: user ? user[0] : null
        });
    });
});

app.post('/pickems', function(req, res) {
    console.log(JSON.stringify(req.body));

    var pickRequest = JSON.parse(JSON.stringify(req.body));

    if (!req.body) {
        res.send({ success: false });
        return;
    }

    var idMatchup = pickRequest.matchupid;
    var idUser = pickRequest.userid;
    var idTeam = pickRequest.teamid;

    if (!idMatchup || !idUser || !idTeam) {
        res.send({ success: false });
        return;
    }

    connection.query('CALL pickem_insertpick(?, ?, ?)', [idMatchup, idUser, idTeam], function(err, rows) {
        if (err) throw err;

        if (!rows || rows.length === 0 || rows.length > 1) {
            res.send({ success: false });
        } else {
            res.send({ success: true });
        }
    });

});

app.get('/login', function(req, res) {

    if (req.isAuthenticated()) {
        res.redirect('/pickems');
        return;
    }

    res.render('pages/login', {
        user: null
    });
});

app.post(
    '/login',
    passport.authenticate('local', { failureRedirect: '/login'}),
    function(req, res) {
        res.redirect('/pickems');
    }
);

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/login');
}

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});