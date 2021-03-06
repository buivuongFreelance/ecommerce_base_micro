// eslint-disable-next-line import/prefer-default-export
export const SELLER_ACCEPT = 'SELLER_ACCEPT';
export const BUYER_ACCEPT = 'BUYER_ACCEPT';
export const BUYER_REJECTED = 'BUYER_REJECTED';
export const SELL = 'sell';
export const EXCHANGE = 'exchange';
export const CREATED = 'CREATED';
export const OWNER_SCANNED = 'OWNER_SCANNED';
export const GROUP = 'GROUP';
export const BUYER = 'BUYER';
export const SELLER = 'SELLER';
export const IN_TRANSACTION = 'IN_TRANSACTION';
export const NOTIFY_ORDER_CREATED = 'NOTIFY_ORDER_CREATED';
export const NOTIFY_ORDER_SELLER_PAYMENT = 'NOTIFY_ORDER_SELLER_PAYMENT';
export const UNREAD = 'unread';
export const ORDER = 'order';
export const DINGTOI_USER = 'dingtoi@gmail.com';
export const GLOBAL_USER = 'global@dingtoi.com';
export const SOCKET_NOTIFICATION_MESSAGE = 'notification-message';
export const WAITING_FOR_DEVICE_PAYMENT = 'WAITING_FOR_DEVICE_PAYMENT';
export const DEVICE_PAYMENT = 'DEVICE_PAYMENT';
export const ORDER_SELLER_STATUS = {
  PROCESSING: 'PROCESSING',
  CREATED: 'CREATED',
  WAITING_FOR_DEVICE_PAYMENT: 'WAITING_FOR_DEVICE_PAYMENT',
  COMPLETED: 'COMPLETED',
};
export const ORDER_STATUS = {
  PROCESSING: 'PROCESSING',
  CREATED: 'CREATED',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  SYSTEM_CANCELLED: 'SYSTEM_CANCELLED',
  SYSTEM_CANCELLED_NOT_PAY_SHIP: 'SYSTEM_CANCELLED_NOT_PAY_SHIP',
};
export const TRANSACTION_STATUS = {
  CREATED: 'CREATED',
  OWNER_SCANNED: 'OWNER_SCANNED',
  BUYER_RECEIVED: 'BUYER_RECEIVED',
  SHIPPED: 'SHIPPED',
  READY: 'READY',
  TO_BE_SHIPPED: 'TO_BE_SHIPPED',
  BUYER_ACCEPT: 'BUYER_ACCEPT',
  BUYER_REJECTED: 'BUYER_REJECTED',
  SYSTEM_CANCELLED: 'SYSTEM_CANCELLED',
};
export const TRANSACTION_SUMMARY = 'transaction-summary';
export const TRANSACTION_LOCK_SUMMARY = 'transactionCodeLockScan-summary';

export const QUEUE = {
  CREATE_ORDER: 'QUEUE_CREATE_ORDER',
  SELLER_PAY_SHIP: 'QUEUE_SELLER_PAY_SHIP',
  SELLER_MUST_SCAN: 'QUEUE_SELLER_MUST_SCAN',
  OPTION_DEFAULT: {
    delay: 15000,
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: true,
  },
};

export const TIMER = {
  TRANSACTION_SELLER_PAY_CHECKOUT: 'transaction_seller_pay_checkout_timer',
  TRANSACTION_SELLER_MUST_SCAN: 'transaction_seller_must_scan_timer',
};

export const TYPE = {
  TIMER_TRANSACTION: 'TIMER_TRANSACTION',
  TIMER_ORDER_SELLER: 'TIMER_ORDER_SELLER',
  TRANSACTION: 'TRANSACTION',
  ORDER: 'order',
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
};

export const NOTIFY = {
  TRANSACTION_SUBMIT_PASSCODE: 'SUBMIT_PASSCODE',
  TRANSACTION_BUYER_RECEIVED: 'BUYER_RECEIVED',
  TRANSACTION_STARTED: 'STARTED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_SALE_CANCELLED: 'ORDER_SALE_CANCELLED',
  ORDER_SELLER_PAY_SHIP: 'ORDER_SELLER_PAY_SHIP',
};

export const DEVICE_STATUS = {
  POSTED: 'POSTED',
  WAITING_FOR_SCAN: 'WAITING_FOR_SCAN',
  CREATED: 'CREATED',
};

export const ORDER_BUYER = 'ORDER_BUYER';
export const ORDER_SELLER = 'ORDER_SELLER';
export const SCANNED_POSTED_DEVICE = 'SCANNED_POSTED_DEVICE';
export const SCANNED_OWNER_DEVICE = 'SCANNED_OWNER_DEVICE';
export const COMPLETED = 'COMPLETED';
