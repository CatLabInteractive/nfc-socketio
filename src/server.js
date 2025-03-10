const app = require('express')();
const fs = require('fs');
const tls = require('tls');

var httpPort = process.env.PORT || 3000;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

// also listen for https?
var http;
if (process.env.SSL_CERTIFICATE && fs.existsSync(process.env.SSL_PRIVATE_KEY)) {

    var sslOptions = {};
    var ctx;
    function reloadCertificates() {
        console.log('Loading certificates');
        sslOptions.key = fs.readFileSync(process.env.SSL_PRIVATE_KEY);
        sslOptions.cert = fs.readFileSync(process.env.SSL_CERTIFICATE);

        ctx = tls.createSecureContext(sslOptions);
    }
    reloadCertificates();

    http = require('https').createServer({
        SNICallback: (servername, cb) => {
            cb(null, ctx);
        }
    }, app);

    http.listen(httpPort, function(){
        console.log('https listening on *:' + httpPort);
    });

    // list to see if certificate changes
    fs.watchFile(process.env.SSL_CERTIFICATE, (curr, prev) => {
        setTimeout(reloadCertificates, 1000);
    });

} else {
    http = require('http').createServer(app);
    http.listen(httpPort, function(){
        console.log('http listening on *:' + httpPort);
    });
}

var io = require('socket.io')(http, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	  }
});

exports.http = http;
exports.io = io;
