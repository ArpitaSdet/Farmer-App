const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', machineController.getMachines);
router.get('/nearby', machineController.getNearbyMachines);
router.get('/:id', machineController.getMachineById);
router.post('/', authMiddleware, requireRole('ADMIN', 'MACHINE_OWNER'), machineController.createMachine);
router.put('/:id', authMiddleware, requireRole('ADMIN', 'MACHINE_OWNER'), machineController.updateMachine);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), machineController.deleteMachine);

module.exports = router;
