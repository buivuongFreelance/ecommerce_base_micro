import express from 'express';
import Controller from './controllers/carts';
import middleware from './middleware';

const router = express.Router();
const {
  addToCart, listCart, removeCart, syncCart, syncWishlist, confirmCheckout,
} = Controller;

router.post('/', middleware.validate, addToCart);
router.post('/delete', middleware.validate, removeCart);
router.post('/list', middleware.validate, listCart);
router.post('/anonymous/sync', middleware.validate, syncCart);
router.post('/wishlist/anonymous/sync', middleware.validate, syncWishlist);
router.post('/confirm', middleware.validate, confirmCheckout);
export default router;
