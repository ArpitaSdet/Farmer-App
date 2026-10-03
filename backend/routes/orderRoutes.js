const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, orderController.createOrder);
router.get('/', authMiddleware, orderController.getMyOrders);
router.get('/:id', authMiddleware, orderController.getOrderById);
router.put('/:id/status', authMiddleware, orderController.updateOrderStatus);
router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

module.exports = router;
