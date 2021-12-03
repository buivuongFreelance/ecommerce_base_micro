import nats from 'node-nats-streaming';
import { DeviceCreatedPublisher } from './events/device_created_publisher';

console.clear();

const stan = nats.connect('tomrot', 'abc', {
    url: 'http://localhost:4222'
});

stan.on('connect', async () => {
    console.log('Publisher connected to NATS');

    const publisher = new DeviceCreatedPublisher(stan);
    try {
        await publisher.publish({
            id: '123',
            title: 'concert',
            price: 20
        });
    } catch (err) {
        console.log(err);
    }

    // const data = JSON.stringify({
    //     id: '123',
    //     title: 'concert',
    //     price: 20
    // });

    // stan.publish('device:created', data, () => {
    //     console.log('Event Published');
    // });
});