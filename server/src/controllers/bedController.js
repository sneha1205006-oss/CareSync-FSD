const db = require('../config/database');

/**
 * Get live bed summary across all wards
 * Computes total, occupied, available, cleaning, reserved, out of service counts,
 * occupancy percentage, and low availability flag
 */
function getWardBedSummary(req, res) {
  const wards = db.prepare(`
    SELECT w.*,
      COUNT(b.id) as total_beds_count,
      COUNT(CASE WHEN b.status = 'AVAILABLE' THEN 1 END) as available_beds,
      COUNT(CASE WHEN b.status = 'OCCUPIED' THEN 1 END) as occupied_beds,
      COUNT(CASE WHEN b.status = 'CLEANING' THEN 1 END) as cleaning_beds,
      COUNT(CASE WHEN b.status = 'RESERVED' THEN 1 END) as reserved_beds,
      COUNT(CASE WHEN b.status = 'OUT_OF_SERVICE' THEN 1 END) as oos_beds
    FROM wards w
    LEFT JOIN beds b ON w.id = b.ward_id
    GROUP BY w.id
    ORDER BY w.id ASC
  `).all();

  const enrichedWards = wards.map(ward => {
    const total = ward.total_beds_count || ward.total_beds;
    const occupancyRate = total > 0 ? Math.round((ward.occupied_beds / total) * 100) : 0;
    const isLowAvailability = ward.available_beds <= ward.low_bed_threshold;

    return {
      ...ward,
      occupancy_rate: occupancyRate,
      is_low_availability: isLowAvailability
    };
  });

  const totals = enrichedWards.reduce((acc, w) => {
    acc.total += w.total_beds_count;
    acc.occupied += w.occupied_beds;
    acc.available += w.available_beds;
    acc.cleaning += w.cleaning_beds;
    acc.reserved += w.reserved_beds;
    return acc;
  }, { total: 0, occupied: 0, available: 0, cleaning: 0, reserved: 0 });

  totals.overall_occupancy = totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0;

  return res.json({
    wards: enrichedWards,
    totals
  });
}

/**
 * Get full grid of beds grouped by ward or filtered by ward_id
 */
