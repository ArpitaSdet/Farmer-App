const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', bannerController.getActiveBanners);
router.get('/all', authMiddleware, requireRole('ADMIN'), bannerController.getAllBanners);
router.post('/', authMiddleware, requireRole('ADMIN'), bannerController.createBanner);
router.put('/:id', authMiddleware, requireRole('ADMIN'), bannerController.updateBanner);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), bannerController.deleteBanner);

module.exports = router;
