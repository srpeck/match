function $(id) {
    return document.getElementById(id);
}
function showMap(view) {
    $('view').innerHTML = view;
}
function showMessage(message) {
    if(message) {
        $('messages').innerHTML = message;
        return true;
    } else {
        return false;
    }
}

///////////////////////////////////////////////////////////////////////////////

var configuration = { iceServers: [{ url: 'stun:stun.l.google.com:19302' }] };
var sockets = {};
var latest_action = null;
var heartbeat = 0;
var room = window.location.pathname || 'global';
var socket = io.connect();
var signalingChannel = {};
signalingChannel.send = function(data) {
    socket.emit('message', JSON.stringify(data));
};

function trace(text) { console.log((performance.now() / 1000).toFixed(3) + ": ", text); }
function logError(error) { trace(error.name + ": " + error.message); }

if(room !== '') {
    trace('Create or join room ' + room);
    socket.emit('create or join', room, function(err, room_description) {
        if(err) { trace('Error: ' + err); }
        sockets = room_description.clients;
    });
}

socket.on('stunservers', function(servers) { configuration.iceServers = servers; });
socket.on('log', function(string) { trace(string); });

socket.on('joined', function(room) {
    trace('This peer has joined room ' + room);
    for(client in sockets) {
        trace('Starting peer connection and data channel with: ' + client);
        startPeerConnection(true, client);
    }
});

socket.on('remove', function(client) {
    trace('Remove: ' + client.id);
    delete sockets[client.id];
    showMap(renderGameState());
});

socket.on('message', function(message) {
    message = JSON.parse(message);
    if(!sockets[message.from]) {
        sockets[message.from] = {};
        startPeerConnection(false, message.from);
    }
    if(message.sdp) {
        sockets[message.from].pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function() {
            if(sockets[message.from].pc.remoteDescription.type == "offer") {
                sockets[message.from].pc.createAnswer(function(desc) {
                    sockets[message.from].pc.setLocalDescription(desc, function() {
                        signalingChannel.send({ sdp: sockets[message.from].pc.localDescription, to: message.from });
                    }, logError);
                }, logError);
            }
        }, logError);
    } else {
        sockets[message.from].pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
});

function startPeerConnection(isInitiator, client) {
    sockets[client].pc = new RTCPeerConnection(configuration);

    sockets[client].pc.onicecandidate = function(evt) {
        if(evt.candidate) {
            signalingChannel.send({ candidate: evt.candidate, to: client });
        }
    };

    sockets[client].pc.onnegotiationneeded = function() {
        sockets[client].pc.createOffer(function(desc) {
            sockets[client].pc.setLocalDescription(desc, function() {
                signalingChannel.send({ sdp: sockets[client].pc.localDescription, to: client });
            }, logError);
        }, logError);
    }

    if(isInitiator) {
        sockets[client].channel = sockets[client].pc.createDataChannel("data");
        setupChannel(client);
    } else {
        sockets[client].pc.ondatachannel = function(evt) {
            sockets[client].channel = evt.channel;
            setupChannel(client);
        };
    }
}

function setupChannel(client) {
    sockets[client].channel.onopen = function() {
        // Force sending unit information on joining
        heartbeat = 60;
    };

    sockets[client].channel.onmessage = function(evt) {
        var parsed_data = JSON.parse(evt.data);
        if(parsed_data.units) {
            sockets[client].units = parsed_data.units;
        }
        if(parsed_data.action) {
            trace('action received: ' + parsed_data.action);
            showMessage(doAction(parsed_data));
        }
        showMap(renderGameState()); // TODO: aggregate actions for single update? dynamically aggregate rendering with React?
    };
}

function sendMessage(message) {
    for(var client in sockets) {
        sockets[client].channel.send(message);
    }
}

function tickHandler() {
    setInterval(function() {
        if(latest_action !== null) {
            var message = doAction({units: 'Me', action: latest_action});
            if(message) {
                showMessage(message);
                sendMessage(JSON.stringify({units: my_game_state, action: latest_action}));
                showMap(renderGameState());
            }
            latest_action = null;
        } else if(heartbeat >= 60) {
            // No action in last 60 seconds (includes peers newly joining)
            heartbeat = 0;
            sendMessage(JSON.stringify({units: my_game_state, action: null}));
        } else {
            heartbeat++;
        }
    }, 1000);
}

// Begin the game loop and accept input
tickHandler();
showMap(renderGameState());
