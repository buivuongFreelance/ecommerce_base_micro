import express from 'express';
import middleware from './middleware';
import Controller, { checkProposalsTimeout } from './controllers/proposal';

const router = express.Router();
const {
  addBuyerCreatedProposal, detailProposal, buyerDeleteProposal, sellerDeleteProposal,
  updateBuyerReplyProposal, listProposal,
  updateSellerReplyProposal, buyerCancelAcceptProposal,
  sellerAcceptProposal, sellerCancelAcceptProposal, sellerRejectProposal, buyerAcceptProposal,
  sellerCancelReplyProposal,
} = Controller;

router.post('/buyerCreated', middleware.validate, addBuyerCreatedProposal);
router.post('/buyerReply', middleware.validate, updateBuyerReplyProposal);
router.post('/sellerReply', middleware.validate, updateSellerReplyProposal);
router.post('/sellerAccept', middleware.validate, sellerAcceptProposal);
router.post('/sellerCancelAccept', middleware.validate, sellerCancelAcceptProposal);
router.post('/sellerReject', middleware.validate, sellerRejectProposal);
router.post('/sellerCancelReply', middleware.validate, sellerCancelReplyProposal);
router.post('/buyerAccept', middleware.validate, buyerAcceptProposal);
router.post('/buyerCancelAccept', middleware.validate, buyerCancelAcceptProposal);
router.post('/list', middleware.validate, listProposal);
router.get('/:id', middleware.validate, detailProposal);
router.post('/buyerDeleteProposal', middleware.validate, buyerDeleteProposal);
router.post('/checkProposalsTimeout', middleware.validate, checkProposalsTimeout);
router.delete('/seller/:id', middleware.validate, sellerDeleteProposal);
export default router;
