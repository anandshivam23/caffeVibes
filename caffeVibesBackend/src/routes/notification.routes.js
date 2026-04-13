import { Router } from 'express';
import { 
    getUserNotifications, 
    markNotificationAsRead, 
    clearNotifications 
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getUserNotifications);
router.route("/:notificationId/read").patch(markNotificationAsRead);
router.route("/clear").delete(clearNotifications);

export default router;
