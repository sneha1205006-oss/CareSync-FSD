/**
 * Queue management service
 * Handles priority weighting, queue sorting, and estimated wait times
 */

const PRIORITY_WEIGHTS = {
  EMERGENCY: 3,
  PREGNANT: 2,
  SENIOR_CITIZEN: 1,
  NORMAL: 0
};

function getPriorityWeight(priority) {
  const normalized = (priority || 'NORMAL').toUpperCase();
  return PRIORITY_WEIGHTS[normalized] !== undefined ? PRIORITY_WEIGHTS[normalized] : 0;
}

/**
 * Sorts queue tokens:
 * 1. Waiting tokens sorted by:
 *    a) priority_weight DESC (Emergency first, then Pregnant, Senior Citizen, Normal)
 *    b) created_at ASC (First come first served within same priority level)
 * 2. In Consultation tokens (placed at top if specified)
 */
function sortQueueItems(items) {
  return [...items].sort((a, b) => {
    // If one is in consultation and one is waiting, in consultation comes first
    if (a.status === 'IN_CONSULTATION' && b.status !== 'IN_CONSULTATION') return -1;
    if (b.status === 'IN_CONSULTATION' && a.status !== 'IN_CONSULTATION') return 1;

    // Highest priority weight first
    const weightA = a.priority_weight !== undefined ? a.priority_weight : getPriorityWeight(a.priority);
    const weightB = b.priority_weight !== undefined ? b.priority_weight : getPriorityWeight(b.priority);
    if (weightB !== weightA) {
      return weightB - weightA;
    }

    // Earlier registration time first
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeA - timeB;
  });
}

/**
 * Calculates estimated wait time for a waiting patient
 * @param {number} positionInQueue - 0-indexed position among waiting patients
 * @param {number} avgConsultationMins - Average consultation duration in minutes
 * @param {boolean} isDoctorConsulting - Whether the doctor currently has a patient in consultation
 * @param {string} doctorStatus - 'AVAILABLE', 'ON_BREAK', 'OFF_DUTY'
 */
function calculateEstimatedWaitTime(positionInQueue, avgConsultationMins = 15, isDoctorConsulting = false, doctorStatus = 'AVAILABLE') {
  if (doctorStatus === 'OFF_DUTY') {
    return {
      minutes: null,
      label: 'Doctor Off Duty'
    };
  }

  // Patients ahead + active consultation in progress
  const activeLoad = isDoctorConsulting ? 1 : 0;
  const totalPatientsToWait = positionInQueue + activeLoad;

  let totalMinutes = totalPatientsToWait * avgConsultationMins;

  // If doctor is on break, add 15 minutes break buffer
  if (doctorStatus === 'ON_BREAK') {
    totalMinutes += 15;
  }

  if (totalMinutes === 0) {
    return {
      minutes: 0,
      label: 'Next in line (~5m)'
    };
  }

  if (totalMinutes < 60) {
    return {
      minutes: totalMinutes,
      label: `~${totalMinutes} mins`
    };
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  return {
    minutes: totalMinutes,
    label: remainingMins > 0 ? `~${hours}h ${remainingMins}m` : `~${hours} hr`
  };
}

module.exports = {
  PRIORITY_WEIGHTS,
  getPriorityWeight,
  sortQueueItems,
  calculateEstimatedWaitTime
};
