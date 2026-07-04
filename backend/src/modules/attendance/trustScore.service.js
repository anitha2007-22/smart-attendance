const { TRUST_SCORE_WEIGHTS, TRUST_LEVEL_THRESHOLDS, TRUST_LEVEL } = require('../../config/constants');

/**
 * Trust Score Calculation
 * ------------------------
 * A weighted score out of 100 built from three independent signals:
 *   1. QR_VALID (50 pts)         - was a valid, non-expired, correctly-signed
 *                                    QR token presented for this exact session?
 *   2. TIME_WINDOW_VALID (30 pts) - was attendance marked within the session's
 *                                    active time window (+ late grace period)?
 *   3. NO_DUPLICATE (20 pts)      - is this the student's first scan attempt
 *                                    for this session (no repeated/duplicate
 *                                    scan attempts detected within the window)?
 *
 * Manual attendance marked by faculty is always scored at 100 / high trust,
 * since it reflects direct faculty judgement and bypasses QR risk entirely.
 *
 * Score >= 80  -> HIGH
 * Score 50-79  -> MEDIUM
 * Score < 50   -> LOW  (auto-flagged for faculty review)
 */
function computeTrustScore({
  method,
  qrValid,
  withinTimeWindow,
  isDuplicateAttempt,
}) {
  if (method === 'manual') {
    return { score: 100, level: TRUST_LEVEL.HIGH, flagged: false, reasons: [] };
  }

  let score = 0;
  const reasons = [];

  if (qrValid) {
    score += TRUST_SCORE_WEIGHTS.QR_VALID;
  } else {
    reasons.push('Invalid or expired QR token');
  }

  if (withinTimeWindow) {
    score += TRUST_SCORE_WEIGHTS.TIME_WINDOW_VALID;
  } else {
    reasons.push('Marked outside the valid session time window');
  }

  if (!isDuplicateAttempt) {
    score += TRUST_SCORE_WEIGHTS.NO_DUPLICATE;
  } else {
    reasons.push('Duplicate attendance attempt detected');
  }

  let level;
  if (score >= TRUST_LEVEL_THRESHOLDS.HIGH) {
    level = TRUST_LEVEL.HIGH;
  } else if (score >= TRUST_LEVEL_THRESHOLDS.MEDIUM) {
    level = TRUST_LEVEL.MEDIUM;
  } else {
    level = TRUST_LEVEL.LOW;
  }

  const flagged = level === TRUST_LEVEL.LOW;

  return { score, level, flagged, reasons };
}

module.exports = { computeTrustScore };