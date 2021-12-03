import { Publisher } from "./base_publisher";
import { Subjects } from "./subjects";

export class DeviceCreatedPublisher extends Publisher {
    subject = Subjects.DeviceCreated;
}