var express = require('express');
var morgan = require('morgan');
var http = require('http');
var gameController = require('./controllers/game_controller');
var app = express();

app.set('port', process.env.PORT || 8080);
app.use(morgan()); // logger
app.use(express.static(__dirname + '/public'));

app.get('/games', function(req, res) {
    return res.sendfile(__dirname + '/public/index.html');
});
app.get('/game/:game_id', function(req, res) {
    return res.sendfile(__dirname + '/public/index.html');
});
app.get('/play/:game_id', function(req, res) {
    return res.sendfile(__dirname + '/public/play.html');
});

app.get('/api/games', gameController.getGames);
app.get('/api/events/games', gameController.getGamesEvents);
app.get('/api/game/:game_id', gameController.getGame);
app.get('/api/events/game/:game_id', gameController.getGameEvents);
app.post('/api/game/:game_name', gameController.postGame);
app.put('/api/game/:game_id/player/:player/vote/:vote', gameController.putGame);
app.delete('/api/game/:game_id/player/:player', gameController.deletePlayer);
app.delete('/api/game/:game_id', gameController.deleteGame);

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log('Express http server listening on port %d in %s mode', app.get('port'), app.settings.env);
});

var config = { stunservers: [ {url: "stun:stun.l.google.com:19302"} ] };
var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
    socket.resources = {};

    socket.on('message', function(details) {
        details = JSON.parse(details);
        if(!io.sockets.sockets[details.to]) {
            return; // Must specify other socket to send to
        }
        details.from = socket.id; // Tells other socket who message is from
        io.sockets.sockets[details.to].emit('message', JSON.stringify(details));
    });

    socket.on('create or join', function(room, callback) {
        var numClients = io.sockets.clients(room).length;
        socket.emit('log', 'Message from server: Room ' + room + ' has ' + numClients + ' client(s)');

        if(numClients == 0){
            socket.join(room);
        } else if(numClients >= 1) {
            if(typeof room !== 'string') {
                return;
            }
            if(socket.room) {
                removeFeed();
            }
            safeCb(callback)(null, describeRoom(room));
            socket.join(room);
            socket.room = room;
            socket.emit('joined', room);
        }
    });

    socket.on('disconnect', function() { removeFeed(); }); // For automatically leaving the room on closing the client
    socket.on('leave', removeFeed);                        // For manually leaving the room

    function removeFeed(type) {
        io.sockets.in(socket.room).emit('remove', { id: socket.id, type: type });
    }

    if(config.stunservers) {
        socket.emit('stunservers', config.stunservers);
    }
});
function describeRoom(name) {
    var clients = io.sockets.clients(name);
    var result = { clients: {} };
    clients.forEach(function(client) {
        result.clients[client.id] = client.resources;
    });
    return result;
}
function safeCb(cb) {
    if(typeof cb === 'function') {
        return cb;
    } else {
        return function(){};
    }
}

if(process.env.uid) {
    process.setuid(process.env.uid); // So as not to run as root
}
