const express = require('express');
const router = express.Router();
const bedController = require('../controllers/bedController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// Public summary for waiting hall screen
router.get('/summary', bedController.getWardBedSummary);

// Protected routes
router.get('/grid', authenticateToken, bedController.getBedGrid);
router.post('/admit', authenticateToken, requireRoles('WARD_ADMIN', 'ADMIN'), bedController.admitPatientToBed);
router.post('/:id/discharge', authenticateToken, requireRoles('WARD_ADMIN', 'ADMIN'), bedController.dischargePatientFromBed);
router.patch('/:id/status', authenticateToken, requireRoles('WARD_ADMIN', 'ADMIN'), bedController.updateBedStatus);

module.exports = router;
