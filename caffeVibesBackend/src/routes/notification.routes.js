import { Router } from 'express';
import { 
    getUserNotifications, 
    markNotificationAsRead, 
    clearNotifications,
    markAllNotificationsAsRead,
    deleteNotification
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getUserNotifications);
router.route("/read-all").patch(markAllNotificationsAsRead);
router.route("/clear").delete(clearNotifications);
router.route("/:notificationId").delete(deleteNotification);
router.route("/:notificationId/read").patch(markNotificationAsRead);

export default router;
