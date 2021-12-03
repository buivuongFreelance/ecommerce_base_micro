/* eslint-disable array-callback-return */
/* eslint-disable no-plusplus */

import { TRANSACTION_STATUS } from './config';

export const censorWord = (str) => str[0] + str[1] + str[2] + '*'.repeat(4) + str.slice(-3);

export const censorDomain = () => '*'.repeat(4);

export const censorEmail = (email) => {
  const arr = email.split('@');
  return `${censorWord(arr[0])}@${censorDomain(arr[1])}`;
};

export const formatFixedPrice = (number) => {
  const num = Number(number);
  return Number(num.toFixed(2));
};

export const getDingtoiFeeSeller = (number) => {
  const num = parseFloat(Math.abs(number));
  let ratio = 0;
  if (num === 0 || num <= 50) {
    return 5;
  }
  if (num > 600) {
    ratio = 3;
  }

  if (num > 50 && num <= 100) {
    ratio = 10;
  } else if (num > 100 && num <= 200) {
    ratio = 8;
  } else if (num > 200 && num <= 300) {
    ratio = 7;
  } else if (num > 300 && num <= 400) {
    ratio = 6;
  } else if (num > 400 && num <= 500) {
    ratio = 5;
  } else if (num > 500 && num <= 600) {
    ratio = 4;
  }
  const addi = (ratio * num) / 100;
  return Number(parseFloat(addi).toFixed(2));
};

export const getDingtoiFee = (number) => {
  const num = parseFloat(Math.abs(number));
  let ratio = 0;
  if (num === 0 || num <= 50) {
    return 5;
  }
  if (num > 600) {
    return 10;
  }

  if (num > 50 && num <= 100) {
    ratio = 6;
  } else if (num > 100 && num <= 200) {
    ratio = 5;
  } else if (num > 200 && num <= 300) {
    ratio = 4;
  } else if (num > 300 && num <= 400) {
    ratio = 3;
  } else if (num > 400 && num <= 500) {
    ratio = 2;
  } else if (num > 500 && num <= 600) {
    ratio = 1;
  }
  const addi = (ratio * num) / 100;
  return Number(parseFloat(addi).toFixed(2));
};

export const convertMoneySeller = (number, dingtoiFee) => {
  let num = parseFloat(number);

  if (num === 0 || num <= 50) {
    return -dingtoiFee;
  }
  if (num > 600) {
    return -dingtoiFee;
  }

  if (num > 0) {
    num -= dingtoiFee;
  } else {
    num += dingtoiFee;
  }
  return parseFloat(num).toFixed(2);
};

export const convertMoneyBuyer = (number, dingtoiFee) => {
  let num = parseFloat(number);
  num += dingtoiFee;
  return parseFloat(num).toFixed(2);
};

export const mapArrObjToArr = (arr, key) => {
  const arrNew = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    arrNew.push(item[key]);
  }
  return arrNew;
};

export const convertArrToSql = (arr) => {
  if (arr.length === 0) return '';
  let str = '(';
  arr.map((item, index) => {
    if (index < arr.length - 1) {
      str += `'${item}',`;
    } else {
      str += `'${item}'`;
    }
  });
  str += ')';
  return str;
};

export const checkDeviceScanOrNotScan = (arr) => {
  const arrScan = [];
  const arrNotScan = [];
  const arrAdded = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item.status !== TRANSACTION_STATUS.SYSTEM_CANCELLED) {
      if (item.sale_price === null) {
        arrAdded.push(item.device_id);
      } else if (item.device_scan_id) {
        arrScan.push(item.device_id);
      } else {
        arrNotScan.push(item.device_id);
      }
    }
  }
  return { arrScan, arrNotScan, arrAdded };
};
