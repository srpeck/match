var player_name = document.cookie.split(';')[0].split('=')[1] || 'Anonymous';
var my_game_state = {};
my_game_state[player_name] = {type: 'R', location: {x: 0, y: 0}};

function doAction(data) {
    // Get my name from my game state - currently does not work with multiple units
    var me = null;
    for(me in my_game_state) {}

    var parsed_action = data.action.split(' ');
    var parsed_target = null;
    if(parsed_action[1]) {
        parsed_target = parsed_action[1].split(',');
        parsed_target[0] = parseInt(parsed_target[0]);
        parsed_target[1] = parseInt(parsed_target[1]);
        if(isNaN(parsed_target[0]) || isNaN(parsed_target[1])) {
            return false;
        }
    }

    // Adjust my own actions relative to my current position
    if(data.units === 'Me') {
        if(parsed_action[1]) {
            // Transform UI input relative to player position to absolute position
            parsed_target[0] = my_game_state[me].location.x + parsed_target[0] - 5;
            parsed_target[1] = my_game_state[me].location.y + parsed_target[1] - 5;

            // Side effect: update global variable for absolute position prior to sending to other clients
            latest_action = parsed_action[0] + ' ' + parsed_target[0] + ',' + parsed_target[1];
        }
    }

    switch(parsed_action[0]) {
    case 'attack':
        var units_hit = unitsAtLocation(parsed_target[0], parsed_target[1], 2);
        if(units_hit) {
            return 'Attack centered on ' + parsed_target[0] + ', ' + parsed_target[1] + ' hits ' + units_hit + '!';
        } else {
            return 'Attack centered on ' + parsed_target[0] + ', ' + parsed_target[1] + ' misses!';
        }
    case 'move':
        if(data.units === 'Me') {
            if(unitsAtLocation(parsed_target[0], parsed_target[1], 0)) {
                return false;
            } else {
                my_game_state[me].location.x = parsed_target[0];
                my_game_state[me].location.y = parsed_target[1];
                return 'You move to ' + parsed_target[0] + ', ' + parsed_target[1];
            }
        } else {
            return 'Other guy moves to ' + parsed_target[0] + ', ' + parsed_target[1];
        }
    default:
        return false;
    }
}

function unitsAtLocation(x, y, range) {
    var units_to_return = "";
    // Check my units first
    for(var unit in my_game_state) {
        if(distanceBetween(my_game_state[unit].location, {x: x, y: y}) <= range) {
            units_to_return += unit;
        }
    }
    // Check peers next
    for(var socket in sockets) {
        for(var unit in sockets[socket].units) {
            if(distanceBetween(sockets[socket].units[unit].location, {x: x, y: y}) <= range) {
                if(units_to_return.length > 0) {
                    units_to_return += ", ";
                }
                units_to_return += unit;
            }
        }
    }
    return units_to_return;
}

function renderGameState() {
    var map = {};
    var map_string = '';

    // Get my name from my game state - currently does not work with multiple units
    var me = null;
    for(me in my_game_state) {}

    // Build list of peer units I can see
    for(var socket in sockets) {
        for(var unit in sockets[socket].units) {
            // Check if in sight range
            if(distanceBetween(my_game_state[me].location, sockets[socket].units[unit].location) <= 4) {
                map[(sockets[socket].units[unit].location.x - my_game_state[me].location.x + 5) + ',' + (sockets[socket].units[unit].location.y - my_game_state[me].location.y + 5)] = sockets[socket].units[unit].type;
            }
        }
    }

    // Create view of map
    map_string += '<table class="map"><tbody>';
    for(var i = 11 - 1; i >= 0; i--) {
        map_string += '<tr>'
        for(var j = 0; j < 11; j++) {
            if(j === 5 && i === 5) {
                // Put Me in the center of the map
                map_string += '<td id="' + j + ',' + i + '" class="unit' + my_game_state[me].type + '"></td>';
            } else if(map[j + ',' + i]) {
                // Put peer units I can see on the map
                map_string += '<td id="' + j + ',' + i + '" class="unit' + map[j + ',' + i] + '"></td>';
            } else if(distanceBetween({x: 5, y: 5}, {x: j, y: i}) <= 4) {
                // Put locations I can see on the map
                map_string += '<td id="' + j + ',' + i + '" class="empty"></td>';
            } else {
                map_string += '<td id="' + j + ',' + i + '" class="notvisible"></td>';
            }
        }
        map_string += '</tr>';
    }
    map_string += '</tbody></table>';
    map_string += JSON.stringify(my_game_state[me].location) + '\n';
    return map_string;
}

function distanceBetween(point1, point2) {
    return Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
}
