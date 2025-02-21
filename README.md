NFC socket.io server
====================

A webservice that exposes NFC methods through a socket.io connection.
Currently mainly aimed towards reading and writing NDEF messages on NTAG213 for cashless drinks app [CatLab Drinks](https://drinks.catlab.eu).

Setup on Ubuntu
---------------
We are running our service on a Raspberry Pi 3 running Ubuntu, but these instructions should be working on all Ubuntu/Debian machines.

```
sudo apt install libtool-bin
sudo apt install libpcsclite1 libpcsclite-dev
sudo apt install pcscd
npm install
```

Make sure libnfc is working and that you blacklist the required modules.
https://github.com/nfc-tools/libnfc

Password
--------
In order to prevent unauthorized access to the reader you need to setup a password 
in your .env file (or in your environment variables).

```
cp .env.example .env
nano .env
``` 

And add a password at ```NFC_PASSWORD=```

Starting the app
----------------
Now simply run `node index.js` to start the service.

The chosen password and seleted http port will appear in the terminal window. Enter the password 'localhost:3000' (or domain name) 
in your drinks app and check if the NFC label turns green.

SSL
---
Your browser will block websites loaded over https from accessing unencrypted websites, so 
in order for your webapp to be able to connect to this service you will need to load the 
webapp over unencrypted http access, or implement encryption by adding an apache/nginx reverse proxy 
and purchasing an ssl certificate on top of this service.

LED & Beeper:
-------------
In order to disable the beeper we need to disable a security measure:

https://github.com/pokusew/nfc-pcsc/issues/13

Start on boot
-------------
Now make sure the service automatically starts when turning on the system: (We are using PM2, but there are various alternatives)
https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps

```
pm2 startup
```