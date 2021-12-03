export default {
  calculatePhysicalGrading: (point) => {
    const number = Number(point);
    if (number === 50) {
      return 'A';
    } if (number === 40) {
      return 'B';
    } if (number === 30) {
      return 'C';
    }
    return 'D';
  },
  // eslint-disable-next-line no-unused-vars
  convertMoneySellForBuyer: (number, ratioPrice) => {
    const realNumber = Number(number);
    // realNumber += Number(ratioPrice);
    return realNumber;
  },
  // eslint-disable-next-line no-unused-vars
  convertMoneyExchangeForBuyer: (number, ratioPrice) => {
    let realNumber = Number(number);
    const realNumberRatio = 0;
    if (realNumber <= 0) {
      realNumber -= realNumberRatio;
    } else {
      realNumber += realNumberRatio;
    }
    return realNumber;
  },
};
