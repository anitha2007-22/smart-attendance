const { ApiError } = require('../utils/apiResponse');

/**
 * Role-based access control middleware.
 * Usage: router.get('/x', authenticate, authorize('admin', 'faculty'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = authorize;