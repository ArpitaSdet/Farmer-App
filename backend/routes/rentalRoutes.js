const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, rentalController.createRentalBooking);
router.get('/', authMiddleware, rentalController.getMyRentals);
router.get('/:id', authMiddleware, rentalController.getRentalById);
router.put('/:id/status', authMiddleware, rentalController.updateRentalStatus);
router.put('/:id/cancel', authMiddleware, rentalController.cancelRentalBooking);

module.exports = router;
