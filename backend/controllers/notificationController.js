const { Notifications } = require('../config/db');

const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let notifs = await Notifications.find({ userId });
    notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({
      success: true,
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notifications.findByIdAndUpdate(id, { read: true });
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifs = await Notifications.find({ userId });
    for (const n of notifs) {
      await Notifications.findByIdAndUpdate(n.id, { read: true });
    }
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
