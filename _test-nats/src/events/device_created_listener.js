import { Listener } from "./base_listener";
import { Subjects } from "./subjects";

export class DeviceCreatedListener extends Listener {
    subject = Subjects.DeviceCreated;
    queueGroupName = 'device-service';

    onMessage(data, msg) {
        console.log('Event data!', data);
        msg.ack();
    }
}