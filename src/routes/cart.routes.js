import express from 'express';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { isCustomer } from '../middleware/role.middleware.js';

const router = express.Router();

// All cart routes require customer authentication
router.use(protect, isCustomer);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.delete('/remove/:instrumentId', removeFromCart);
router.delete('/clear', clearCart);

export default router;
