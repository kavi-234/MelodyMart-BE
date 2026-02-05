import Cart from '../models/cart.js';
import Instrument from '../models/instrument.js';

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId })
      .populate({
        path: 'items.instrument',
        select: '-image.data'
      });

    if (!cart) {
      return res.json({ items: [], total: 0 });
    }

    // Calculate total - filter out items with missing instruments
    const total = cart.items
      .filter(item => item.instrument && item.instrument.price !== undefined)
      .reduce((sum, item) => {
        return sum + (item.instrument.price * item.quantity);
      }, 0);

    res.json({ items: cart.items, total });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { instrumentId } = req.body;
    const quantity = parseInt(req.body.quantity ?? 1, 10);

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    // Validate instrumentId
    if (!instrumentId) {
      return res.status(400).json({ message: 'Instrument ID is required' });
    }

    // Check if instrument exists and has stock
    const instrument = await Instrument.findById(instrumentId);
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }

    if (instrument.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.userId });
    
    if (!cart) {
      cart = await Cart.create({
        user: req.user.userId,
        items: [{ instrument: instrumentId, quantity }]
      });
    } else {
      // Check if item already in cart
      const existingItem = cart.items.find(
        item => item.instrument.toString() === instrumentId
      );

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        if (instrument.stock < newQuantity) {
          return res.status(400).json({ message: 'Insufficient stock' });
        }
        existingItem.quantity = newQuantity;
      } else {
        // Add new item
        cart.items.push({ instrument: instrumentId, quantity });
      }
      
      await cart.save();
    }

    // Populate and return cart
    await cart.populate({
      path: 'items.instrument',
      select: '-image.data'
    });

    res.json({ message: 'Item added to cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add to cart' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { instrumentId } = req.body;
    const quantity = parseInt(req.body.quantity, 10);

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    // Validate instrumentId
    if (!instrumentId) {
      return res.status(400).json({ message: 'Instrument ID is required' });
    }

    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.find(
      item => item.instrument.toString() === instrumentId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not in cart' });
    }

    // Check stock
    const instrument = await Instrument.findById(instrumentId);
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }
    if (instrument.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    item.quantity = quantity;
    await cart.save();

    await cart.populate({
      path: 'items.instrument',
      select: '-image.data'
    });

    res.json({ message: 'Cart updated', cart });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cart' });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { instrumentId } = req.params;

    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item.instrument.toString() !== instrumentId
    );
    
    await cart.save();

    await cart.populate({
      path: 'items.instrument',
      select: '-image.data'
    });

    res.json({ message: 'Item removed from cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove from cart' });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user.userId },
      { items: [] }
    );

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};
