/**
 * Automated End-to-End API and Workflow Verification
 * Simulates complete user role workflows:
 * 1. Receptionist Intake & Token Generation (with Priority triage)
 * 2. Public Display feed verification
 * 3. Doctor "Call Next", consultation notes, and completion
 * 4. Ward Staff Bed Admission, Discharge, and Sanitization workflow
 * 5. Analytics KPIs and CSV Export validation
 */

const assert = require('node:assert');

async function runE2EVerification() {
  console.log('=== Running CareSync Hospital End-to-End Verification ===\n');

  const BASE_URL = 'http://localhost:5000/api';

  // 1. Authenticate as Receptionist
  console.log('1. Testing Receptionist Login...');
  const recLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'reception', password: 'hospital123' })
  });
  assert.strictEqual(recLoginRes.status, 200, 'Receptionist login should succeed');
  const recData = await recLoginRes.json();
  const recToken = recData.token;
  console.log('   ✓ Logged in as:', recData.user.full_name, `(${recData.user.role})`);

  // 2. Issue an Emergency Token
  console.log('\n2. Testing Patient Intake with EMERGENCY Priority...');
  const regRes = await fetch(`${BASE_URL}/queue/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${recToken}`
    },
    body: JSON.stringify({
      name: 'Marcus Holloway',
      age: 52,
      gender: 'Male',
      phone: '+1-555-4321',
      department_id: 1, // Cardiology
      priority: 'EMERGENCY',
      notes: 'Severe radiating chest pain - Immediate triage'
    })
  });
  assert.strictEqual(regRes.status, 201, 'Token registration should succeed');
  const regData = await regRes.json();
  const emergencyToken = regData.token;
  console.log('   ✓ Token Issued:', emergencyToken.token_number);
  console.log('   ✓ Priority Weight:', emergencyToken.priority_weight, `(${emergencyToken.priority})`);
  assert.strictEqual(emergencyToken.priority, 'EMERGENCY');
  assert.match(emergencyToken.token_number, /^CARD-\d{3}$/);

  // 3. Verify Public Display Feed
  console.log('\n3. Testing Public Display Feed...');
  const displayRes = await fetch(`${BASE_URL}/queue/public-summary`);
  assert.strictEqual(displayRes.status, 200);
  const displayData = await displayRes.json();
  console.log('   ✓ Active Waiting Tokens:', displayData.waitingTokens.length);
  // Verify emergency token is sorted to top of waiting list
  const topWaiting = displayData.waitingTokens[0];
  console.log('   ✓ Top Waiting Token in Hospital:', topWaiting.token_number, `(${topWaiting.priority})`);
  assert.strictEqual(topWaiting.priority, 'EMERGENCY', 'Emergency token must jump to top of queue');

  // 4. Authenticate as Doctor (Cardiology)
  console.log('\n4. Testing Doctor Login (Dr. Rajesh Sharma)...');
  const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'dr.sharma', password: 'hospital123' })
  });
  assert.strictEqual(docLoginRes.status, 200);
  const docData = await docLoginRes.json();
  const docToken = docData.token;
  console.log('   ✓ Logged in as:', docData.user.full_name, `(${docData.user.doctor.department_name})`);

  // 5. Doctor Calls Next Patient
  console.log('\n5. Doctor Calls Next Patient in Cardiology...');
  const callRes = await fetch(`${BASE_URL}/queue/call-next`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${docToken}`
    },
    body: JSON.stringify({
      department_id: docData.user.doctor.department_id,
      doctor_id: docData.user.doctor.id
    })
  });
  assert.strictEqual(callRes.status, 200);
  const callData = await callRes.json();
  console.log('   ✓ Called Token:', callData.token.token_number, 'Patient:', callData.token.patient_name);
  assert.strictEqual(callData.token.status, 'IN_CONSULTATION');

  // 6. Complete Consultation
  console.log('\n6. Doctor Completes Consultation with Clinical Notes...');
  const compRes = await fetch(`${BASE_URL}/queue/${callData.token.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${docToken}`
    },
    body: JSON.stringify({
      status: 'COMPLETED',
      notes: 'Sublingual nitroglycerin administered, ECG normal sinus, scheduled outpatient Holter.'
    })
  });
  assert.strictEqual(compRes.status, 200);
  console.log('   ✓ Consultation marked COMPLETED');

  // 7. Ward Operations: Admit & Discharge
  console.log('\n7. Testing Ward Operations (Ward Staff Login)...');
  const wardLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'wardadmin', password: 'hospital123' })
  });
  assert.strictEqual(wardLoginRes.status, 200);
  const wardData = await wardLoginRes.json();
  const wardToken = wardData.token;

  // Find an available bed
  const gridRes = await fetch(`${BASE_URL}/beds/grid?status=AVAILABLE`, {
    headers: { 'Authorization': `Bearer ${wardToken}` }
  });
  const gridData = await gridRes.json();
  const targetBed = gridData.beds[0];
  console.log('   ✓ Found Available Bed:', targetBed.bed_number, `(${targetBed.ward_name})`);

  // Admit patient
  console.log('   -> Admitting Sophia Thorne to', targetBed.bed_number);
  const admitRes = await fetch(`${BASE_URL}/beds/admit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${wardToken}`
    },
    body: JSON.stringify({
      bed_id: targetBed.id,
      name: 'Sophia Thorne',
      age: 41,
      gender: 'Female',
      phone: '+1-555-7766',
      admitting_doctor: 'Dr. Rajesh Sharma',
      diagnosis: 'Acute Coronary Syndrome Monitoring'
    })
  });
  assert.strictEqual(admitRes.status, 201);
  const admitData = await admitRes.json();
  assert.strictEqual(admitData.bed.status, 'OCCUPIED');
  assert.strictEqual(admitData.bed.patient_name, 'Sophia Thorne');
  console.log('   ✓ Admission confirmed! Bed status is now OCCUPIED.');

  // Discharge patient -> Bed transitions to CLEANING
  console.log('   -> Discharging patient from', targetBed.bed_number);
  const dischargeRes = await fetch(`${BASE_URL}/beds/${targetBed.id}/discharge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${wardToken}`
    },
    body: JSON.stringify({ notes: 'Discharged in stable condition' })
  });
  assert.strictEqual(dischargeRes.status, 200);
  const dischargeData = await dischargeRes.json();
  assert.strictEqual(dischargeData.bed.status, 'CLEANING');
  console.log('   ✓ Patient discharged! Bed transitioned to CLEANING.');

  // Mark Cleaned -> Bed returns to AVAILABLE
  console.log('   -> Sanitization complete, marking bed AVAILABLE');
  const cleanRes = await fetch(`${BASE_URL}/beds/${targetBed.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${wardToken}`
    },
    body: JSON.stringify({ status: 'AVAILABLE', notes: 'Sanitized & ready' })
  });
  assert.strictEqual(cleanRes.status, 200);
  const cleanData = await cleanRes.json();
  assert.strictEqual(cleanData.bed.status, 'AVAILABLE');
  console.log('   ✓ Bed returned to AVAILABLE status.');

  // 8. Analytics & CSV Export
  console.log('\n8. Testing Analytics & CSV Export...');
  const kpiRes = await fetch(`${BASE_URL}/reports/today-kpis`);
  assert.strictEqual(kpiRes.status, 200);
  const kpis = await kpiRes.json();
  console.log('   ✓ Total Patients Today:', kpis.kpis.total_patients_today);
  console.log('   ✓ Completed Consultations:', kpis.kpis.completed_consultations);
  console.log('   ✓ Inpatient Bed Occupancy:', kpis.kpis.bed_occupancy_rate + '%');

  const csvRes = await fetch(`${BASE_URL}/reports/export-csv`);
  assert.strictEqual(csvRes.status, 200);
  const csvText = await csvRes.text();
  assert(csvText.includes('=== HOSPITAL OPD QUEUE REPORT'));
  assert(csvText.includes('=== HOSPITAL INPATIENT BED ADMISSIONS'));
  assert(csvText.includes('Marcus Holloway'));
  console.log('   ✓ CSV report generated successfully (' + csvText.length + ' bytes)');

  console.log('\n============================================================');
  console.log('🎉 ALL END-TO-END WORKFLOWS VERIFIED SUCCESSFULLY (100% PASS)!');
  console.log('============================================================\n');
}

runE2EVerification().catch(err => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
