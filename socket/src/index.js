import { ConfigSocket, ConfigDomain } from '@mm_organ/common';

const { SOCKET_NOTIFICATION_MESSAGE, SOCKET_NOTIFICATION_CLIENT } = ConfigSocket;
const { DOMAIN_SOCKET_PORT } = ConfigDomain;
const server = require('http').createServer();

const io = require('socket.io')(server);

io.on('connect', (socket) => {
  socket.on(SOCKET_NOTIFICATION_MESSAGE, (data) => {
    io.emit(SOCKET_NOTIFICATION_CLIENT, data);
  });
});
server.listen(DOMAIN_SOCKET_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`app is listening to port ${DOMAIN_SOCKET_PORT}`);
});
