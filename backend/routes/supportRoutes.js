const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/faqs', supportController.getFaqs);
router.post('/ticket', authMiddleware, supportController.createTicket);

module.exports = router;
