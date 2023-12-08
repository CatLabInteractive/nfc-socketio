const fs = require('fs');

var Config = {};

Config.password = process.env.NFC_PASSWORD;

// is a file?
if (Config.password.substr(0, 1) === '@') {
    var passwordFilename = Config.password.substr(1);
    console.log('Loading password from ' + passwordFilename);
    Config.password = fs.readFileSync(passwordFilename, 'utf8').trim();
    console.log(Config.password);
}

module.exports.Config = Config;
