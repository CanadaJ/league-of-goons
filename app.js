require('dotenv').config();
var express = require('express');
var form = require('express-form');
var bodyparser = require('body-parser');
var cookies = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
var mysql = require('mysql');
var connection = mysql.createConnection(process.env.JAWSDB_NAVY_URL);
var favicon = require('serve-favicon');

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
    cb(null, user);
});

passport.deserializeUser(function(user, cb) {
    connection.query(`select u.iduser, u.name, CASE WHEN u.iduser = 1 THEN 1 ELSE 0 END AS isadmin from users u where u.iduser = ?`, [user.iduser], function(err, rows) {
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
app.use(favicon(__dirname + '/public/images/favicon.ico'));

app.use(passport.initialize());
app.use(passport.session());

var teams = [];
var teamPicks = [];

app.get('/', function (req, res) {
    res.redirect('/pickems');
});

app.get('/admin', isLoggedIn, isAdmin, function(req, res) {

    var matchupWinners = [];

    connection.query('CALL admin_getmatchupwinners', function(err, rows) {
        if (err) throw err;
        for (var idx in rows[0]) {
            matchupWinners.push(
                { 
                    idmatchup: rows[0][idx].idmatchup,
                    week: rows[0][idx].week,
                    home: rows[0][idx].home, 
                    away: rows[0][idx].away, 
                    gametime: rows[0][idx].gametime, 
                    idhometeam: rows[0][idx].home,
                    idawayteam: rows[0][idx].away,
                    userid: req.user.iduser,
                    winner: rows[0][idx].winner,
                    hometeam: rows[0][idx].hometeam,
                    awayteam: rows[0][idx].awayteam,
                    winnername: rows[0][idx].name,
                    istie: rows[0][idx].istie
                });
        }


        var user = req.user;
        res.render('pages/admin', {
            user: user ? user : null,
            matchups: matchupWinners
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
        user: user ? user : null
    });
});

app.get('/board', function(req, res) {
    res.redirect('/pickems');
});

app.get('/pickems/week/:week*?', isLoggedIn, function(req, res) {
    var weekNum = req.params['week'];

    if (!weekNum || weekNum < 0) {
        res.redirect('/pickems/week/1');
        return;
    }

    var users = [];
    var matchups = [];
    var userPicks = [];

    connection.query('CALL pickem_picksbyweek(?)', [weekNum], function(err, rows) {
        if (err) throw err;

        for (let i in rows[0]) {
            users.push({
                userId: rows[0][i].iduser,
                name: rows[0][i].name
            });
        }

        for (let i in rows[1]) {
            matchups.push({
                idMatchup: rows[1][i].idmatchup,
                homeName: rows[1][i].homename,
                awayName: rows[1][i].awayname
            });
        }

        for (let idx in rows[2]) {
            let row = rows[2];

            userPicks.push({
                iduser: row[idx].iduser,
                name: row[idx].name,
                idmatchup: row[idx].idmatchup,
                wascorrect: row[idx].wascorrect,
                isfuture: row[idx].isfuture,
                idhometeam: row[idx].idhometeam,
                idawayteam: row[idx].idawayteam,
                homename: row[idx].homename,
                awayname: row[idx].awayname,
                hasWinner: row[idx].haswinner
            });
        }

        let user = req.user;

        res.render('pages/pickems-weekly', {
            users: users,
            matchups: matchups,
            userPicks: userPicks,
            weekNum: weekNum,
            user: user ? user : null
        });
    });
});

app.get('/pickems', isLoggedIn, function(req, res) {

    var userPicks = [];
    var pickCounts = {};

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
                    userid: req.user.iduser,
                    winner: rows[0][idx].winner,
                    idpickteam: rows[0][idx].idpickteam,
                    istie: rows[0][idx].istie
                });
        }

        var correct = rows[1][0].correctpicks;
        var incorrect = rows[1][0].incorrectpicks;

        pickCounts = { correct: correct, incorrect: incorrect };

        var user = req.user;

        res.render('pages/pickems', {
            pickems: userPicks,
            pickCounts: pickCounts,
            user: user ? user : null
        });
    });
});

app.post('/pickems', isLoggedIn, function(req, res) {
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

app.get('/logout', isLoggedIn, function(req, res) {
    req.logout();
    res.redirect('/login');
});

app.get('/leaderboard', function(req, res) {

    var leaderboard = [];
    var lastNumCorrect = -1;
    var rank = 1;
    var rankDelta = 1;

    connection.query('CALL pickem_pickranks', function(err, rows) {
        if (err) throw err;
        for (var idx in rows[0]) {
            var row = rows[0][idx];


            if (lastNumCorrect === row.numCorrect) {
                rankDelta++;
            }
        
            if (lastNumCorrect > row.numCorrect) {
                rank += rankDelta;
                rankDelta = 1;
            }

            lastNumCorrect = row.numCorrect;

            leaderboard.push({
                rank: rank,
                name: row.name,
                numCorrect: row.numCorrect,
                numIncorrect: row.numIncorrect
            });
        }

        res.render('pages/leaderboard', {
            user: req.user,
            leaderboard: leaderboard
        });
    });
});

app.post('/setwinner', isLoggedIn, isAdmin, function(req, res) {
    var pickRequest = JSON.parse(JSON.stringify(req.body));

    if (!req.body) {
        res.send({ success: false });
        return;
    }

    var idMatchup = pickRequest.matchupid;
    var winner = pickRequest.winner;

    if (!winner || !idMatchup) {
        res.send({ success: false });
        return;
    }

    connection.query('CALL admin_setwinner(?, ?)', [idMatchup, winner], function(err, rows) {
        if (err) throw err;

        if (!rows || rows.length === 0 || rows.length > 1) {
            res.send({ success: false });
        } else {
            res.send({ success: true });
        }
    });
});

function isAdmin(req, res, next) {
  var property = 'user';
  if (req._passport && req._passport.instance) {
    property = req._passport.instance._userProperty || 'user';

    if(req[property].isadmin === 1)
        return next();

  }

    res.redirect('/');
}

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/login');
}

app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on port 3000');
});