function getBedGrid(req, res) {
  const { ward_id, status } = req.query;

  let query = `
    SELECT b.*, w.name as ward_name, w.code as ward_code, w.floor as ward_floor,
           p.name as patient_name, p.uhid as patient_uhid, p.age as patient_age, p.gender as patient_gender,
           ba.id as admission_id, ba.admitted_at, ba.admitting_doctor, ba.diagnosis
    FROM beds b
    JOIN wards w ON b.ward_id = w.id
    LEFT JOIN patients p ON b.current_patient_id = p.id
    LEFT JOIN bed_admissions ba ON b.id = ba.bed_id AND ba.status = 'ACTIVE'
    WHERE 1=1
  `;
  const params = [];

  if (ward_id) {
    query += ` AND b.ward_id = ?`;
    params.push(ward_id);
  }
  if (status) {
    query += ` AND b.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY w.id ASC, b.bed_number ASC`;

  const beds = db.prepare(query).all(...params);
  return res.json({ beds });
}

/**
 * Admit a patient to an available bed
 */
function admitPatientToBed(req, res) {
  const { bed_id, patient_id, name, age, gender, phone, admitting_doctor, diagnosis, notes } = req.body;

  if (!bed_id) {
    return res.status(400).json({ error: 'Bed ID is required' });
  }

  const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bed_id);
  if (!bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  if (bed.status !== 'AVAILABLE' && bed.status !== 'RESERVED') {
    return res.status(400).json({ error: `Cannot admit to bed in status '${bed.status}'. Bed must be AVAILABLE or RESERVED.` });
  }

  let finalPatientId = patient_id;

  // If patient details provided directly, find or create
  if (!finalPatientId) {
    if (!name || !phone) {
      return res.status(400).json({ error: 'Patient ID or Patient Name & Phone are required' });
    }

    let existingPatient = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
    if (!existingPatient) {
      const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count + 1;
      const uhid = `UHID-${new Date().getFullYear()}-${String(patientCount).padStart(4, '0')}`;
      const insertPatient = db.prepare(`
        INSERT INTO patients (uhid, name, age, gender, phone)
        VALUES (?, ?, ?, ?, ?)
      `);
      const row = insertPatient.run(uhid, name.trim(), parseInt(age || 30, 10), gender || 'Male', phone.trim());
      finalPatientId = row.lastInsertRowid;
    } else {
      finalPatientId = existingPatient.id;
    }
  }

  // Update Bed to OCCUPIED
  db.prepare(`
    UPDATE beds 
    SET status = 'OCCUPIED', current_patient_id = ?, notes = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(finalPatientId, diagnosis ? `Diagnosis: ${diagnosis}` : null, bed_id);

  // Record admission
  const insertAdmission = db.prepare(`
    INSERT INTO bed_admissions (bed_id, patient_id, admitted_at, admitting_doctor, diagnosis, notes, status)
    VALUES (?, ?, datetime('now', 'localtime'), ?, ?, ?, 'ACTIVE')
  `);
  insertAdmission.run(
    bed_id,
    finalPatientId,
    admitting_doctor || (req.user && req.user.full_name) || 'Attending Physician',
    diagnosis || 'General Inpatient Care',
    notes || 'Admitted via Ward Operations'
  );

  // Retrieve updated bed details
  const updatedBed = db.prepare(`
    SELECT b.*, w.name as ward_name, w.code as ward_code,
           p.name as patient_name, p.uhid as patient_uhid, p.age as patient_age, p.gender as patient_gender,
           ba.id as admission_id, ba.admitted_at, ba.admitting_doctor, ba.diagnosis
    FROM beds b
    JOIN wards w ON b.ward_id = w.id
    LEFT JOIN patients p ON b.current_patient_id = p.id
    LEFT JOIN bed_admissions ba ON b.id = ba.bed_id AND ba.status = 'ACTIVE'
    WHERE b.id = ?
  `).get(bed_id);

  // Broadcast real-time bed update
  const io = req.app.get('io');
  if (io) {
    io.emit('bed:updated', {
      action: 'ADMIT',
      bed: updatedBed,
      wardId: bed.ward_id
    });
  }

  return res.status(201).json({
    message: `Patient successfully admitted to bed ${bed.bed_number}`,
    bed: updatedBed
  });
}

/**
 * Discharge patient from bed
 * Automatically marks the bed as 'CLEANING' so housekeeping can sanitize it
 */
function dischargePatientFromBed(req, res) {
  const { id } = req.params;
  const { notes, next_status } = req.body;

  const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
  if (!bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  if (bed.status !== 'OCCUPIED') {
    return res.status(400).json({ error: `Bed is not currently occupied (Current status: ${bed.status})` });
  }

  // Update active admission record
  db.prepare(`
    UPDATE bed_admissions 
    SET status = 'DISCHARGED', discharged_at = datetime('now', 'localtime'), notes = COALESCE(?, notes)
    WHERE bed_id = ? AND status = 'ACTIVE'
  `).run(notes || 'Discharged by Ward Staff', id);

  // Set bed to CLEANING (or requested next status, default CLEANING)
  const targetStatus = next_status || 'CLEANING';
  db.prepare(`
    UPDATE beds 
    SET status = ?, current_patient_id = NULL, notes = 'Sanitization pending following discharge', updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(targetStatus, id);

  const updatedBed = db.prepare(`
    SELECT b.*, w.name as ward_name, w.code as ward_code
    FROM beds b
    JOIN wards w ON b.ward_id = w.id
    WHERE b.id = ?
  `).get(id);

  const io = req.app.get('io');
  if (io) {
    io.emit('bed:updated', {
      action: 'DISCHARGE',
      bed: updatedBed,
      wardId: bed.ward_id
    });
  }

  return res.json({
    message: `Patient discharged from bed ${bed.bed_number}. Bed transitioned to ${targetStatus}.`,
    bed: updatedBed
  });
}

/**
 * Update bed status directly (AVAILABLE, CLEANING, RESERVED, OUT_OF_SERVICE)
 */
function updateBedStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'RESERVED', 'OUT_OF_SERVICE'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
  if (!bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  // If status is changed from OCCUPIED to non-OCCUPIED, clear current_patient_id and close admission
  let patientId = bed.current_patient_id;
  if (status !== 'OCCUPIED' && bed.status === 'OCCUPIED') {
    patientId = null;
    db.prepare(`
      UPDATE bed_admissions 
      SET status = 'DISCHARGED', discharged_at = datetime('now', 'localtime')
      WHERE bed_id = ? AND status = 'ACTIVE'
    `).run(id);
  }

  db.prepare(`
    UPDATE beds 
    SET status = ?, current_patient_id = ?, notes = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(status, patientId, notes !== undefined ? notes : bed.notes, id);

  const updatedBed = db.prepare(`
    SELECT b.*, w.name as ward_name, w.code as ward_code,
           p.name as patient_name, p.uhid as patient_uhid
    FROM beds b
    JOIN wards w ON b.ward_id = w.id
    LEFT JOIN patients p ON b.current_patient_id = p.id
    WHERE b.id = ?
  `).get(id);

  const io = req.app.get('io');
  if (io) {
    io.emit('bed:updated', {
      action: 'STATUS_CHANGE',
      bed: updatedBed,
      wardId: bed.ward_id
    });
  }

  return res.json({
    message: `Bed ${bed.bed_number} status updated to ${status}`,
    bed: updatedBed
  });
}

module.exports = {
  getWardBedSummary,
  getBedGrid,
  admitPatientToBed,
  dischargePatientFromBed,
  updateBedStatus
};
