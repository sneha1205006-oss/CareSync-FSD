const db = require('../config/database');

function getDepartments(req, res) {
  const departments = db.prepare(`
    SELECT d.*, 
      COUNT(doc.id) as doctor_count
    FROM departments d
    LEFT JOIN doctors doc ON d.id = doc.department_id
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all();
  return res.json({ departments });
}

function getDoctors(req, res) {
  const doctors = db.prepare(`
    SELECT doc.id, doc.user_id, doc.room_number, doc.specialization, doc.status,
           u.full_name as doctor_name, u.username,
           d.id as department_id, d.name as department_name, d.code as department_code
    FROM doctors doc
    JOIN users u ON doc.user_id = u.id
    JOIN departments d ON doc.department_id = d.id
    ORDER BY d.name ASC, u.full_name ASC
  `).all();
  return res.json({ doctors });
}

function updateDoctorStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const doctor = db.prepare(`
    SELECT doc.*, u.full_name as doctor_name, d.name as department_name
    FROM doctors doc
    JOIN users u ON doc.user_id = u.id
    JOIN departments d ON doc.department_id = d.id
    WHERE doc.id = ?
  `).get(id);

  if (!doctor) {
    return res.status(404).json({ error: 'Doctor record not found' });
  }

  db.prepare(`
    UPDATE doctors 
    SET status = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(status, id);

  const io = req.app.get('io');
  if (io) {
    io.emit('doctor:status_changed', {
      doctorId: doctor.id,
      doctorName: doctor.doctor_name,
      departmentName: doctor.department_name,
      status
    });
  }

  return res.json({
    message: `Doctor status updated to ${status}`,
    doctor: { ...doctor, status }
  });
}

module.exports = {
  getDepartments,
  getDoctors,
  updateDoctorStatus
};
