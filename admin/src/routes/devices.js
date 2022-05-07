import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

const queryDevice = (type) => {
    const query = db('devices')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .innerJoin('models', 'models.id', 'imeis.model_id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id');

    if (type === 'select') {
        query.select(
            'devices.id as device_id',
            'devices.status as device_status',
            'models.name as device_name',
            'auth_users.email as seller_email'
        );
    } else {
        query.first(
            'devices.id as device_id',
            'devices.status as device_status',
            'models.name as device_name',
            'auth_users.email as seller_email'
        );
    }

    query.orderBy('devices.created_at', 'desc');

    return query;
};

router.get('/api/v1/admin/devices', validateAuth, async (req, res) => {
    try {
        const { userId } = req;
        const devices = await queryDevice('select');
        return res.send({ list: devices });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as devicesRouter };