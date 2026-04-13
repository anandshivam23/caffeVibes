import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
    getAllTweets,
    getTweetReplies,
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/user/:userId").get(getUserTweets);
router.route("/").get(getAllTweets);
router.route("/:tweetId/replies").get(getTweetReplies);

router.route("/").post(verifyJWT, createTweet);
router.route("/:tweetId").patch(verifyJWT, updateTweet).delete(verifyJWT, deleteTweet);

export default router