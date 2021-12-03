import s from 'shippo';
const shippo = s(process.env.SHIPPO_TOKEN);

export const shippoTransactionCreate = ({
    objectId
}) => {
    console.log(objectId);
    return new Promise((resolve, reject) => {
        shippo.transaction.create({
            "rate": objectId,
            "label_file_type": "PDF",
            "async": false,
        }, function (err, transaction) {
            if (err) {
                return reject(err);
            } else {
                return resolve(transaction);
            }
        });
    });
};