const db = require('../config/database');
const { generateNextToken, getTodayDateString } = require('../services/tokenService');
const { getPriorityWeight, sortQueueItems, calculateEstimatedWaitTime } = require('../services/queueService');

/**
 * Register patient (or reuse if UHID/phone matches) and issue OPD Queue Token
 */
function registerPatientAndIssueToken(req, res) {
  const { name, age, gender, phone, department_id, doctor_id, priority, notes } = req.body;

  if (!name || !age || !gender || !phone || !department_id) {
    return res.status(400).json({ error: 'Name, age, gender, phone, and department are required' });
  }

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(department_id);
  if (!dept) {
    return res.status(404).json({ error: 'Department not found' });
  }

  const today = getTodayDateString();
  const priorityType = priority || 'NORMAL';
  const priorityWeight = getPriorityWeight(priorityType);

  // Check if patient already exists by phone or generate new UHID
  let patient = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
  if (!patient) {
    const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count + 1;
    const uhid = `UHID-${new Date().getFullYear()}-${String(patientCount).padStart(4, '0')}`;
    const insertPatient = db.prepare(`
      INSERT INTO patients (uhid, name, age, gender, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    const patientRow = insertPatient.run(uhid, name.trim(), parseInt(age, 10), gender, phone.trim());
    patient = {
      id: patientRow.lastInsertRowid,
      uhid,
      name: name.trim(),
      age: parseInt(age, 10),
      gender,
      phone: phone.trim()
    };
  } else {
    // Update existing patient info if name or age changed
    db.prepare('UPDATE patients SET name = ?, age = ?, gender = ? WHERE id = ?')
      .run(name.trim(), parseInt(age, 10), gender, patient.id);
  }

  // Generate sequential token for today
  const tokenData = generateNextToken(db, department_id, today);

  const insertQueue = db.prepare(`
    INSERT INTO opd_queue (
      token_number, patient_id, department_id, doctor_id, visit_date, 
      status, priority, priority_weight, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 'WAITING', ?, ?, ?, datetime('now', 'localtime'))
  `);

  const queueRow = insertQueue.run(
    tokenData.tokenNumber,
    patient.id,
    department_id,
    doctor_id || null,
    today,
    priorityType,
    priorityWeight,
    notes || null
  );

  const createdQueueItem = db.prepare(`
    SELECT q.*, p.name as patient_name, p.uhid, p.age, p.gender, p.phone,
           d.name as department_name, d.code as department_code,
           doc.room_number, u.full_name as doctor_name
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    LEFT JOIN users u ON doc.user_id = u.id
    WHERE q.id = ?
  `).get(queueRow.lastInsertRowid);

  // Real-time broadcast
  const io = req.app.get('io');
  if (io) {
    io.emit('queue:updated', {
      action: 'NEW_TOKEN',
      departmentId: department_id,
      token: createdQueueItem
    });
  }

  return res.status(201).json({
    message: 'Token issued successfully',
    token: createdQueueItem
  });
}

/**
 * Get today's queue list, optionally filtered by department or doctor
 */
function getTodayQueue(req, res) {
  const { department_id, doctor_id, status } = req.query;
  const today = getTodayDateString();

  let query = `
    SELECT q.*, p.name as patient_name, p.uhid, p.age, p.gender, p.phone,
           d.name as department_name, d.code as department_code, d.avg_consultation_mins,
           doc.room_number, doc.status as doctor_status, u.full_name as doctor_name
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    LEFT JOIN users u ON doc.user_id = u.id
    WHERE q.visit_date = ?
  `;
  const params = [today];

  if (department_id) {
    query += ` AND q.department_id = ?`;
    params.push(department_id);
  }
  if (doctor_id) {
    query += ` AND q.doctor_id = ?`;
    params.push(doctor_id);
  }
  if (status) {
    query += ` AND q.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY q.priority_weight DESC, q.created_at ASC`;

  const rows = db.prepare(query).all(...params);

  // Group waiting patients to calculate accurate wait times
  let waitingCount = 0;
  const enrichedRows = rows.map(item => {
    if (item.status === 'WAITING') {
      const waitEst = calculateEstimatedWaitTime(
        waitingCount,
        item.avg_consultation_mins || 15,
        false,
        item.doctor_status || 'AVAILABLE'
      );
      waitingCount++;
      return { ...item, wait_time: waitEst };
    }
    return { ...item, wait_time: null };
  });

  return res.json({ queue: enrichedRows });
}

/**
 * Doctor calls the next patient in their queue
 */
function callNextPatient(req, res) {
  const { department_id, doctor_id, previous_token_id, previous_action } = req.body;

  const targetDoctorId = doctor_id || (req.user && req.user.doctor_id);
  const targetDeptId = department_id || (req.user && req.user.department_id);

  if (!targetDeptId) {
    return res.status(400).json({ error: 'Department ID is required to call next patient' });
  }

  const today = getTodayDateString();

  // If previous token was specified, complete or skip it
  if (previous_token_id) {
    const nextStatus = previous_action === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED';
    db.prepare(`
      UPDATE opd_queue 
      SET status = ?, consultation_completed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(nextStatus, previous_token_id);
  } else {
    // Automatically complete any other token currently IN_CONSULTATION for this doctor
    if (targetDoctorId) {
      db.prepare(`
        UPDATE opd_queue 
        SET status = 'COMPLETED', consultation_completed_at = datetime('now', 'localtime')
        WHERE doctor_id = ? AND status = 'IN_CONSULTATION' AND visit_date = ?
      `).run(targetDoctorId, today);
    }
  }

  // Find the next waiting patient: highest priority_weight DESC, created_at ASC
  let nextPatientQuery = `
    SELECT q.*, p.name as patient_name, p.uhid, d.name as department_name, d.code as department_code
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    WHERE q.visit_date = ? AND q.department_id = ? AND q.status = 'WAITING'
  `;
  const nextParams = [today, targetDeptId];

  if (targetDoctorId) {
    // If patient specifically requested this doctor OR was unassigned
    nextPatientQuery += ` AND (q.doctor_id = ? OR q.doctor_id IS NULL)`;
    nextParams.push(targetDoctorId);
  }

  nextPatientQuery += ` ORDER BY q.priority_weight DESC, q.created_at ASC LIMIT 1`;

  const nextPatient = db.prepare(nextPatientQuery).get(...nextParams);

  if (!nextPatient) {
    return res.json({ message: 'No waiting patients in queue', token: null });
  }

  // Update status to IN_CONSULTATION
  db.prepare(`
    UPDATE opd_queue 
    SET status = 'IN_CONSULTATION', 
        doctor_id = COALESCE(doctor_id, ?), 
        called_at = datetime('now', 'localtime'),
        consultation_started_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(targetDoctorId || null, nextPatient.id);

  // Retrieve full details of the called token
  const calledToken = db.prepare(`
    SELECT q.*, p.name as patient_name, p.uhid, p.age, p.gender, p.phone,
           d.name as department_name, d.code as department_code,
           doc.room_number, u.full_name as doctor_name
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    LEFT JOIN users u ON doc.user_id = u.id
    WHERE q.id = ?
  `).get(nextPatient.id);

  // Emit real-time calling alert for Public Display and sounds
  const io = req.app.get('io');
  if (io) {
    io.emit('queue:token_called', {
      tokenId: calledToken.id,
      tokenNumber: calledToken.token_number,
      patientName: calledToken.patient_name,
      departmentName: calledToken.department_name,
      departmentCode: calledToken.department_code,
      doctorName: calledToken.doctor_name || 'Attending Physician',
      roomNumber: calledToken.room_number || 'OPD Clinic',
      calledAt: calledToken.called_at
    });

    io.emit('queue:updated', {
      action: 'TOKEN_CALLED',
      departmentId: targetDeptId,
      token: calledToken
    });
  }

  return res.json({
    message: `Called token ${calledToken.token_number}`,
    token: calledToken
  });
}

/**
 * Re-call the same token (re-triggers audio chime & visual highlight on public display)
 */
function recallToken(req, res) {
  const { id } = req.params;
  const token = db.prepare(`
    SELECT q.*, p.name as patient_name, p.uhid, p.age, p.gender, p.phone,
           d.name as department_name, d.code as department_code,
           doc.room_number, u.full_name as doctor_name
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    LEFT JOIN users u ON doc.user_id = u.id
    WHERE q.id = ?
  `).get(id);

  if (!token) {
    return res.status(404).json({ error: 'Token not found' });
  }

  // Update called_at timestamp
  db.prepare(`UPDATE opd_queue SET called_at = datetime('now', 'localtime') WHERE id = ?`).run(id);

  const io = req.app.get('io');
  if (io) {
    io.emit('queue:token_called', {
      tokenId: token.id,
      tokenNumber: token.token_number,
      patientName: token.patient_name,
      departmentName: token.department_name,
      departmentCode: token.department_code,
      doctorName: token.doctor_name || 'Attending Physician',
      roomNumber: token.room_number || 'OPD Clinic',
      calledAt: new Date().toISOString(),
      isRecall: true
    });
  }

  return res.json({ message: `Token ${token.token_number} recalled`, token });
}

/**
 * Update token status (e.g., COMPLETED, SKIPPED, CANCELLED) and clinical notes
 */
function updateTokenStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['WAITING', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const existing = db.prepare('SELECT * FROM opd_queue WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Token not found' });
  }

  let updateQuery = `UPDATE opd_queue SET status = ?`;
  const params = [status];

  if (status === 'COMPLETED') {
    updateQuery += `, consultation_completed_at = datetime('now', 'localtime')`;
  }
  if (notes !== undefined) {
    updateQuery += `, notes = ?`;
    params.push(notes);
  }

  updateQuery += ` WHERE id = ?`;
  params.push(id);

  db.prepare(updateQuery).run(...params);

  const updatedToken = db.prepare(`
    SELECT q.*, p.name as patient_name, p.uhid, d.name as department_name, d.code as department_code
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    WHERE q.id = ?
  `).get(id);

  const io = req.app.get('io');
  if (io) {
    io.emit('queue:updated', {
      action: 'STATUS_CHANGED',
      departmentId: updatedToken.department_id,
      token: updatedToken
    });
  }

  return res.json({ message: 'Token updated successfully', token: updatedToken });
}

/**
 * Public Display summary data
 * Returns active "Now Calling" tokens and next waiting tokens per department
 */
function getPublicDisplaySummary(req, res) {
  const today = getTodayDateString();

  // Active calling / in consultation
  const activeTokens = db.prepare(`
    SELECT q.id, q.token_number, q.priority, q.called_at,
           p.name as patient_name,
           d.name as department_name, d.code as department_code,
           doc.room_number, u.full_name as doctor_name
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    LEFT JOIN users u ON doc.user_id = u.id
    WHERE q.visit_date = ? AND q.status = 'IN_CONSULTATION'
    ORDER BY q.called_at DESC
  `).all(today);

  // Next waiting tokens across all departments
  const waitingTokens = db.prepare(`
    SELECT q.id, q.token_number, q.priority, q.priority_weight, q.created_at,
           p.name as patient_name,
           d.name as department_name, d.code as department_code, d.avg_consultation_mins,
           doc.room_number
    FROM opd_queue q
    JOIN patients p ON q.patient_id = p.id
    JOIN departments d ON q.department_id = d.id
    LEFT JOIN doctors doc ON q.doctor_id = doc.id
    WHERE q.visit_date = ? AND q.status = 'WAITING'
    ORDER BY q.priority_weight DESC, q.created_at ASC
    LIMIT 12
  `).all(today);

  // Calculate wait times for waiting tokens
  const waitingWithWaitTimes = waitingTokens.map((item, idx) => {
    const est = calculateEstimatedWaitTime(idx, item.avg_consultation_mins || 15, true, 'AVAILABLE');
    return { ...item, wait_time: est };
  });

  // Department-wise waiting count
  const departmentCounts = db.prepare(`
    SELECT d.id, d.name, d.code,
           COUNT(CASE WHEN q.status = 'WAITING' THEN 1 END) as waiting_count,
           COUNT(CASE WHEN q.status = 'IN_CONSULTATION' THEN 1 END) as consulting_count
    FROM departments d
    LEFT JOIN opd_queue q ON d.id = q.department_id AND q.visit_date = ?
    GROUP BY d.id
  `).all(today);

  return res.json({
    activeTokens,
    waitingTokens: waitingWithWaitTimes,
    departmentCounts,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  registerPatientAndIssueToken,
  getTodayQueue,
  callNextPatient,
  recallToken,
  updateTokenStatus,
  getPublicDisplaySummary
};
