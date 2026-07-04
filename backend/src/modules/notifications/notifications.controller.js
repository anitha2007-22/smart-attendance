const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./notifications.service');

const getMy = asyncHandler(async (req, res) => {
  const { rows, total, unread } = await service.listForUser(req.user.id, {
    limit: parseInt(req.query.limit, 10) || 20,
    offset: parseInt(req.query.offset, 10) || 0,
    unreadOnly: req.query.unreadOnly === 'true',
  });
  return success(res, 200, 'Notifications fetched', rows, { total, unread });
});

const markRead = asyncHandler(async (req, res) => {
  const notif = await service.markRead(req.params.id, req.user.id);
  return success(res, 200, 'Notification marked as read', notif);
});

const markAllRead = asyncHandler(async (req, res) => {
  await service.markAllRead(req.user.id);
  return success(res, 200, 'All notifications marked as read');
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id);
  return success(res, 200, 'Notification deleted');
});

const broadcast = asyncHandler(async (req, res) => {
  const notifs = await service.broadcast(req.body);
  return success(res, 201, `Notification sent to ${notifs.length} user(s)`, notifs);
});

module.exports = { getMy, markRead, markAllRead, remove, broadcast };