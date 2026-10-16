/**
 * Token generation service for OPD Queue
 * Generates department-specific, daily sequential tokens (e.g. CARD-001, ORTH-002)
 */

function formatTokenNumber(deptCode, sequenceNumber) {
  if (!deptCode || typeof deptCode !== 'string') {
    throw new Error('Valid department code is required');
  }
  const cleanCode = deptCode.trim().toUpperCase();
  const paddedSeq = String(sequenceNumber).padStart(3, '0');
  return `${cleanCode}-${paddedSeq}`;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateNextToken(db, departmentId, customDate = null) {
  const visitDate = customDate || getTodayDateString();

  // Retrieve department code
  const dept = db.prepare('SELECT code FROM departments WHERE id = ?').get(departmentId);
  if (!dept) {
    throw new Error(`Department with ID ${departmentId} not found`);
  }

  // Count existing tokens issued for this department on this date
  const countRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM opd_queue 
    WHERE department_id = ? AND visit_date = ?
  `).get(departmentId, visitDate);

  const nextSequence = (countRow ? countRow.count : 0) + 1;
  const tokenNumber = formatTokenNumber(dept.code, nextSequence);

  return {
    tokenNumber,
    sequence: nextSequence,
    visitDate,
    departmentCode: dept.code
  };
}

module.exports = {
  formatTokenNumber,
  getTodayDateString,
  generateNextToken
};
