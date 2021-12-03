/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
import db from './adapters/db';
import { EXCHANGE, IN_TRANSACTION, SELL } from './config';
import {
  getDingtoiFee, convertMoneyBuyer, convertMoneySeller, formatFixedPrice, getDingtoiFeeSeller,
} from './functions';

export const queryNotTransactionSell = () => db('transactions')
  .select('transactions.device_id');

export const queryNotTransactionExchange = () => db('transactions_exchange')
  .select('device_id');

export const getAllExchangeDevices = async (devices) => {
  const arr = [];
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    arr.push({ ...device, validate: true });
    for (let j = 0; j < device.proposal_exchange_devices; j++) {
      const deviceExchange = device.proposal_exchange_devices[j];
      try {
        const deviceExchangeTransaction = await db('devices').first('id', deviceExchange.id).where('status', IN_TRANSACTION);
        if (!deviceExchangeTransaction) {
          arr[i].validate = false;
          break;
        }
      } catch (error) {
        arr[i].validate = false;
        break;
      }
    }
  }
  return arr;
};

export const serviceListDeviceTransaction = () => new Promise((resolve, reject) => {
  db('devices')
    .select('id')
    .where('status', IN_TRANSACTION)
    .then(resolve)
    .catch(reject);
});

export const listBeforeCheckout = (listExchange, listSell, listDeviceTransactions,
  listCart) => {
  const list = listExchange.concat(listSell);
  const ldts = listDeviceTransactions.map((ldt) => ldt.id);
  const listReturn = [];
  let flag = true;
  for (let i = 0; i < listCart.length; i++) {
    const itemLC = listCart[i];
    listReturn.push({ id: itemLC, validate: false });
    let flagItem = false;
    for (let j = 0; j < list.length; j++) {
      const itemNew = list[j];
      if (itemLC === itemNew.id) {
        let flagLdt = true;
        if (itemNew.proposal_exchange_devices) {
          for (let k = 0; k < itemNew.proposal_exchange_devices.length; k++) {
            if (ldts.includes(itemNew.proposal_exchange_devices[k].id)) {
              flagItem = false;
              flagLdt = false;
              break;
            }
          }
        }
        if (flagLdt) {
          listReturn[i] = { ...itemNew, ...listReturn[i] };
          listReturn[i].validate = true;
          flagItem = true;
          break;
        }
      }
    }
    if (!flagItem) flag = false;
  }
  let total = 0;
  let totalReceive = 0;
  let totalPay = 0;
  let totalDingtoiFee = 0;
  for (let i = 0; i < listReturn.length; i++) {
    const it = listReturn[i];
    it.dingtoiFeeSeller = 0;
    it.isPayMoneyExchange = false;
    let dingtoiFee = 0;
    if (!it.proposal_type) {
      it.default_price = it.real_sale_price;
      dingtoiFee = getDingtoiFee(it.default_price);
      it.price = convertMoneyBuyer(it.real_sale_price, dingtoiFee);
      it.dingtoiFee = dingtoiFee;
      totalPay += formatFixedPrice(it.default_price);
      totalDingtoiFee += dingtoiFee;
    } else if (it.proposal_type === SELL) {
      it.default_price = it.proposal_sale_price;
      dingtoiFee = getDingtoiFee(it.default_price);
      it.price = convertMoneyBuyer(it.proposal_sale_price, dingtoiFee);
      it.dingtoiFee = dingtoiFee;
      totalPay += formatFixedPrice(it.default_price);
      totalDingtoiFee += getDingtoiFee(it.default_price);
    } else if (it.proposal_type === EXCHANGE) {
      it.default_price = it.proposal_exchange_price;
      dingtoiFee = getDingtoiFee(it.default_price);
      if (it.default_price > 0) {
        dingtoiFee = getDingtoiFee(0);
        totalReceive += Number(it.default_price);
        it.dingtoiFeeSeller = getDingtoiFeeSeller(totalReceive);
        totalDingtoiFee += dingtoiFee;
      } else {
        totalPay += formatFixedPrice(Math.abs(it.default_price));
        dingtoiFee = getDingtoiFee(Math.abs(it.default_price));
        it.dingtoiFeeSeller = getDingtoiFeeSeller(0);
        totalDingtoiFee += dingtoiFee;
      }
      it.dingtoiFee = dingtoiFee;
      it.price = convertMoneySeller(it.proposal_exchange_price, dingtoiFee);
    }
    if (!it.proposal_type) {
      total += parseFloat(it.price);
    } else if (it.proposal_type === SELL) {
      total += parseFloat(it.price);
    } else {
      total -= parseFloat(it.price);
    }
  }
  return {
    total: parseFloat(total).toFixed(2),
    totalReceive,
    totalPay,
    totalDingtoiFee,
    validate: flag,
    listReturn,
  };
};
