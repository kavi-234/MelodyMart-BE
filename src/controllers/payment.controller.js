import crypto from 'crypto';
import Cart from '../models/cart.js';
import Order from '../models/order.js';
import User from '../models/user.js';

const getPayHereCheckoutUrl = () => {
  return process.env.PAYHERE_MODE === 'live'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';
};

const buildOrderId = () => {
  return `MM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const buildCustomerName = (name) => {
  const parts = String(name || 'Customer').trim().split(/\s+/);
  return {
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || 'Buyer',
  };
};

const getMd5Hex = (value) => crypto.createHash('md5').update(String(value)).digest('hex').toUpperCase();

const buildCartFingerprint = ({ items, amount, currency }) => {
  const normalizedItems = [...items]
    .map((item) => ({
      instrument: String(item.instrument),
      name: String(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity),
    }))
    .sort((left, right) => left.instrument.localeCompare(right.instrument));

  return getMd5Hex(JSON.stringify({ items: normalizedItems, amount: Number(amount).toFixed(2), currency }));
};

const resolvePayHereNotifyUrl = () => {
  const configuredNotifyUrl = process.env.PAYHERE_NOTIFY_URL?.trim();
  const fallbackBackendUrl = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  const fallbackNotifyUrl = `${fallbackBackendUrl}/api/payments/payhere/notify`;

  if (!configuredNotifyUrl) {
    return fallbackNotifyUrl;
  }

  if (configuredNotifyUrl.includes('your-backend-ngrok-url')) {
    console.warn('PAYHERE_NOTIFY_URL is still using the placeholder value; falling back to BACKEND_URL for checkout initiation.');
    return fallbackNotifyUrl;
  }

  return configuredNotifyUrl;
};

export const initiatePayHereCheckout = async (req, res) => {
  try {
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const currency = process.env.PAYHERE_CURRENCY || 'LKR';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const notifyUrl = resolvePayHereNotifyUrl();

    if (!merchantId || !merchantSecret) {
      return res.status(500).json({
        message: 'PayHere is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET in the backend .env file.',
      });
    }

    const cart = await Cart.findOne({ user: req.user.userId }).populate({
      path: 'items.instrument',
      select: '-image.data',
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const user = await User.findById(req.user.userId).select('name email phone address');
    const orderId = buildOrderId();

    const items = cart.items
      .filter((item) => item.instrument)
      .map((item) => ({
        instrument: item.instrument._id,
        name: item.instrument.name,
        price: Number(item.instrument.price),
        quantity: Number(item.quantity),
      }));

    const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartFingerprint = buildCartFingerprint({ items, amount, currency });
    let checkoutOrderId = buildOrderId();

    let order = await Order.findOne({
      user: req.user.userId,
      paymentProvider: 'payhere',
      status: 'PENDING',
      cartFingerprint,
    });

    if (!order) {
      order = await Order.create({
        user: req.user.userId,
        orderId: checkoutOrderId,
        items,
        amount,
        currency,
        status: 'PENDING',
        paymentProvider: 'payhere',
        cartFingerprint,
        customer: {
          name: user?.name || 'Customer',
          email: user?.email || '',
          phone: user?.phone || '',
          address: user?.address || '',
        },
      });
    } else {
      checkoutOrderId = order.orderId;
      order.items = items;
      order.amount = amount;
      order.currency = currency;
      order.customer = {
        name: user?.name || order.customer?.name || 'Customer',
        email: user?.email || order.customer?.email || '',
        phone: user?.phone || order.customer?.phone || '',
        address: user?.address || order.customer?.address || '',
      };
      await order.save();
    }

    const { firstName, lastName } = buildCustomerName(order.customer.name);
    const hashedSecret = getMd5Hex(merchantSecret);
    const formattedAmount = amount.toFixed(2);
    const hash = getMd5Hex(`${merchantId}${checkoutOrderId}${formattedAmount}${currency}${hashedSecret}`);

    const payload = {
      merchant_id: merchantId,
      return_url: `${frontendUrl}/payment/return?payment=success&orderId=${checkoutOrderId}`,
      cancel_url: `${frontendUrl}/payment/return?payment=cancelled&orderId=${checkoutOrderId}`,
      notify_url: notifyUrl,
      order_id: checkoutOrderId,
      items: items.map((item) => `${item.name} x ${item.quantity}`).join(', '),
      amount: amount.toFixed(2),
      currency,
      first_name: firstName,
      last_name: lastName,
      email: order.customer.email || 'customer@example.com',
      phone: order.customer.phone || '0000000000',
      address: order.customer.address || 'N/A',
      city: 'Colombo',
      country: 'Sri Lanka',
      hash,
    };

    res.json({
      actionUrl: getPayHereCheckoutUrl(),
      payload,
      orderId: checkoutOrderId,
      amount,
    });
  } catch (error) {
    console.error('PayHere checkout error:', error);
    res.status(500).json({ message: 'Failed to initialize PayHere checkout' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.userId,
      status: { $ne: 'PENDING' },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      orders: orders.map((order) => ({
        _id: order._id,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        paymentProvider: order.paymentProvider,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const getMyOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId, user: req.user.userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      order: {
        _id: order._id,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        paymentProvider: order.paymentProvider,
        createdAt: order.createdAt,
        items: order.items,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

export const handlePayHereNotify = async (req, res) => {
  try {
    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, payment_id } = req.body;

    if (!order_id) {
      return res.status(400).send('Missing order_id');
    }

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const localMd5sig = getMd5Hex(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${getMd5Hex(merchantSecret)}`);

    if (String(md5sig || '').toUpperCase() !== localMd5sig) {
      return res.status(400).send('Invalid signature');
    }

    const order = await Order.findOne({ orderId: order_id });
    if (!order) {
      return res.status(404).send('Order not found');
    }

    const paymentSnapshot = {
      merchant_id: String(merchant_id || ''),
      order_id: String(order_id || ''),
      payhere_amount: String(payhere_amount || ''),
      payhere_currency: String(payhere_currency || ''),
      status_code: String(status_code || ''),
      payment_id: String(payment_id || ''),
      md5sig: String(md5sig || ''),
    };

    const isSuccess = String(status_code) === '2';
    const isFailed = ['-1', '-2', '-3'].includes(String(status_code));

    if (isSuccess) {
      order.status = 'PAID';
      order.payHerePaymentId = payment_id || '';
      order.payHereStatusCode = String(status_code || '2');
      order.payHereNotifyPayload = paymentSnapshot;
      order.paidAt = order.paidAt || new Date();
      order.failedAt = undefined;
      await order.save();

      await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
      return res.send('OK');
    }

    if (isFailed) {
      order.status = 'FAILED';
      order.payHerePaymentId = payment_id || '';
      order.payHereStatusCode = String(status_code || '-1');
      order.payHereNotifyPayload = paymentSnapshot;
      order.failedAt = new Date();
      await order.save();
      return res.send('OK');
    }

    order.payHereNotifyPayload = paymentSnapshot;
    await order.save();

    return res.send('OK');
  } catch (error) {
    console.error('PayHere notify error:', error);
    res.status(500).send('ERROR');
  }
};

