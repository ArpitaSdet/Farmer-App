const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', authMiddleware, requireRole('ADMIN'), categoryController.createCategory);
router.put('/:id', authMiddleware, requireRole('ADMIN'), categoryController.updateCategory);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), categoryController.deleteCategory);

module.exports = router;
