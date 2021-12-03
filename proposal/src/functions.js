/* eslint-disable arrow-body-style */
/* eslint-disable no-plusplus */
import { SELLER_ACCEPT } from './config';

export const censorWord = (str) => {
  return str[0] + str[1] + str[2] + '*'.repeat(4) + str.slice(-3);
};

export const censorDomain = () => {
  return '*'.repeat(4);
};

export const censorEmail = (email) => {
  const arr = email.split('@');
  return `${censorWord(arr[0])}@${censorDomain(arr[1])}`;
};

// eslint-disable-next-line import/prefer-default-export
export const convertMoneySellForSeller = (number, ratioPrice) => {
  let realNumber = Number(number);
  const realNumberRatio = 0;
  realNumber += Number(realNumberRatio);
  return realNumber;
};

export const convertMoneyExchangeForSeller = (number, ratioPrice) => {
  let realNumber = Number(number);
  const realNumberRatio = 0;
  if (realNumber < 0) {
    realNumber -= realNumberRatio;
    realNumber = Math.abs(realNumber);
  } else {
    realNumber += realNumberRatio;
    realNumber = -realNumber;
  }
  return realNumber;
};

export const convertMoneySellForBuyer = (number, ratioPrice) => {
  let realNumber = Number(number);
  const realNumberRatio = 0;
  realNumber -= realNumberRatio;
  return realNumber;
};

export const convertMoneyExchangeForBuyer = (number, ratioPrice) => {
  let realNumber = Number(number);
  const realNumberRatio = 0;
  if (realNumber < 0) {
    realNumber -= realNumberRatio;
  } else {
    realNumber += realNumberRatio;
  }
  return realNumber;
};

export const errorProposalSuccess = (res) => res.status(400).json({
  obj: SELLER_ACCEPT,
});

export const mapArrObjToArr = (arr, key) => {
  const arrNew = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    arrNew.push(item[key]);
  }
  return arrNew;
};
