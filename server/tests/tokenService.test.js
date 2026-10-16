const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatTokenNumber, getTodayDateString } = require('../src/services/tokenService');

describe('tokenService unit tests', () => {
  test('formats token correctly with 3-digit padding', () => {
    assert.strictEqual(formatTokenNumber('CARD', 1), 'CARD-001');
    assert.strictEqual(formatTokenNumber('ORTH', 12), 'ORTH-012');
    assert.strictEqual(formatTokenNumber('PEDI', 105), 'PEDI-105');
  });

  test('normalizes lowercase department codes to uppercase', () => {
    assert.strictEqual(formatTokenNumber('card', 7), 'CARD-007');
    assert.strictEqual(formatTokenNumber(' gen ', 3), 'GEN-003');
  });

  test('throws error if department code is missing or empty', () => {
    assert.throws(() => formatTokenNumber('', 1), /Valid department code is required/);
    assert.throws(() => formatTokenNumber(null, 1), /Valid department code is required/);
  });

  test('getTodayDateString returns YYYY-MM-DD pattern', () => {
    const today = getTodayDateString();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });
});
