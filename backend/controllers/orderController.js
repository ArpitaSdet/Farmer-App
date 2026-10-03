const { Orders, Products, Notifications } = require('../config/db');
const paymentService = require('../config/payments');

/**
 * Place Product Order
 */
const createOrder = async (req, res, next) => {
  try {
    const { items, deliveryAddress, paymentMethod = 'UPI' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Please add farm products first.',
      });
    }

    if (!deliveryAddress || !deliveryAddress.village) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete farm delivery address',
      });
    }

    let itemsTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Products.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name || ''} is no longer available`,
        });
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      const lineTotal = product.price * qty;
      itemsTotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image,
        brand: product.brand,
        packSize: product.packSize,
      });
    }

    const deliveryFee = itemsTotal > 1000 ? 0 : 40; // Free delivery over ₹1000
    const totalAmount = itemsTotal + deliveryFee;

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = req.user.id;

    // Payment intent
    let paymentData = null;
    if (paymentMethod === 'UPI') {
      paymentData = paymentService.generateUpiIntent({
        orderId,
        amount: totalAmount,
        note: `Payment for Order ${orderId}`,
      });
    }

    const order = await Orders.create({
      id: orderId,
      userId,
      farmerName: req.user.name,
      farmerPhone: req.user.mobileNumber,
      items: validatedItems,
      itemsTotal,
      deliveryFee,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'UPI' ? 'COMPLETED' : 'PENDING_DELIVERY',
      status: 'PLACED', // PLACED, PACKED, SHIPPED, DELIVERED, CANCELLED
      trackingSteps: [
        { title: 'Order Confirmed', time: 'Just now', completed: true },
        { title: 'Packed at Agro Center', time: 'Expected in 4 hours', completed: false },
        { title: 'Dispatched with Delivery Van', time: 'Expected tomorrow', completed: false },
        { title: 'Delivered to Farm', time: 'Expected in 2 days', completed: false },
      ],
    });

    // Create Notification
    await Notifications.create({
      userId,
      title: `📦 Order Confirmed: #${orderId}`,
      body: `Your order for ₹${totalAmount} has been placed. We are preparing it for farm delivery!`,
      type: 'ORDER',
      read: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order,
      paymentData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer's product orders
 */
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let orders = await Orders.find({ userId });

    if (status && status !== 'all') {
      orders = orders.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Orders.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin / Delivery)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, stepIndex } = req.body;

    const order = await Orders.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let steps = [...(order.trackingSteps || [])];
    if (stepIndex !== undefined) {
      steps = steps.map((step, idx) => ({
        ...step,
        completed: idx <= stepIndex,
        time: idx <= stepIndex ? (step.completed ? step.time : 'Completed just now') : step.time,
      }));
    }

    const updated = await Orders.findByIdAndUpdate(id, {
      status: status || order.status,
      trackingSteps: steps,
    });

    return res.json({
      success: true,
      message: 'Order status updated',
      order: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Orders.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Dispatched or delivered orders cannot be cancelled directly. Please contact support.',
      });
    }

    const updated = await Orders.findByIdAndUpdate(id, {
      status: 'CANCELLED',
    });

    return res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
