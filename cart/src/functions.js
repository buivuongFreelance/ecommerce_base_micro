export const formatFixedPrice = (number) => {
  const num = Number(number);
  return Number(num.toFixed(2));
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
