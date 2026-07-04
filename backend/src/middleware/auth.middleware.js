const { verifyAccessToken } = require('../utils/token');
const { ApiError } = require('../utils/apiResponse');

/**
 * Verifies the Bearer JWT access token and attaches the decoded payload
 * (userId, role, email) to req.user. Rejects if missing/invalid/expired.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Authentication token missing or malformed');
    }

    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid access token'));
    }
    next(err);
  }
}

module.exports = authenticate;