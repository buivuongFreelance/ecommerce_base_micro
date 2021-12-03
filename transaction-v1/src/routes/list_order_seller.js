import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, ProposalStatus,
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/transaction/orderSeller/list', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('filter')
        .trim()
        .notEmpty()
        .withMessage('You must supply a filter'),
    body('sort')
        .trim()
        .notEmpty()
        .withMessage('You must supply a sort'),
], validateRequest, async (req, res) => {
    const { limit, offset, filter, sort } = req.body;
    const { userId } = req;
    const parsedFilter = JSON.parse(filter);
    const parsedSort = JSON.parse(sort);

    const queryOrders = db('orders_seller')
        .select(
            'orders_seller.*'
        )
        .where('orders_seller.user_id', userId)
        .offset(offset)
        .limit(limit);

    const queryCountOrders = db('orders_seller')
        .count('orders_seller.id', { as: 'count' })
        .where('orders_seller.user_id', userId);

    if (parsedFilter) {
        if (parsedFilter.purchaseNumber) {
            queryOrders.where('orders_seller.order_number', 'ILIKE', `%${parsedFilter.purchaseNumber}%`);
            queryCountOrders.where('orders_seller.order_number', 'ILIKE', `%${parsedFilter.purchaseNumber}%`);
        }
        if (parsedFilter.status) {
            queryOrders.where('orders_seller.status', parsedFilter.status);
            queryCountOrders.where('orders_seller.status', parsedFilter.status);
        }
    }
    if (parsedSort) {
        if (parsedSort.purchaseNumber) {
            queryOrders.orderBy('orders_seller.order_number', parsedSort.purchaseNumber);
        } else if (parsedSort.price) {
            queryOrders.orderBy('orders_seller.total_money', parsedSort.price);
        } else if (parsedSort.status) {
            queryOrders.orderBy('orders_seller.status', parsedSort.status);
        } else if (parsedSort.createdAt) {
            queryOrders.orderBy('orders_seller.created_at', parsedSort.createdAt);
        } else {
            queryOrders.orderBy('orders_seller.created_at', 'desc');
        }
    }

    try {
        const list = await queryOrders;
        const count = await queryCountOrders.first();
        res.send({
            list: list,
            count: count.count,
        });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as listOrderSellerRouter };