import express from 'express';
import { validateRequest, ProposalStatus, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import { validateAuth } from '../middleware/validate';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/device/listByAccount', validateAuth, [
    body('offset')
        .trim()
        .isNumeric({ min: 0, max: 200 })
        .withMessage('You must supply an offset'),
    body('limit')
        .trim()
        .notEmpty()
        .withMessage('You must supply an limit'),
], validateRequest, async (req, res) => {
    const {
        offset, limit, filterDeviceName, filterStatus, filterGrade,
        sortDeviceName, sortPhysicalGrading, sortStatus,
    } = req.body;
    const { userId } = req;

    const query = db('devices')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .leftJoin('transactions', 'transactions.device_id', 'devices.id')
        .leftJoin('transactions_exchange', 'transactions_exchange.device_id', 'devices.id')
        .leftJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .leftJoin('orders', 'orders.id', 'orders_seller.order_id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('auth_users', 'auth_users.id', 'orders.user_id')
        .leftJoin(
            db('carts').select(db.raw('count(proposals.id) as count'), 'carts.device_id')
                .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
                .groupBy('proposals.id', 'carts.device_id')
                .where('proposals.status', '<>', ProposalStatus.SystemCancelAccept)
                .as('carts'),
            // eslint-disable-next-line func-names
            function () {
                this.on('devices.id', '=', 'carts.device_id');
            },
        )
        .distinctOn('models.name', 'devices.physical_grading', 'devices.status', 'devices.created_at')
        .select(
            'devices.physical_grading',
            'devices.status',
            'devices.created_at',
            'devices.id',
            'imeis.id as imei_id',
            'imeis.imei as imei',
            'imeis.other_detail',
            'imeis.original_price',
            'rams.id as ram_id',
            'rams.value as ram',
            'colors.id as color_id',
            'colors.name as color',
            'capacities.id as capacity_id',
            'capacities.value as capacity',
            'models.id as model_id',
            'models.name as model',
            'categories.id as category_id',
            'categories.name as category_name',
            'brands.id as brand_id',
            'brands.name as brand_name',
            'carts.count as proposals',
            'transactions.id as transaction_id',
            'transactions.status as transaction_status',
            'transactions.type as transaction_type',
            'transactions_exchange.id as transaction_exchange_id',
            'orders_seller.stripe_charge as stripe_charge',
            'transactions_exchange.status as transaction_exchange_status',
            'orders_seller.id as order_seller_id',
            'orders.id as order_id',
            'auth_users.email as transaction_email_buyer',
        )
        .where('models.name', 'ILIKE', `%${filterDeviceName}%`)
        .where('devices.status', 'like', `%${filterStatus}%`)
        .where('devices.physical_grading', 'like', `%${filterGrade}%`)
        .where('devices.user_id', userId)
        .offset(offset)
        .limit(limit);
    if (sortDeviceName) {
        query.orderBy('models.name', sortDeviceName);
    } else if (sortPhysicalGrading) {
        query.orderBy('devices.physical_grading', sortPhysicalGrading);
    } else if (sortStatus) {
        query.orderBy('devices.status', sortStatus);
    } else {
        query.orderBy('devices.created_at', 'desc');
    }

    try {
        const list = await query;
        const count = await db('devices')
            .join('imeis', 'devices.imei_id', 'imeis.id')
            .innerJoin('models', 'imeis.model_id', 'models.id')
            .count('devices.id', { as: 'count' })
            .where('devices.user_id', userId)
            .where('models.name', 'ILIKE', `%${filterDeviceName}%`)
            .where('devices.status', 'like', `%${filterStatus}%`)
            .where('devices.physical_grading', 'like', `%${filterGrade}%`)
            .first();
        res.send({
            list,
            count: count.count,
        });
    } catch (err) {
        console.log(err)
        throw new QueryFailedError();
    }
});

export { router as listAccountDeviceRouter };