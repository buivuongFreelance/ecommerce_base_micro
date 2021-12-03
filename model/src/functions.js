/* eslint-disable import/prefer-default-export */
/* eslint-disable array-callback-return */
/* eslint-disable no-plusplus */
export const mapArrObjToArr = (arr, key) => {
  const arrNew = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    arrNew.push(item[key]);
  }
  return arrNew;
};

export const checkDeviceScanOrNotScan = (arr) => {
  const arrScan = [];
  const arrNotScan = [];
  const arrAdded = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item.sale_price === null) {
      arrAdded.push(item.device_id);
    } else if (item.device_scan_id) {
      arrScan.push(item.device_id);
    } else {
      arrNotScan.push(item.device_id);
    }
  }
  return { arrScan, arrNotScan, arrAdded };
};
