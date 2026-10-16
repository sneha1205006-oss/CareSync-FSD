const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// Public route for waiting hall display
router.get('/public-summary', queueController.getPublicDisplaySummary);

// Protected routes
router.post('/register', authenticateToken, requireRoles('RECEPTIONIST', 'ADMIN'), queueController.registerPatientAndIssueToken);
router.get('/today', authenticateToken, queueController.getTodayQueue);
router.post('/call-next', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), queueController.callNextPatient);
router.post('/:id/recall', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), queueController.recallToken);
router.patch('/:id/status', authenticateToken, requireRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'), queueController.updateTokenStatus);

module.exports = router;
