export class Publisher {
    client = null;
    subject = '';

    constructor(client) {
        this.client = client;
    }

    publish(data) {
        return new Promise((resolve, reject) => {
            this.client.publish(this.subject, JSON.stringify(data), (err) => {
                if (err) {
                    return reject(err);
                }
                console.log('Event published to subject', this.subject);
                resolve();
            });
        });
    }
}