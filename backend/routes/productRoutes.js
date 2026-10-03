const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id', productController.getProductById);
router.post('/', authMiddleware, requireRole('ADMIN'), productController.createProduct);
router.put('/:id', authMiddleware, requireRole('ADMIN'), productController.updateProduct);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), productController.deleteProduct);

module.exports = router;
