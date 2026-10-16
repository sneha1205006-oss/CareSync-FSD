const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

router.get('/', doctorController.getDoctors);
router.patch('/:id/status', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), doctorController.updateDoctorStatus);

module.exports = router;