export const reconcileOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: 'Missing orderId' });
    }

    const order = await Order.findOne({ orderId, user: req.user.userId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only allow manual reconcile in development/testing when explicitly enabled
    const allowManual = String(process.env.ALLOW_MANUAL_PAYHERE_RECONCILE || '').toLowerCase() === 'true';
    const reconcileSource = String(req.body?.source || req.body?.reconcileSource || req.header('x-payhere-reconcile-source') || '').toLowerCase();
    const allowReturnSync = reconcileSource === 'return';

    if (!allowManual && !allowReturnSync) {
      return res.status(403).json({ message: 'Manual reconcile is disabled on this server' });
    }

    if (order.status === 'PAID') {
      return res.json({ status: order.status });
    }

    // Mark as PAID and persist minimal audit fields for local testing
    order.status = 'PAID';
    order.payHerePaymentId = 'MANUAL_CONFIRM';
    order.payHereStatusCode = '2';
    order.payHereNotifyPayload = order.payHereNotifyPayload || {};
    order.paidAt = new Date();
    await order.save();

    await Cart.findOneAndUpdate({ user: order.user }, { items: [] });

    return res.json({ status: 'PAID' });
  } catch (error) {
    console.error('Manual reconcile error:', error);
    return res.status(500).json({ message: 'Failed to reconcile order' });
  }
};