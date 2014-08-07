var express = require('express');
var http = require('http');
var main = express();
var port = process.env.PORT || 3010;
var server = http.createServer(main);
var io = require('socket.io').listen(server);

server.listen(port, null, function() {
    console.log("Listening on port " + port);
});

console.log('connected');

var express = require('express');

main.set('view engine', 'html');
main.engine('html', require('ejs').renderFile);
main.set('views', __dirname + '/views');
main.use(express.static(__dirname + '/public'));


main.get('/', function(req, res){
		//res.render('home');
		var id = Math.round((Math.random() * 100000));
		res.redirect('/chat/'+id);
});

main.get('/chat/:id', function(req,res){
	res.render('home');
});


var usernames = [];
var names = {};
var channels = {};
var sockets = {};
//////////////////////////////////////////////////////////////////
io.sockets.on('connection', function (socket) {
    socket.channels = {};
    sockets[socket.id] = socket;
    console.log("["+ socket.id + "] connection accepted");

    socket.on('join', function (config) {
        console.log("["+ socket.id + "] join ", config);
        var channel = config.channel;
    
        if (channel in socket.channels) {
            console.log("["+ socket.id + "] ERROR: already joined ", channel);
            return;
        }

        if (!(channel in channels)) {
            channels[channel] = {};
        }

        for (id in channels[channel]) {
            channels[channel][id].emit('addPeer', {'peer_id': socket.id, 'should_create_offer': false});
            socket.emit('addPeer', {'peer_id': id, 'should_create_offer': true});
        }

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;
        console.log("id   " + channels);

    });



    socket.on('load',function(data){

    	var noOfPeople = count(sockets);

		if(noOfPeople === 1 ) {

			socket.emit('peopleinchat', {number: 1});
		}
		else{
			
			socket.emit('peopleinchat', {
				number: noOfPeople,
				id: data
			});
		}
	});

    socket.on('login', function(data) {

		usernames.push(data.user);
		names[socket.id] = data.user;

		var channel = data.channel;

		
		if(countSocketsConnectedInChannel(channels, channel) === 2) {

			for (id in channels[channel]) {
				//console.log("boo");

				channels[channel][id].emit('startChat', {
					boolean: true,
					id: channel,
					users: usernames
				});
			}
		}
		else if(countSocketsConnectedInChannel(channels, channel) > 2){

			for (id in channels[channel]) {
				//console.log("foo");
				channels[channel][id].emit('joined', {users: data.user});
			}
			socket.emit('startChat', {
					boolean: true,
					id: channel,
					users: usernames
				});
		}
		
	});

    socket.on('disconnect', function () {
        for (var channel in socket.channels) {
            part(channel);
        }
        console.log("["+ socket.id + "] disconnected");
        delete sockets[socket.id];
    });



    function part(channel) {
        console.log("["+ socket.id + "] part ");

        if (!(channel in socket.channels)) {
            console.log("["+ socket.id + "] ERROR: not in ", channel);
            return;
        }

        delete socket.channels[channel];
        delete channels[channel][socket.id];

        for (id in channels[channel]) {
            channels[channel][id].emit('removePeer', {'peer_id': socket.id, 'user' : names[socket.id]});
            socket.emit('removePeer', {'peer_id': id});
        }
    }
  

    socket.on('relayICECandidate', function(config) {
        var peer_id = config.peer_id;
        var ice_candidate = config.ice_candidate;
        console.log("["+ socket.id + "] relaying ICE candidate to [" + peer_id + "] ", ice_candidate);

        if (peer_id in sockets) {
            sockets[peer_id].emit('iceCandidate', {'peer_id': socket.id, 'ice_candidate': ice_candidate});
        }
    });

    socket.on('relaySessionDescription', function(config) {
        var peer_id = config.peer_id;
        var session_description = config.session_description;
        console.log("["+ socket.id + "] relaying session description to [" + peer_id + "] ", session_description);

        if (peer_id in sockets) {
            sockets[peer_id].emit('sessionDescription', {'peer_id': socket.id, 'session_description': session_description});
        }
    });
});

///////////////////////////////////////////////////////////////////

function count(data)
{
	var countId = 0;
	if(data)
	{
		for(var id in data)
			countId++;
	}
	console.log("no of ppl" + countId);
	return countId;
}
function countSocketsConnectedInChannel(channels, channel)
{
	var countId = 0;
	if(channels)
	{
		for(var id in channels[channel])
			countId++;
	}
	console.log("count " + countId);
	return countId;
}