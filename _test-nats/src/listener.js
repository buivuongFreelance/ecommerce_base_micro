import nats from 'node-nats-streaming';
import { randomBytes } from 'crypto';
import { DeviceCreatedListener } from './events/device_created_listener';

console.clear();

const stan = nats.connect('tomrot', randomBytes(4).toString('hex'), {
    url: 'http://localhost:4222'
});

stan.on('connect', () => {
    console.log('Listener connected to NATS');

    stan.on('close', () => {
        console.log('NATS connection closed!');
        process.exit();
    });

    new DeviceCreatedListener(stan).listen();

});

process.on('SIGINT', () => stan.close());
process.on('SIGTERM', () => stan.close());