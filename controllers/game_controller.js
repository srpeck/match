var Game = require('../models/game_model');

function getGames(req, res) {
    Game.getGames(function(err, result) {
        if(err) {
            return res.send(500, 'Error 500: Internal server error.');
        } else {
            return res.send(200, result);
        }
    });
};

function getGamesEvents(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    setInterval(function() { sendEvents(); }, 10000);
    sendEvents();

    function sendEvents() {
        Game.getGames(function(err, result) {
            if(!err) {
                res.write('id: ' + (new Date()).toLocaleTimeString() + '\n');
                res.write('data: ' + JSON.stringify(result) + '\n\n');
            }
        });
    }
}

function getGame(req, res) {
    Game.getGame(req.params.game_id, function(err, result) {
        if(err) {
            return res.send(400, 'Error 400: Bad request.');
        } else {
            return res.send(200, result);
        }
    });
};

function getGameEvents(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    setInterval(function() { sendEvents(); }, 2000);
    sendEvents();

    function sendEvents() {
        Game.getGame(req.params.game_id, function(err, result) {
            if(!err) {
                res.write('id: ' + (new Date()).toLocaleTimeString() + '\n');
                res.write('data: ' + JSON.stringify(result) + '\n\n');
            }
        });
    }
}

function postGame(req, res) {
    Game.createGame(req.params.game_name, function(err, result) {
        if(err) {
            return res.send(400, 'Error 400: Bad request.');
        } else {
            return res.send(200, result);
        }
    });
}

function putGame(req, res) {
    Game.updateGame(req.params.game_id, req.params.player, req.params.vote, function(err, result) {
        if(err) {
            return res.send(400, 'Error 400: Bad request.');
        } else {
            return res.send(200, result);
        }
    });
}

function deletePlayer(req, res) {
    Game.deletePlayer(req.params.game_id, req.params.player, function(err, result) {
        if(err) {
            return res.send(404, 'Error 404: Game requested does not exist.');
        } else {
            return res.send(204, result);
        }
    });
};

function deleteGame(req, res) {
    Game.deleteGame(req.params.game_id, function(err, result) {
        if(err) {
            return res.send(404, 'Error 404: Game requested does not exist.');
        } else {
            return res.send(204, result);
        }
    });
};

module.exports = {  'getGame': getGame,
                    'putGame': putGame,
                    'postGame': postGame,
                    'deletePlayer': deletePlayer,
                    'deleteGame': deleteGame,
                    'getGames': getGames,
                    'getGamesEvents': getGamesEvents,
                    'getGameEvents': getGameEvents };
