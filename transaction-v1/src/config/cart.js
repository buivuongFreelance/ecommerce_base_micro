import db from '../adapters/db';

export const querySelectCartsByUser = (userId) => {
    return db('carts')
        .select('device_id')
        .innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);
};