const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { getPriorityWeight } = require('../services/queueService');
const { getTodayDateString } = require('../services/tokenService');

function seedDatabase() {
  console.log('--- Starting Database Seed ---');

  // Clear existing records in reverse dependency order
  db.exec(`
    DELETE FROM bed_admissions;
    DELETE FROM beds;
    DELETE FROM wards;
    DELETE FROM opd_queue;
    DELETE FROM patients;
    DELETE FROM doctors;
    DELETE FROM departments;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync('hospital123', 10);
  const today = getTodayDateString();

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `);

  const uReception = insertUser.run('reception', passwordHash, 'Sarah Jenkins', 'RECEPTIONIST').lastInsertRowid;
  const uDrSharma = insertUser.run('dr.sharma', passwordHash, 'Dr. Rajesh Sharma', 'DOCTOR').lastInsertRowid;
  const uDrPatel = insertUser.run('dr.patel', passwordHash, 'Dr. Ananya Patel', 'DOCTOR').lastInsertRowid;
  const uDrKhan = insertUser.run('dr.khan', passwordHash, 'Dr. Tariq Khan', 'DOCTOR').lastInsertRowid;
  const uWardAdmin = insertUser.run('wardadmin', passwordHash, 'Marcus Vance', 'WARD_ADMIN').lastInsertRowid;
  const uAdmin = insertUser.run('admin', passwordHash, 'Clara Reed (Director)', 'ADMIN').lastInsertRowid;

  console.log('✓ Seeded Users');

  // 2. Seed Departments
  const insertDept = db.prepare(`
    INSERT INTO departments (name, code, avg_consultation_mins, icon)
    VALUES (?, ?, ?, ?)
  `);

  const dCard = insertDept.run('Cardiology', 'CARD', 15, 'HeartPulse').lastInsertRowid;
  const dOrth = insertDept.run('Orthopedics', 'ORTH', 20, 'Bone').lastInsertRowid;
  const dPedi = insertDept.run('Pediatrics', 'PEDI', 12, 'Baby').lastInsertRowid;
  const dGen = insertDept.run('General Medicine', 'GEN', 10, 'Stethoscope').lastInsertRowid;
  const dGyne = insertDept.run('Gynecology', 'GYNE', 15, 'ShieldPlus').lastInsertRowid;

  console.log('✓ Seeded Departments');

  // 3. Seed Doctors
  const insertDoc = db.prepare(`
    INSERT INTO doctors (user_id, department_id, room_number, specialization, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const docSharma = insertDoc.run(uDrSharma, dCard, 'Room 101', 'Senior Interventional Cardiologist', 'AVAILABLE').lastInsertRowid;
  const docPatel = insertDoc.run(uDrPatel, dPedi, 'Room 104', 'Lead Pediatric Specialist', 'AVAILABLE').lastInsertRowid;
  const docKhan = insertDoc.run(uDrKhan, dOrth, 'Room 102', 'Orthopedic Trauma Surgeon', 'AVAILABLE').lastInsertRowid;

  console.log('✓ Seeded Doctors');

  // 4. Seed Patients
  const insertPatient = db.prepare(`
    INSERT INTO patients (uhid, name, age, gender, phone)
    VALUES (?, ?, ?, ?, ?)
  `);

  const patients = [
    { uhid: 'UHID-2026-001', name: 'Robert Chen', age: 67, gender: 'Male', phone: '+1-555-0101' },
    { uhid: 'UHID-2026-002', name: 'Aisha Al-Mansoor', age: 29, gender: 'Female', phone: '+1-555-0102' },
    { uhid: 'UHID-2026-003', name: 'David Miller', age: 45, gender: 'Male', phone: '+1-555-0103' },
    { uhid: 'UHID-2026-004', name: 'Elena Rostova', age: 31, gender: 'Female', phone: '+1-555-0104' },
    { uhid: 'UHID-2026-005', name: 'James Wilson', age: 72, gender: 'Male', phone: '+1-555-0105' },
    { uhid: 'UHID-2026-006', name: 'Maya Gupta', age: 7, gender: 'Female', phone: '+1-555-0106' },
    { uhid: 'UHID-2026-007', name: 'Liam O’Connor', age: 4, gender: 'Male', phone: '+1-555-0107' },
    { uhid: 'UHID-2026-008', name: 'Grace Kim', age: 53, gender: 'Female', phone: '+1-555-0108' },
    { uhid: 'UHID-2026-009', name: 'Samuel Jackson', age: 62, gender: 'Male', phone: '+1-555-0109' },
    { uhid: 'UHID-2026-010', name: 'Fatima Zahra', age: 26, gender: 'Female', phone: '+1-555-0110' },
    { uhid: 'UHID-2026-011', name: 'Arthur Pendelton', age: 80, gender: 'Male', phone: '+1-555-0111' },
    { uhid: 'UHID-2026-012', name: 'Carlos Mendez', age: 38, gender: 'Male', phone: '+1-555-0112' }
  ];

  const pIds = {};
  patients.forEach(p => {
    const row = insertPatient.run(p.uhid, p.name, p.age, p.gender, p.phone);
    pIds[p.uhid] = row.lastInsertRowid;
  });

  console.log('✓ Seeded Patients');

  // 5. Seed OPD Queue
  const insertQueue = db.prepare(`
    INSERT INTO opd_queue (
      token_number, patient_id, department_id, doctor_id, visit_date, 
      status, priority, priority_weight, called_at, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Cardiology Queue
  insertQueue.run('CARD-001', pIds['UHID-2026-001'], dCard, docSharma, today, 'COMPLETED', 'SENIOR_CITIZEN', getPriorityWeight('SENIOR_CITIZEN'), '2026-10-14 09:15:00', 'Routine hypertension review', '2026-10-14 08:30:00');
  insertQueue.run('CARD-002', pIds['UHID-2026-003'], dCard, docSharma, today, 'IN_CONSULTATION', 'NORMAL', getPriorityWeight('NORMAL'), '2026-10-14 09:40:00', 'ECG review and chest tightness investigation', '2026-10-14 08:45:00');
  insertQueue.run('CARD-003', pIds['UHID-2026-005'], dCard, docSharma, today, 'WAITING', 'EMERGENCY', getPriorityWeight('EMERGENCY'), null, 'Acute shortness of breath - Priority triage', '2026-10-14 09:00:00');
  insertQueue.run('CARD-004', pIds['UHID-2026-008'], dCard, docSharma, today, 'WAITING', 'NORMAL', getPriorityWeight('NORMAL'), null, 'Follow up lipid panel', '2026-10-14 09:05:00');
  insertQueue.run('CARD-005', pIds['UHID-2026-011'], dCard, docSharma, today, 'WAITING', 'SENIOR_CITIZEN', getPriorityWeight('SENIOR_CITIZEN'), null, 'Pacemaker checkup', '2026-10-14 09:20:00');

  // Pediatrics Queue
  insertQueue.run('PEDI-001', pIds['UHID-2026-006'], dPedi, docPatel, today, 'IN_CONSULTATION', 'NORMAL', getPriorityWeight('NORMAL'), '2026-10-14 09:35:00', 'High fever and earache', '2026-10-14 08:50:00');
  insertQueue.run('PEDI-002', pIds['UHID-2026-007'], dPedi, docPatel, today, 'WAITING', 'NORMAL', getPriorityWeight('NORMAL'), null, 'Asthma follow-up', '2026-10-14 09:10:00');

  // Gynecology Queue
  insertQueue.run('GYNE-001', pIds['UHID-2026-002'], dGyne, null, today, 'WAITING', 'PREGNANT', getPriorityWeight('PREGNANT'), null, 'Third trimester anomaly scan review', '2026-10-14 08:55:00');
  insertQueue.run('GYNE-002', pIds['UHID-2026-010'], dGyne, null, today, 'WAITING', 'PREGNANT', getPriorityWeight('PREGNANT'), null, 'Routine prenatal checkup', '2026-10-14 09:15:00');

  // Orthopedics Queue
  insertQueue.run('ORTH-001', pIds['UHID-2026-012'], dOrth, docKhan, today, 'WAITING', 'NORMAL', getPriorityWeight('NORMAL'), null, 'Right knee ligament sprain', '2026-10-14 09:25:00');

  console.log('✓ Seeded OPD Queue');

  // 6. Seed Wards
  const insertWard = db.prepare(`
    INSERT INTO wards (name, code, floor, total_beds, low_bed_threshold)
    VALUES (?, ?, ?, ?, ?)
  `);

  const wIcu = insertWard.run('Intensive Care Unit (ICU)', 'ICU', 'Floor 3', 6, 2).lastInsertRowid;
  const wEmerg = insertWard.run('Emergency & Trauma', 'EMERG', 'Ground Floor', 8, 2).lastInsertRowid;
  const wGen = insertWard.run('General Inpatient Ward', 'GEN', 'Floor 2', 12, 3).lastInsertRowid;
  const wMat = insertWard.run('Maternity Ward', 'MAT', 'Floor 1', 6, 2).lastInsertRowid;
  const wPed = insertWard.run('Pediatric Ward', 'PED', 'Floor 1', 6, 2).lastInsertRowid;

  console.log('✓ Seeded Wards');

  // 7. Seed Beds & Admissions
  const insertBed = db.prepare(`
    INSERT INTO beds (ward_id, bed_number, status, current_patient_id, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAdmission = db.prepare(`
    INSERT INTO bed_admissions (bed_id, patient_id, admitted_at, admitting_doctor, diagnosis, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Helper to create bed and optional admission
  const createBedWithPatient = (wardId, bedNumber, status, patientId = null, diag = null) => {
    const bedId = insertBed.run(wardId, bedNumber, status, patientId, diag ? `Diagnosis: ${diag}` : null).lastInsertRowid;
    if (patientId && status === 'OCCUPIED') {
      insertAdmission.run(bedId, patientId, '2026-10-13 14:00:00', 'Dr. Rajesh Sharma', diag, 'Admitted via Emergency OPD', 'ACTIVE');
    }
    return bedId;
  };

  // ICU Beds (6 total: 4 occupied, 1 cleaning, 1 available -> LOW ALERT triggering!)
  createBedWithPatient(wIcu, 'ICU-01', 'OCCUPIED', pIds['UHID-2026-001'], 'Post-cardiac arrest monitoring');
  createBedWithPatient(wIcu, 'ICU-02', 'OCCUPIED', pIds['UHID-2026-003'], 'Acute myocardial infarction');
  createBedWithPatient(wIcu, 'ICU-03', 'OCCUPIED', pIds['UHID-2026-005'], 'Respiratory failure');
  createBedWithPatient(wIcu, 'ICU-04', 'OCCUPIED', pIds['UHID-2026-009'], 'Post-operative septic shock');
  createBedWithPatient(wIcu, 'ICU-05', 'CLEANING', null);
  createBedWithPatient(wIcu, 'ICU-06', 'AVAILABLE', null);

  // Emergency Beds (8 total: 5 occupied, 1 cleaning, 2 available)
  createBedWithPatient(wEmerg, 'EMERG-01', 'OCCUPIED', pIds['UHID-2026-012'], 'Multiple trauma evaluation');
  createBedWithPatient(wEmerg, 'EMERG-02', 'OCCUPIED', pIds['UHID-2026-008'], 'Severe diabetic ketoacidosis');
  createBedWithPatient(wEmerg, 'EMERG-03', 'AVAILABLE', null);
  createBedWithPatient(wEmerg, 'EMERG-04', 'AVAILABLE', null);
  createBedWithPatient(wEmerg, 'EMERG-05', 'CLEANING', null);
  createBedWithPatient(wEmerg, 'EMERG-06', 'RESERVED', null);
  createBedWithPatient(wEmerg, 'EMERG-07', 'AVAILABLE', null);
  createBedWithPatient(wEmerg, 'EMERG-08', 'AVAILABLE', null);

  // General Ward Beds (12 total: 6 occupied, 2 cleaning, 4 available)
  for (let i = 1; i <= 12; i++) {
    const num = `GEN-${String(i).padStart(2, '0')}`;
    if (i <= 6) {
      createBedWithPatient(wGen, num, 'OCCUPIED', pIds['UHID-2026-004'], 'Infectious gastroenteritis & rehydration');
    } else if (i <= 8) {
      createBedWithPatient(wGen, num, 'CLEANING', null);
    } else if (i === 9) {
      createBedWithPatient(wGen, num, 'OUT_OF_SERVICE', null);
    } else {
      createBedWithPatient(wGen, num, 'AVAILABLE', null);
    }
  }

  // Maternity Ward (6 total: 3 occupied, 1 cleaning, 2 available)
  createBedWithPatient(wMat, 'MAT-01', 'OCCUPIED', pIds['UHID-2026-002'], 'Pre-labor observation');
  createBedWithPatient(wMat, 'MAT-02', 'OCCUPIED', pIds['UHID-2026-010'], 'Post-cesarean recovery');
  createBedWithPatient(wMat, 'MAT-03', 'AVAILABLE', null);
  createBedWithPatient(wMat, 'MAT-04', 'AVAILABLE', null);
  createBedWithPatient(wMat, 'MAT-05', 'CLEANING', null);
  createBedWithPatient(wMat, 'MAT-06', 'AVAILABLE', null);

  // Pediatric Ward (6 total: 2 occupied, 4 available)
  createBedWithPatient(wPed, 'PED-01', 'OCCUPIED', pIds['UHID-2026-006'], 'Severe pediatric pneumonia');
  createBedWithPatient(wPed, 'PED-02', 'OCCUPIED', pIds['UHID-2026-007'], 'Acute bronchiolitis');
  createBedWithPatient(wPed, 'PED-03', 'AVAILABLE', null);
  createBedWithPatient(wPed, 'PED-04', 'AVAILABLE', null);
  createBedWithPatient(wPed, 'PED-05', 'AVAILABLE', null);
  createBedWithPatient(wPed, 'PED-06', 'AVAILABLE', null);

  console.log('✓ Seeded 38 Beds and active Inpatient Admissions');
  console.log('--- Database Seed Completed Successfully ---');
}

seedDatabase();
