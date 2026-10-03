const express = require('express');
const router = express.Router();
const posterController = require('../controllers/posterController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', posterController.getActivePosters);
router.get('/all', authMiddleware, requireRole('ADMIN'), posterController.getAllPosters);
router.post('/', authMiddleware, requireRole('ADMIN'), posterController.createPoster);
router.put('/:id', authMiddleware, requireRole('ADMIN'), posterController.updatePoster);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), posterController.deletePoster);

module.exports = router;
