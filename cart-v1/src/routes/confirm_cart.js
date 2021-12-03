import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, ProposalStatus, DeviceStatus, DeviceType,
    convertMoneyBuyer, formatFixedPrice,
    getMarketFee
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

const getListExchange = async (userId) => new Promise((resolve, reject) => {
    const subquery = db('carts').select('carts.id').innerJoin('proposals', 'proposals.cart_id', 'carts.id')
        .where('proposals.status', ProposalStatus.SellerAccept)
        .orWhere('proposals.status', ProposalStatus.BuyerAccepted);

    db('carts')
        .innerJoin('devices', 'carts.device_id', 'devices.id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('rams', 'rams.id', 'devices.ram_id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
        .innerJoin('shippings', 'shippings.user_id', 'auth_users.id')
        .innerJoin('states', 'states.code', 'shippings.state_code')
        .innerJoin('cities', 'cities.id', 'shippings.city_id')
        .innerJoin('countries', 'countries.country_code_alpha2', 'shippings.country_code')
        .select(
            'carts.id',
            'carts.user_id',
            'carts.device_id',
            'rams.value as ram_value',
            'colors.name as color',
            'capacities.value as capacity',
            'models.name as model',
            'models.physical_shipping',
            'categories.name as category_name',
            'brands.name as brand_name',
            'device_images.url',
            'available_devices.real_sale_price',
            'proposals.id as proposal_id',
            'proposals.type as proposal_type',
            'proposals.exchange_devices as proposal_exchange_devices',
            'proposals.buyer_real_sale_price as proposal_sale_price',
            'proposals.buyer_real_exchange_price as proposal_exchange_price',
            'shippings.address',
            'shippings.first_name',
            'shippings.last_name',
            'states.code as state_code',
            'states.name as state',
            'cities.state_code as city_code',
            'cities.name as city',
            'shippings.zip as zip',
            'countries.country_code_alpha2 as country_code',
            'auth_users.id as seller_id',
            'auth_users.email as seller_email',
        )
        .whereNotNull('available_devices.proposal_id')
        .whereIn('carts.id', subquery)
        .where('carts.user_id', userId)
        .where('devices.status', DeviceStatus.Posted)
        .orderBy('carts.created_at', 'desc')
        .then(resolve)
        .catch(reject);
});

const getListSell = async ({ userId, listCart }) => new Promise((resolve, reject) => {
    // const subquery = db('carts').select('carts.id').innerJoin('proposals', 'proposals.cart_id', 'carts.id')
    //     .where('proposals.status', ProposalStatus.SellerAccept)
    db('carts')
        .innerJoin('devices', 'carts.device_id', 'devices.id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('rams', 'rams.id', 'devices.ram_id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .innerJoin('shippings', 'shippings.user_id', 'auth_users.id')
        .innerJoin('states', 'states.code', 'shippings.state_code')
        .innerJoin('cities', 'cities.id', 'shippings.city_id')
        .innerJoin('countries', 'countries.country_code_alpha2', 'shippings.country_code')
        .leftJoin('proposals', 'proposals.cart_id', 'carts.id')
        .select(
            'carts.id',
            'carts.user_id',
            'carts.device_id',
            'rams.value as ram_value',
            'colors.name as color',
            'capacities.value as capacity',
            'models.name as model',
            'models.physical_shipping',
            'categories.name as category_name',
            'brands.name as brand_name',
            'device_images.url',
            'shippings.address',
            'shippings.first_name',
            'shippings.last_name',
            'states.code as state_code',
            'states.name as state',
            'cities.state_code as city_code',
            'cities.name as city',
            'shippings.zip as zip',
            'countries.country_code_alpha2 as country_code',
            'available_devices.sale_price',
            'available_devices.real_sale_price',
            'auth_users.id as seller_id',
            'auth_users.email as seller_email',
            'proposals.price.buyer_real_sale_price as proposal_price'
        )
        .where('carts.type', DeviceType.Sell)
        .where('proposals.status', ProposalStatus.SellerAccept)
        .whereIn('carts.id', listCart)
        .where('carts.user_id', userId)
        .where('devices.status', DeviceStatus.Posted)
        .orderBy('carts.created_at', 'desc')
        .then(resolve)
        .catch((error) => console.log(error));
});

export const listBeforeCheckout = (
    { listExchange, listSell, listCart }
) => {
    let flag = true;
    const listReturn = listExchange.concat(listSell);
    //const ldts = listDeviceTransactions.map((ldt) => ldt.id);
    // let flag = true;
    // for (let i = 0; i < listCart.length; i++) {
    //     const itemLC = listCart[i];
    //     listReturn.push({ id: itemLC, validate: false });
    //     let flagItem = false;
    //     for (let j = 0; j < list.length; j++) {
    //         const itemNew = list[j];
    //         if (itemLC === itemNew.id) {
    //             let flagLdt = true;
    //             if (itemNew.proposal_exchange_devices) {
    //                 for (let k = 0; k < itemNew.proposal_exchange_devices.length; k++) {
    //                     if (ldts.includes(itemNew.proposal_exchange_devices[k].id)) {
    //                         flagItem = false;
    //                         flagLdt = false;
    //                         break;
    //                     }
    //                 }
    //             }
    //             if (flagLdt) {
    //                 listReturn[i] = { ...itemNew, ...listReturn[i] };
    //                 listReturn[i].validate = true;
    //                 flagItem = true;
    //                 break;
    //             }
    //         }
    //     }
    //     if (!flagItem) flag = false;
    // }
    let total = 0;
    let totalReceive = 0;
    let totalPay = 0;
    let totalMarketFee = 0;
    for (let i = 0; i < listReturn.length; i++) {
        const it = listReturn[i];
        it.validate = true;
        it.marketFeeSeller = 0;
        it.isPayMoneyExchange = false;
        let marketFee = 0;
        if (!it.proposal_type) {
            it.default_price = it.real_sale_price;
            marketFee = getMarketFee(it.default_price);
            it.price = convertMoneyBuyer(it.real_sale_price, marketFee);
            it.marketFee = marketFee;
            totalPay += formatFixedPrice(it.default_price);
            totalMarketFee += marketFee;
        } else if (it.proposal_type === DeviceType.Sell) {
            console.log('vo ne');
            // it.default_price = it.proposal_sale_price;
            // dingtoiFee = getDingtoiFee(it.default_price);
            // it.price = convertMoneyBuyer(it.proposal_sale_price, dingtoiFee);
            // it.dingtoiFee = dingtoiFee;
            // totalPay += formatFixedPrice(it.default_price);
            // totalDingtoiFee += getDingtoiFee(it.default_price);
        } else if (it.proposal_type === EXCHANGE) {
            // it.default_price = it.proposal_exchange_price;
            // dingtoiFee = getDingtoiFee(it.default_price);
            // if (it.default_price > 0) {
            //     dingtoiFee = getDingtoiFee(0);
            //     totalReceive += Number(it.default_price);
            //     it.dingtoiFeeSeller = getDingtoiFeeSeller(totalReceive);
            //     totalDingtoiFee += dingtoiFee;
            // } else {
            //     totalPay += formatFixedPrice(Math.abs(it.default_price));
            //     dingtoiFee = getDingtoiFee(Math.abs(it.default_price));
            //     it.dingtoiFeeSeller = getDingtoiFeeSeller(0);
            //     totalDingtoiFee += dingtoiFee;
            // }
            // it.dingtoiFee = dingtoiFee;
            // it.price = convertMoneySeller(it.proposal_exchange_price, dingtoiFee);
        }
        if (!it.proposal_type) {
            total += parseFloat(it.price);
        } else if (it.proposal_type === SELL) {
            //total += parseFloat(it.price);
        } else {
            //total -= parseFloat(it.price);
        }
    }
    return {
        total: parseFloat(total).toFixed(2),
        totalReceive,
        totalPay,
        totalMarketFee,
        validate: flag,
        listReturn,
    };
};

router.post('/api/v1/cart/confirm', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('listCart')
        .trim()
        .notEmpty()
        .withMessage('You must supply list cart'),
], validateRequest, async (req, res) => {
    const { userId } = req;
    const { listCart } = req.body;

    const parsedListCart = JSON.parse(listCart);
    //const listExchange = await getListExchange(userId);
    const listExchange = [];
    //const listDeviceTransactions = await serviceListDeviceTransaction();
    const listSell = await getListSell({ userId, listCart: parsedListCart });

    try {
        const {
            total,
            totalReceive,
            totalMarketFee,
            totalPay,
            validate,
            listReturn,
        } = listBeforeCheckout({ listExchange, listSell, listCart: parsedListCart });
        const listFailed = [];

        const listGroupedSell = listReturn.reduce(function (r, a) {
            if (a.proposal_type !== DeviceType.Exchange) {
                r[a.seller_id] = r[a.seller_id] || [];
                r[a.seller_id].push(a);
                if (!a.validate) {
                    listFailed.push(a.id);
                }
            }
            return r;
        }, Object.create(null));

        //const listFinal = { ...listGroupedSell, ...listGroupedExchange };
        const listFinal = { ...listGroupedSell };

        res.send({
            total,
            totalMarketFee,
            totalPay,
            totalReceive,
            list: listFinal,
            validate,
            listFailed,
        });
    } catch (error) {
        console.log(error);
    }
});

export { router as confirmCartRouter };