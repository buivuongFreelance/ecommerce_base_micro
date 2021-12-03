/* eslint-disable import/prefer-default-export */
import { ServerMicro } from '@mm_organ/common';

export const getTestAutoAddresses = async (req, res) => {
  try {
    const list = [
      { complete: '38 Appleby Pvt, OTTAWA, ON, K2C 3P4' },
      { complete: 'T-280 Spadina Ave, TORONTO, ON, M5T 3A5' },
      { complete: '678-1333 Broadway O, VANCOUVER, BC, V6H 4C1' },
      { complete: '5 Cannes Cir, TORONTO, ON, M6N 5C9' },
    ];
    return ServerMicro.displaySuccess(res, list);
  } catch (error) {
    return ServerMicro.displayServerError(res);
  }
};
