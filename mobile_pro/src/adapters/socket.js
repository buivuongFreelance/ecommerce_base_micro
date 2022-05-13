const socket = require('socket.io-client')(process.env.SOCKET);

socket.on('connect', () => {
});

export default socket;
