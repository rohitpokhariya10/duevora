import NotificationDao from "../../../shared/dao/notification.dao.js";
import Ok from "../../../shared/responses/Ok.response.js";

class NotificationsController {
    constructor() { this.notificationDao = new NotificationDao(); }

    listNotifications = async (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const organizationId = req.user.organizationId;
        const userId = req.user._id;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const filter = { organizationId, userId };

        const [notifications, total] = await Promise.all([
            this.notificationDao.Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            this.notificationDao.Model.countDocuments(filter)
        ]);

        return Ok(res, "Notifications retrieved successfully", {
            notifications, total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    }
}

export default NotificationsController;
