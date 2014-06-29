//if (!require("piping")({hook: true})) return;
var express = require("express");
var multer = require("multer");
var torrentStream = require("torrent-stream");
var mime = require("mime");
var parseRange = require("range-parser");
var fs = require("fs");
var fs = require("request");

var stream = express.Router();

var opts = {
  name: "peerflix-server"
};

var processTorrent = function(req, res) {

  var url = req.param("url");
  var magnet = request.param("magnet");

  var done = function(err, torrent) {
    try {
      var engine = torrentStream(torrent, opts);
      res.redirect(engine.infoHash);
    } catch (e) {
      res.send(501);
    }
  };

  if (url) {
    request(url, function(err, response, data) {
      done(err, data);
    });
  } else if (magnet) {
    done(null, magnet);
  } else if (req.files.file) {
    fs.readFile(req.files.file.path, function(err, data) {
      done(err, data);
    });
  }
  
};

stream.route("/")
  .post(multer(), processTorrent)
  .get(processTorrent);

stream.route("/:infoHash/:index?")
  .all(function(req, res, next) {
    req.engine = torrentStream({
      infoHash: req.params.infoHash
    }, opts);
    req.engine.on('ready', function() { next(); });
  })
  .get(function(req, res) {
    req.connection.setTimeout(36000000);
    var engine = req.engine;
    var file;

    if (!req.params.index) { // If no index is specified, find biggest file.
      file = engine.files[0];
      for (var i = 1; i < engine.files.length; i++) {
        if (engine.files[i].length > file.length) file = engine.files[i];
      }
    } else { 
      file = engine.files[req.params.index];
      if (!file) {
        res.send(404);
        return;
      }
    }

    var range = req.get("range");
    var stream;
    if (range) {
      range = parseRange(file.length, range)[0];
      res.status(206);
      res.set("Content-Length", range.end - range.start + 1);
      res.set("Content-Range", "bytes " + range.start + "-" + range.end + "/" + file.length);
      stream = file.createReadStream(range);
    } else {
      res.set("Content-Length", file.length);
      stream = file.createReadStream();
    }

    res.set("Accept-Ranges", "bytes");
    res.set("Content-Type", mime.lookup(file.name));

    var destroy = function() { stream.destroy(); };  
    res.on('error', destroy);
    res.on('close', destroy);

    stream.pipe(res);
  });

module.exports = stream;