const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  getPriorityWeight,
  sortQueueItems,
  calculateEstimatedWaitTime
} = require('../src/services/queueService');

describe('queueService unit tests', () => {
  test('assigns correct priority weights', () => {
    assert.strictEqual(getPriorityWeight('EMERGENCY'), 3);
    assert.strictEqual(getPriorityWeight('PREGNANT'), 2);
    assert.strictEqual(getPriorityWeight('SENIOR_CITIZEN'), 1);
    assert.strictEqual(getPriorityWeight('NORMAL'), 0);
    assert.strictEqual(getPriorityWeight('unknown'), 0);
  });

  test('sorts queue prioritizing emergency cases above normal regardless of registration time', () => {
    const queue = [
      { id: 1, token_number: 'CARD-001', priority: 'NORMAL', created_at: '2026-10-14T08:00:00Z', status: 'WAITING' },
      { id: 2, token_number: 'CARD-002', priority: 'NORMAL', created_at: '2026-10-14T08:10:00Z', status: 'WAITING' },
      { id: 3, token_number: 'CARD-003', priority: 'EMERGENCY', created_at: '2026-10-14T08:20:00Z', status: 'WAITING' }
    ];

    const sorted = sortQueueItems(queue);
    assert.strictEqual(sorted[0].token_number, 'CARD-003'); // Emergency moves to front!
    assert.strictEqual(sorted[1].token_number, 'CARD-001'); // Normal arrived 08:00
    assert.strictEqual(sorted[2].token_number, 'CARD-002'); // Normal arrived 08:10
  });

  test('sorts pregnant and senior citizen above normal', () => {
    const queue = [
      { id: 1, token_number: 'GEN-001', priority: 'NORMAL', created_at: '2026-10-14T08:00:00Z', status: 'WAITING' },
      { id: 2, token_number: 'GEN-002', priority: 'SENIOR_CITIZEN', created_at: '2026-10-14T08:05:00Z', status: 'WAITING' },
      { id: 3, token_number: 'GEN-003', priority: 'PREGNANT', created_at: '2026-10-14T08:10:00Z', status: 'WAITING' },
      { id: 4, token_number: 'GEN-004', priority: 'EMERGENCY', created_at: '2026-10-14T08:15:00Z', status: 'WAITING' }
    ];

    const sorted = sortQueueItems(queue);
    assert.strictEqual(sorted[0].token_number, 'GEN-004'); // EMERGENCY (weight 3)
    assert.strictEqual(sorted[1].token_number, 'GEN-003'); // PREGNANT (weight 2)
    assert.strictEqual(sorted[2].token_number, 'GEN-002'); // SENIOR_CITIZEN (weight 1)
    assert.strictEqual(sorted[3].token_number, 'GEN-001'); // NORMAL (weight 0)
  });

  test('preserves First-Come First-Served for identical priority levels', () => {
    const queue = [
      { id: 1, token_number: 'ORTH-001', priority: 'SENIOR_CITIZEN', created_at: '2026-10-14T08:30:00Z', status: 'WAITING' },
      { id: 2, token_number: 'ORTH-002', priority: 'SENIOR_CITIZEN', created_at: '2026-10-14T08:20:00Z', status: 'WAITING' }
    ];

    const sorted = sortQueueItems(queue);
    assert.strictEqual(sorted[0].token_number, 'ORTH-002'); // Earlier registered first
    assert.strictEqual(sorted[1].token_number, 'ORTH-001');
  });

  test('calculates estimated wait times accurately', () => {
    // 0 patients ahead, doctor not consulting
    const wait0 = calculateEstimatedWaitTime(0, 15, false, 'AVAILABLE');
    assert.strictEqual(wait0.minutes, 0);
    assert.strictEqual(wait0.label, 'Next in line (~5m)');

    // 0 patients ahead, but doctor IS currently consulting someone
    const waitActive = calculateEstimatedWaitTime(0, 15, true, 'AVAILABLE');
    assert.strictEqual(waitActive.minutes, 15);
    assert.strictEqual(waitActive.label, '~15 mins');

    // 2 patients ahead, doctor consulting
    const wait2 = calculateEstimatedWaitTime(2, 15, true, 'AVAILABLE');
    assert.strictEqual(wait2.minutes, 45); // (2 + 1) * 15 = 45
    assert.strictEqual(wait2.label, '~45 mins');

    // Doctor on break adds 15 minutes buffer
    const waitBreak = calculateEstimatedWaitTime(1, 15, false, 'ON_BREAK');
    assert.strictEqual(waitBreak.minutes, 30); // 1*15 + 15 = 30
    assert.strictEqual(waitBreak.label, '~30 mins');

    // Doctor off duty
    const waitOff = calculateEstimatedWaitTime(1, 15, false, 'OFF_DUTY');
    assert.strictEqual(waitOff.minutes, null);
    assert.strictEqual(waitOff.label, 'Doctor Off Duty');
  });
});
