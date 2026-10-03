const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/stats', adminController.getDashboardStats);
router.get('/farmers', adminController.getFarmers);
router.put('/farmers/:id/block', adminController.toggleBlockFarmer);
router.get('/orders', adminController.getAllOrders);
router.get('/rentals', adminController.getAllRentals);

module.exports = router;
