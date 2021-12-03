// eslint-disable-next-line import/prefer-default-export
export const BUYER_CREATED = 'BUYER_CREATED';
export const BUYER_REMOVED = 'BUYER_REMOVED';
export const BUYER_REPLY = 'BUYER_REPLY';
export const SELLER_REPLY = 'SELLER_REPLY';
export const SELLER_ACCEPT = 'SELLER_ACCEPT';
export const SELLER_CANCEL_ACCEPT = 'SELLER_CANCEL_ACCEPT';
export const SYSTEM_CANCEL_ACCEPT = 'SYSTEM_CANCEL_ACCEPT';
export const SELLER_REJECT = 'SELLER_REJECT';
export const BUYER_ACCEPT = 'BUYER_ACCEPT';
export const SOCKET_NOTIFICATION_MESSAGE = 'notification-message';
export const PROPOSAL_BUYER = 'PROPOSAL_BUYER';
export const PROPOSAL_SELLER = 'PROPOSAL_SELLER';
export const UNREAD = 'unread';
export const PROPOSAL_COMMON_NOTIFY = 'proposal.commonNotify';
export const PROPOSAL_DELETE_NOTIFY = 'proposal.deletNotify';
export const QUEUE_ACCEPT_PROPOSAL = 'QUEUE_ACCEPT_PROPOSAL';
export const optionsQueueAcceptProposal = {
  delay: 15000,
  attempts: 2,
  removeOnComplete: true,
  removeOnFail: true,
};
export const sellerAcceptProposalTime = 'seller_accept_proposal_time';
export const ERR_PROPOSAL_STILL_ACCEPTED = 'ERR_PROPOSAL_STILL_ACCEPTED';
