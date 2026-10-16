const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

router.get('/today-kpis', reportController.getTodayKPIs);
router.get('/charts', reportController.getAnalyticsCharts);
router.get('/export-csv', reportController.exportCsvReport);

module.exports = router;
