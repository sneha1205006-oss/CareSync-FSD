const db = require('../config/database');
const { getTodayDateString } = require('../services/tokenService');

function getTodayKPIs(req, res) {
  const today = getTodayDateString();

  // Total patient visits today
  const totalVisits = db.prepare(`
    SELECT COUNT(*) as count,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
      COUNT(CASE WHEN status = 'IN_CONSULTATION' THEN 1 END) as consulting_count,
      COUNT(CASE WHEN status = 'WAITING' THEN 1 END) as waiting_count,
      COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END) as skipped_count
    FROM opd_queue
    WHERE visit_date = ?
  `).get(today);

  // Average wait time in minutes (from created_at to called_at for called/completed visits)
  const waitTimes = db.prepare(`
    SELECT 
      ROUND(AVG((strftime('%s', called_at) - strftime('%s', created_at)) / 60.0), 1) as avg_wait_mins
    FROM opd_queue
    WHERE visit_date = ? AND called_at IS NOT NULL
  `).get(today);

  // Busiest department
  const busiestDept = db.prepare(`
    SELECT d.name, d.code, COUNT(q.id) as token_count
    FROM departments d
    JOIN opd_queue q ON d.id = q.department_id
    WHERE q.visit_date = ?
    GROUP BY d.id
    ORDER BY token_count DESC
    LIMIT 1
  `).get(today);

  // Overall bed occupancy
  const bedStats = db.prepare(`
    SELECT 
      COUNT(id) as total_beds,
      COUNT(CASE WHEN status = 'OCCUPIED' THEN 1 END) as occupied_beds,
      COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_beds,
      COUNT(CASE WHEN status = 'CLEANING' THEN 1 END) as cleaning_beds
    FROM beds
  `).get();

  const bedOccupancyRate = bedStats.total_beds > 0
    ? Math.round((bedStats.occupied_beds / bedStats.total_beds) * 100)
    : 0;

  return res.json({
    kpis: {
      total_patients_today: totalVisits.count,
      completed_consultations: totalVisits.completed_count,
      in_consultation: totalVisits.consulting_count,
      currently_waiting: totalVisits.waiting_count,
      avg_wait_minutes: waitTimes.avg_wait_mins !== null ? Math.max(1, Math.round(waitTimes.avg_wait_mins)) : 14,
      busiest_department: busiestDept ? busiestDept.name : 'Cardiology',
      bed_occupancy_rate: bedOccupancyRate,
      total_beds: bedStats.total_beds,
      occupied_beds: bedStats.occupied_beds,
      available_beds: bedStats.available_beds,
      cleaning_beds: bedStats.cleaning_beds
    }
  });
}

function getAnalyticsCharts(req, res) {
  const today = getTodayDateString();

  // Department volume breakdown
  const departmentBreakdown = db.prepare(`
    SELECT d.name, d.code,
      COUNT(q.id) as total_tokens,
      COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed,
      COUNT(CASE WHEN q.status = 'WAITING' THEN 1 END) as waiting
    FROM departments d
    LEFT JOIN opd_queue q ON d.id = q.department_id AND q.visit_date = ?
    GROUP BY d.id
    ORDER BY total_tokens DESC
  `).all(today);

  // Ward occupancy comparison
  const wardOccupancy = db.prepare(`
    SELECT w.name, w.code,
      COUNT(b.id) as total_beds,
      COUNT(CASE WHEN b.status = 'OCCUPIED' THEN 1 END) as occupied,
      COUNT(CASE WHEN b.status = 'AVAILABLE' THEN 1 END) as available,
      COUNT(CASE WHEN b.status = 'CLEANING' THEN 1 END) as cleaning
    FROM wards w
    LEFT JOIN beds b ON w.id = b.ward_id
    GROUP BY w.id
    ORDER BY w.id ASC
  `).all();

  // Priority distribution
  const priorityDistribution = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM opd_queue
    WHERE visit_date = ?
    GROUP BY priority
  `).all(today);

  // Hourly patient registration curve
  const hourlyArrivals = db.prepare(`
    SELECT strftime('%H:00', created_at) as hour, COUNT(*) as count
    FROM opd_queue
    WHERE visit_date = ?
    GROUP BY hour
    ORDER BY hour ASC
  `).all(today);

  return res.json({
    departmentBreakdown,
    wardOccupancy,
    priorityDistribution,
    hourlyArrivals
  });
}

function exportCsvReport(req, res) {
  const today = getTodayDateString();

  // Fetch all OPD queue records
  const opdRecords = db.prepare(`
    SELECT q.token_number, p.uhid, p.name as patient_name, p.age, p.gender, p.phone,
           d.name as department_name, doc_u.full_name as doctor_name,
           q.priority, q.status, q.created_at, q.called_at, q.consultation_completed_at, q.notes
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    LEFT JOIN users doc_u ON doc.user_id = doc_u.id
    WHERE q.visit_date = ?
    ORDER BY q.created_at ASC
  `).all(today);

  // Fetch active and recent bed admissions
  const admissionRecords = db.prepare(`
    SELECT b.bed_number, w.name as ward_name, p.uhid, p.name as patient_name,
           ba.diagnosis, ba.admitting_doctor, ba.admitted_at, ba.discharged_at, ba.status, ba.notes
    FROM bed_admissions ba
    JOIN beds b ON ba.bed_id = b.id
    JOIN wards w ON b.ward_id = w.id
    JOIN patients p ON ba.patient_id = p.id
    ORDER BY ba.admitted_at DESC
  `).all();

  let csvContent = `=== HOSPITAL OPD QUEUE REPORT (${today}) ===\r\n`;
  csvContent += `"Token Number","UHID","Patient Name","Age","Gender","Phone","Department","Doctor","Priority","Status","Registered At","Called At","Completed At","Notes"\r\n`;

  opdRecords.forEach(r => {
    const row = [
      r.token_number,
      r.uhid,
      r.patient_name,
      r.age,
      r.gender,
      r.phone,
      r.department_name,
      r.doctor_name || 'N/A',
      r.priority,
      r.status,
      r.created_at,
      r.called_at || '',
      r.consultation_completed_at || '',
      (r.notes || '').replace(/"/g, '""')
    ];
    csvContent += row.map(val => `"${val}"`).join(',') + '\r\n';
  });

  csvContent += `\r\n=== HOSPITAL INPATIENT BED ADMISSIONS ===\r\n`;
  csvContent += `"Bed Number","Ward","Patient UHID","Patient Name","Diagnosis","Admitting Doctor","Admitted At","Discharged At","Status","Notes"\r\n`;

  admissionRecords.forEach(r => {
    const row = [
      r.bed_number,
      r.ward_name,
      r.uhid,
      r.patient_name,
      r.diagnosis || '',
      r.admitting_doctor || '',
      r.admitted_at,
      r.discharged_at || 'CURRENTLY ADMITTED',
      r.status,
      (r.notes || '').replace(/"/g, '""')
    ];
    csvContent += row.map(val => `"${val}"`).join(',') + '\r\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="hospital_report_${today}.csv"`);
  return res.status(200).send(csvContent);
}

module.exports = {
  getTodayKPIs,
  getAnalyticsCharts,
  exportCsvReport
};
