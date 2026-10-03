const express = require('express');
const router = express.Router();
const creativeController = require('../controllers/creativeController');

// AI Asset Bank
router.get('/assets', creativeController.getAIAssets);

// Creative generation & listing
router.post('/generate', creativeController.generateCreatives);
router.get('/', creativeController.getGenerations);
router.get('/:id', creativeController.getGenerationById);

// Variation approval & scheduling
router.post('/:id/approve', creativeController.approveVariation);
router.post('/:id/schedule', creativeController.scheduleCreative);

module.exports = router;
