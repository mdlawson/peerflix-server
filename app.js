var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var torrentHandler = require("./");


io.on('connection', torrentHandler.socketConnection);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use(torrentHandler);

server.listen(3000, function() {
    console.log("Server listening");
});
