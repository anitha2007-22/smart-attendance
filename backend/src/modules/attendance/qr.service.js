const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const QRCode = require('qrcode');
const env = require('../../config/env');
const { ApiError } = require('../../utils/apiResponse');

/**
 * QR Attendance Security Design
 * ------------------------------
 * Each active session has a `qr_secret` (random string) stored server-side.
 * The QR code payload is a short-lived JWT signed with QR_SECRET, containing:
 *   { sessionId, nonce, iat, exp }
 * The frontend polls GET /faculty/sessions/:id/qr every QR_TOKEN_TTL_SECONDS
 * to fetch a freshly signed token, so the displayed QR image rotates and a
 * screenshot becomes worthless within seconds (TTL ~15-20s).
 * The nonce is regenerated every rotation and is single-use per scan window
 * (duplicate-scan of a stale nonce is rejected once it has been consumed once,
 * enforced by attendance_records unique(session_id, student_id) + expiry check).
 */

function generateQrToken(sessionId, sessionSecret) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = { sessionId, nonce };
  const token = jwt.sign(payload, `${env.QR_SECRET}.${sessionSecret}`, {
    expiresIn: env.QR_TOKEN_TTL_SECONDS,
  });
  const expiresAt = new Date(Date.now() + env.QR_TOKEN_TTL_SECONDS * 1000);
  return { token, expiresAt, nonce };
}

async function generateQrImage(token) {
  // Encodes the JWT token as a QR code data URL (base64 PNG)
  return QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}

function verifyQrToken(token, sessionSecret) {
  try {
    return jwt.verify(token, `${env.QR_SECRET}.${sessionSecret}`);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(410, 'QR code has expired. Please scan the latest code.');
    }
    throw new ApiError(400, 'Invalid or tampered QR code');
  }
}

function generateSessionSecret() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Accessibility fallback: large, human-readable 6-digit code.
 * ---------------------------------------------------------------
 * A QR code projected at the front of a large classroom is often
 * unreadable to back-row students, even with a phone camera. This
 * generates a random 6-digit code every time a new QR is issued
 * (whether by the scheduled poll or a manual "Refresh Now" click),
 * so the code and QR always change together and stay visibly in
 * sync. The currently active code is stored on the session row
 * (attendance_sessions.active_short_code) and verified by direct
 * comparison — no separate time-window math needed, since the DB
 * row IS the source of truth for "what's currently on screen".
 */
function generateShortCode() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
}

module.exports = {
  generateQrToken,
  generateQrImage,
  verifyQrToken,
  generateSessionSecret,
  generateShortCode,
};
