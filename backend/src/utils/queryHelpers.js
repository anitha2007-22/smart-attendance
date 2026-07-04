/**
 * Extracts and sanitizes pagination params from request query.
 */
function getPagination(req, defaultLimit = 10, maxLimit = 100) {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Whitelist-based sort helper to prevent SQL injection via ORDER BY.
 */
function getSort(req, allowedColumns, defaultColumn) {
  const sortBy = allowedColumns.includes(req.query.sortBy)
    ? req.query.sortBy
    : defaultColumn;
  const sortOrder = (req.query.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { sortBy, sortOrder };
}

module.exports = { getPagination, getSort };
