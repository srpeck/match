var uuid = require('node-uuid');

var games = {};
games['effed398-947c-4ca9-a7e8-5c68579af78e'] = { name: 'Test Game', players: { 'Me': 1, 'Other Guy': 0 } };

function getGames(callback) {
    return callback(null, games);
}

function getGame(game_id, callback) {
    if(!games[game_id]) {
        return callback('Game requested does not exist', null);
    } else {
        return callback(null, games[game_id]);
    }
}

function createGame(game_name, callback) {
    var game_key = uuid.v4();
    if(!game_name) {
        game_name = game_key;
    }
    games[game_key] = { name: game_name, players: {} };
    if(!games[game_key]) {
        return callback('Game could not be created', null);
    } else {
        return callback(null, game_key);
    }
}

function updateGame(game_id, player, vote, callback) {
    if(!games[game_id]) {
        return callback('Game requested does not exist', null);
    } else {
        games[game_id].players[player] = vote;
        if(games[game_id].players[player]) {
            return callback(null, games[game_id]);
        } else {
            return callback('Game could not be updated', null);
        }
    }
}

function deletePlayer(game_id, player, callback) {
    if(!games[game_id]) {
        return callback('Game requested does not exist', null);
    } else {
        delete games[game_id].players[player];
        maybeCleanup(game_id);
        return callback(null, 'Successfully deleted');
    }
}

function maybeCleanup(game_id) {
    setTimeout(function() {
        var test = null;
        if(games[game_id] && games[game_id].players) {
            for(test in games[game_id].players) {}
        }
        if(!test) {
            // Delete game when the last player leaves
            delete games[game_id];
        }
    }, 10000);
}

function deleteGame(game_id, callback) {
    if(!games[game_id]) {
        return callback('Game requested does not exist', null);
    } else {
        if(games[game_id].players === {}) {
            delete games[game_id];
            return callback(null, 'Successfully deleted');
        } else {
            return callback('Cannot delete while there are players still in the game', null);
        }
    }
}

module.exports = {  'getGames': getGames,
                    'getGame': getGame,
                    'createGame': createGame,
                    'updateGame': updateGame,
                    'deletePlayer': deletePlayer,
                    'deleteGame': deleteGame };
