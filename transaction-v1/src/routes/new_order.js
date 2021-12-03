import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError,
    OrderStatus, OrderSellerStatus, formatFixedPrice,
    OrderSellerType, GlobalEmail, AppEmail, getTotalPayForStripe,
    TransactionStatus, TransactionType, DeviceStatus, localConvertCurrency
} from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';
import Stripe from 'stripe';

const order = require('order-id')('mysecret');
const stripe = Stripe(process.env.STRIPE_API_KEY);

const router = express.Router();

router.post('/api/v1/transaction/order/new', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('amountInfo')
        .trim()
        .notEmpty()
        .withMessage('You must supply an amount info'),
    body('cardName')
        .trim()
        .notEmpty()
        .withMessage('You must supply a card name'),
    body('cardNumber')
        .trim()
        .notEmpty()
        .withMessage('You must supply a card number'),
    body('cvc')
        .trim()
        .notEmpty()
        .withMessage('You must supply a card number'),
    body('exp')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exp'),
    body('shipping')
        .trim()
        .notEmpty()
        .withMessage('You must supply a shipping'),
    body('billing')
        .trim()
        .notEmpty()
        .withMessage('You must supply a billing'),
    body('listConfirm')
        .trim()
        .notEmpty()
        .withMessage('You must supply a list confirm'),
], validateRequest, async (req, res) => {
    const { amountInfo, shipping, billing, listConfirm, cardNumber, cvc, exp } = req.body;
    const { userId } = req;

    const orderNumber = order.generate();
    const orderId = uuidv1();
    const date = new Date();

    const parsedAmountInfo = JSON.parse(amountInfo);
    const parsedShipping = JSON.parse(shipping);
    const parsedBilling = JSON.parse(billing);
    const parsedListConfirm = JSON.parse(listConfirm);

    const { totalMarketFee, totalPay, totalReceive, totalShip, totalShipExchange } = parsedAmountInfo;

    const rowsOrdersSeller = [];
    const rowsTransaction = [];
    const idsDevice = [];

    for (var sellerId in parsedListConfirm) {
        const sellerDevice = parsedListConfirm[sellerId];
        const orderSellerId = uuidv1();
        const orderSellerNumber = order.generate();
        let totalReceive = 0;
        let totalPay = 0;
        let carrier = null;
        sellerDevice.map(itemListConfirm => {
            totalReceive += parseFloat(itemListConfirm.real_sale_price);
            if (itemListConfirm.selectedRate) {
                carrier = itemListConfirm.selectedRate;
            }
            idsDevice.push(itemListConfirm.device_id);
            rowsTransaction.push({
                id: uuidv1(),
                transaction_code: order.generate(),
                order_id: orderId,
                money_buyer_pay: itemListConfirm.real_sale_price,
                status: TransactionStatus.Created,
                created_at: date,
                updated_at: date,
                type: TransactionType.Buyer,
                device_id: itemListConfirm.device_id,
                money_buyer_receive: 0,
                order_seller_id: orderSellerId,
                market_fee_buyer: itemListConfirm.marketFee,
                market_fee_seller: itemListConfirm.marketFeeSeller,
                money_seller_pay: 0,
                money_seller_receive: itemListConfirm.real_sale_price
            });
        });
        totalPay = formatFixedPrice(totalPay);
        totalReceive = formatFixedPrice(totalReceive);
        rowsOrdersSeller.push({
            id: orderSellerId,
            order_id: orderId,
            order_number: orderSellerNumber,
            user_id: sellerId,
            total_receive: totalReceive,
            status: OrderSellerStatus.Created,
            total_pay: totalPay,
            created_at: date,
            updated_at: date,
            type: OrderSellerType.OnlySell,
            total_shipping: localConvertCurrency(carrier.amount, carrier.currency),
            carrier,
        });
    }

    try {
        await db.transaction(async (trx) => {
            await trx('orders').insert({
                id: orderId,
                order_number: orderNumber,
                total_market_fee: totalMarketFee,
                total_shipping: totalShip,
                total_pay: totalPay,
                total_ship_exchange: totalShipExchange,
                user_id: userId,
                total_receive: totalReceive,
                status: OrderStatus.Created,
                ship_name: parsedShipping.name,
                ship_address: parsedShipping.address,
                ship_zip: parsedShipping.zip,
                ship_city_id: parsedShipping.city,
                ship_country_code: parsedShipping.country,
                ship_state_code: parsedShipping.state,
                bill_name: parsedBilling.name,
                bill_address: parsedBilling.address,
                bill_zip: parsedBilling.zip,
                bill_city_id: parsedBilling.city,
                bill_country_code: parsedBilling.country,
                bill_state_code: parsedBilling.state,
                created_at: date,
                updated_at: date,
            });
            await trx.batchInsert('orders_seller', rowsOrdersSeller, 30);
        });

        const expMonth = exp.toString().substring(0, 2);
        const expYear = exp.toString().substring(2, 4);
        const token = await stripe.tokens.create({
            card: {
                number: cardNumber,
                cvc,
                exp_month: expMonth,
                exp_year: expYear,
            },
        });
        const totalPayForStripe = getTotalPayForStripe({
            totalMarketFee,
            totalPay,
            totalShip,
        });

        const charge = await stripe.charges.create({
            amount: Math.ceil(totalPayForStripe),
            currency: 'cad',
            source: token.id,
            description: 'Payment for tomrot',
        });
        const usersGlobal = await db('auth_users').select('id').whereIn('email', [GlobalEmail, AppEmail]);
        const idsGlobal = [];
        usersGlobal.map(us => idsGlobal.push(us.id));
        await db.transaction(async (trx) => {
            await trx('orders').update({
                stripe_charge: charge,
                status: OrderStatus.Paid,
            }).where('id', orderId);
            await trx('orders_seller').update({
                status: OrderSellerStatus.BuyerPaid,
            }).where('order_id', orderId);
            await trx('auth_users_info').increment('wallet', totalPayForStripe).whereIn('user_id', idsGlobal);
            await trx('carts').del().whereIn('device_id', idsDevice);
            await trx('devices').update({
                status: DeviceStatus.InOrder,
            }).whereIn('id', idsDevice);
            await trx.batchInsert('transactions', rowsTransaction, 30);
        });
        res.send({ validate: true, id: orderId });

    } catch (error) {
        console.log(error);
        if (error.type) {
            switch (error.type) {
                case 'StripeCardError':
                    // A declined card error
                    throw new BadRequestError('stripe');
                case 'StripeRateLimitError':
                    // Too many requests made to the API too quickly
                    throw new BadRequestError('stripe');
                case 'StripeInvalidRequestError':
                    // Invalid parameters were supplied to Stripe's API
                    throw new BadRequestError('stripe');
                case 'StripeAPIError':
                    // An error occurred internally with Stripe's API
                    throw new BadRequestError('stripe');
                case 'StripeConnectionError':
                    // Some kind of error occurred during the HTTPS communication
                    throw new BadRequestError('stripe');
                case 'StripeAuthenticationError':
                    // You probably used an incorrect API key
                    throw new BadRequestError('stripe');
                default:
                    // Handle any other types of unexpected errors
                    throw new BadRequestError('stripe');
            }
        } else {
            throw new QueryFailedError();
        }
    }
});

export { router as newOrderRouter };