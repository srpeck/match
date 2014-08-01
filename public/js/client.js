var global_state = { vote: 0, source: null, current_game: null, player: (document.cookie.split(';')[0].split('=')[1] || '') };
global_state.leaveGame = function() {
    if(global_state.current_game) {
        httpRequest('DELETE', '/api/game/' + global_state.current_game + '/player/' + global_state.player, function(){}, log);
        delete global_state.current_game;
    }
    if(global_state.source) {
        global_state.source.close();
        delete global_state.source;
    }
}
global_state.joinGame = function(game_id, requirePushState, vote) {
    global_state.leaveGame();
    global_state.current_game = game_id;
    global_state.vote = vote;
    httpRequest('PUT', '/api/game/' + game_id + '/player/' + global_state.player + '/vote/' + (vote || 0), 
                function(res) { 
                    if(!window.EventSource) {
                        handleResult(JSON.parse(res)); 
                    } else {
                        global_state.source = new EventSource('/api/events/game/' + game_id);
                        global_state.source.onmessage = function(e) {
                            handleResult(JSON.parse(e.data));
                        };
                    }
                    if(requirePushState) {
                        window.history.pushState({ pathname: '/game/' + game_id }, '', '/game/' + game_id);
                    }
                }, log);
}
global_state.createGame = function(game_name) {
    if(game_name) { // TODO: Validate input
        httpRequest('POST', '/api/game/' + game_name, 
                    function(game_id) { 
                        global_state.joinGame(game_id, true);
                    }, log);
    }
}
global_state.getGames = function(requirePushState) {
    global_state.leaveGame();
    if(!window.EventSource) {
        httpRequest('GET', '/api/games', function(res) { handleResult(JSON.parse(res)); }, log);
    } else {
        global_state.source = new EventSource('/api/events/games');
        handleResult({});
        global_state.source.onmessage = function(e) {
            refreshGamesList(JSON.parse(e.data));
        };
    }
    if(requirePushState) {
        window.history.pushState({ pathname: '/games' }, '', '/games');
    }
}
function $(id) { return document.getElementById(id); }
function log(msg) { console.log(msg); }
function httpRequest(method, url, success, failure) {
    var request = new XMLHttpRequest();
    request.open(method, url, true);
    request.send(null);
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200 || request.status == 204) {
                success(request.responseText);
            } else if (failure) {
                failure(request.status, request.statusText);
            }
        }
    };
}
window.addEventListener('unload', function() { global_state.leaveGame(); });
window.addEventListener('popstate', function(element) {
    if(element.state) {
        handleRouting(element.state.pathname);
    }
});
window.addEventListener('click', function(element) {
    element.preventDefault();
    if(element.target.pathname) {
        handleRouting(element.target.pathname, true);
    } else if(element.target.id === 'votestart') {
        global_state.joinGame(global_state.current_game, false, (!global_state.vote ? 1 : 0));
    } else if(element.target.id === 'create_game') {
        global_state.createGame($('game_name').value);
    } else if(element.target.id === 'leave_game') {
        global_state.getGames(true);
    } else if(element.target.id === 'set_name') {
        if($('player_name').value) { // TODO: Validate input
            global_state.player = $('player_name').value;
            document.cookie = 'name=' + global_state.player;
            global_state.getGames(true);
        }
    } else if(element.target.id === 'change_name') {
        document.cookie = 'name=' + global_state.player + '; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        global_state.player = '';
        global_state.getGames(true);
    }
});
function handleRouting(pathname, requirePushState) {
    if(pathname.length > 1 && pathname.indexOf('game/') >= 0) {
        global_state.joinGame(pathname.slice(pathname.indexOf('game/') + 5), requirePushState);
    } else {
        global_state.getGames(requirePushState);
    }
}
function handleResult(data) {
    if(!data.name) {
        if(global_state.player) {
            $('header').innerHTML = '<input type="text" id="player_name" value="' + global_state.player + '" disabled><input type="button" id="change_name" value="Change player name"><br><br><input type="text" id="game_name"><input type="button" id="create_game" value="Create new game"><br>';
        } else {
            $('header').innerHTML = '<input type="text" id="player_name" autofocus><input type="button" id="set_name" value="Set player name"><br><br><input type="text" id="game_name"><input type="button" id="create_game" value="Create new game"><br>';
        }
        refreshGamesList(data);
    } else {
        if(global_state.vote) {
            $('header').innerHTML = '<b>Game:</b> ' + data.name + '<br><br>\n<input type="button" id="votestart" value="Vote to wait">\n<input type="button" id="leave_game" value="Leave game"><br>\n';
        } else {
            $('header').innerHTML = '<b>Game:</b> ' + data.name + '<br><br>\n<input type="button" id="votestart" value="Vote to start">\n<input type="button" id="leave_game" value="Leave game"><br>\n';
        }
        var votes = 0, player_count = 0;
        var result = '<br><b>Players:</b>\n';
        for(var player in data.players) {
            result += '<br>' + player;
            player_count++;
            if(data.players[player] == '1') {
                result += ' votes to start';
                votes++;
            }
        }
        if((votes / player_count) > (1 / 2)) {
            setTimeout(function() { 
                window.location = '/play/' + global_state.current_game;
                global_state.leaveGame();
            }, 3000);
        }
        $('games').innerHTML = result;
    }
}
function refreshGamesList(data) {
    var result = '<br><b>Games:</b><br>\n';
    for(var game in data) {
        var player_count = 0;
        for(var player in data[game].players) {
            player_count++;
        }
        result += '<a id="' + game + '" href="/game/' + game + '">' + data[game].name + '</a> has ' + player_count + ' player(s)<br>\n';
    }
    $('games').innerHTML = result;
}
if(window.location.pathname.length > 1) {
    handleRouting(window.location.pathname);
} else {
    $('games').innerHTML = '<a href="/games">Get list of games</a><br>';
}
