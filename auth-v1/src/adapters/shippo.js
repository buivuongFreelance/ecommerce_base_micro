import s from 'shippo';
const shippo = s(process.env.SHIPPO_TOKEN);

export const shippoAddressCreate = ({
    name,
    street,
    city,
    state,
    zip,
    country,
    email,
}) => {
    return new Promise((resolve, reject) => {
        shippo.address.create({
            "name": name,
            "company": "Tomrot",
            "street1": street,
            "city": city,
            "state": state,
            "zip": zip,
            "country": country,
            "email": email,
            "validate": true
        }, function (err, address) {
            if (err) {
                reject(err);
            } else {
                resolve(address);
            }
        });
    });
};