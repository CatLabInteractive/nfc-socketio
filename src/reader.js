const { server, io } = require('./server.js');

const { Config } = require('./config');

const { NFC, CONNECT_MODE_DIRECT, KEY_TYPE_A, TAG_ISO_14443_3, TransmitError } = require('nfc-pcsc');
const MifareUltralight = require('./cards/MifareUltralight.js');

const nfc = new NFC(console); // optionally you can pass logger

let nfcSocket;

let currentCard = null;

console.log('Password: ', Config.password);

io.on('connection', function(socket){
    console.log('a user connected');

    // join nfc room
    //socket.join('nfc');
    socket.on('hello', (data, ack) => {

        ack = ack || function() {};

        // check if the password is correct
        if (typeof(data.password) === 'undefined' || data.password !== Config.password) {
            ack({ error: { message: 'Password is wrong.' }});
            return;
        }

        nfcSocket = socket;
        ack({ success: true });

        nfcSocket.removeAllListeners('nfc:password');
        nfcSocket.on('nfc:password', async (data, ack) => {

            ack = ack || function() {};

            if (!currentCard || data.uid !== currentCard.uid) {
                console.log('Current card does not match command card');
                ack({ error: { code: 400, error: 'Current card does not match command card '}});
            }

            const password = data.password;
            console.log('Got password', password);

            try {
                await currentCard.getUserData();

                // is this card new?
                currentCard.setPassword(password);

                if (currentCard.isNewCard()) {
                    console.log('New card found, setting protection');
                    await currentCard.writeProtect();

                    // also write 0 to the userdata bytes so that the card is not considered 'new' anymore.
                    await currentCard.write(Buffer.allocUnsafe(8).fill(0));

                    console.log('Done protecting!');
                }
                /*else {
                    console.log('Existing card found, authenticating');
                    await currentCard.authenticate(password);
                    console.log('Authenticated succesfully');
                }
                 */

                ack({ success: true });

                // ready for content yay!
                const ndefData = await currentCard.getNdefContent();
                if (ndefData) {
                    nfcSocket.emit('nfc:data', {
                        uid: currentCard.uid,
                        ndef: (new Buffer(ndefData)).toString('base64')
                    });
                } else {
                    const userData = await currentCard.getUserData();
                    nfcSocket.emit('nfc:data', {
                        uid: currentCard.uid,
                        data: (new Buffer(userData)).toString('base64')
                    });
                }



            } catch (err) {

                console.error(err);
                ack({ error: { code: 500, error: err }});

            }

        });

        nfcSocket.removeAllListeners('nfc:write');
        nfcSocket.on('nfc:write', async (data, ack) => {

            ack = ack || function() {};

            try {
                if (!currentCard || data.uid !== currentCard.uid) {
                    console.log('Current card does not match command card');
                    ack({error: {status: 400, error: 'Current card does not match command card '}});
                }

                if (data.ndef) {
                    console.log('ndef data received for writing.');
                    let buffer = new Buffer(data.ndef, 'base64');
                    await currentCard.writeNdef(buffer);
                } else {
                    console.log('raw data received for writing.');
                    let buffer = new Buffer(data.data, 'base64');
                    await currentCard.write(buffer);
                }
                console.log('data written');

                ack({ success: true });

            } catch (err) {

                console.error(err);
                ack({ error: { code: 500, error: err }});

            }

        });

    });

});


nfc.on('reader', async reader => {

    console.log(`${reader.reader.name}  device attached`);

    try {
        await reader.connect(CONNECT_MODE_DIRECT);
        await reader.setBuzzerOutput(false);
        await reader.disconnect();
    } catch (err) {
        console.info(`initial sequence error`, reader, err);
        await reader.disconnect();
    }

    reader.on('card', async card => {

        console.log('Card detected', card);
        if (!nfcSocket) {
            return;
        }

        // MIFARE Classic is ISO/IEC 14443-3 tag
        // skip other standards
        if (card.type !== TAG_ISO_14443_3) {
            console.log('Invalid card detected');
            return;
        }

        try {
            currentCard = new MifareUltralight(card.uid, reader);

            // notify the clients
            nfcSocket.emit('nfc:card:connect', { uid: card.uid });

        } catch (e) {
            console.error(e);
        }

    });

    reader.on('card.off', card => {
        nfcSocket.emit('nfc:card:disconnect', { uid: card.uid });

        currentCard = null;
        console.log(`${reader.reader.name}  card removed`, card);
    });

    reader.on('error', err => {
        console.log(`${reader.reader.name}  an error occurred`, err);
    });

    reader.on('end', () => {
        console.log(`${reader.reader.name}  device removed`);
    });

});

nfc.on('error', err => {
    console.log('an error occurred', err);
});

exports.nfc = nfc;
