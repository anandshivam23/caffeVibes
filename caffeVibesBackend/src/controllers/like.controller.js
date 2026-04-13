import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { DisLike } from "../models/dislike.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { createNotification } from "../utils/notification.helper.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoID");
    }
    await DisLike.deleteOne({ video: videoId, dislikedBy: req.user._id });

    const isLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    if (!isLiked) {
        const like = await Like.create({
            video: videoId,
            likedBy: req.user._id
        });

        if (req.io) req.io.emit("postLiked", { targetId: videoId, liked: true, type: 'video', byUserId: req.user._id.toString() });

        const video = await Video.findById(videoId);
        if (video) {
            await createNotification({
                recipient: video.owner,
                sender: req.user._id,
                type: "LIKE",
                video: videoId,
                io: req.io
            });
        }

        return res.status(200).json(
            new ApiResponse(200, like, "Liked the Video")
        );
    }

    await isLiked.deleteOne();

    if (req.io) req.io.emit("postLiked", { targetId: videoId, liked: false, type: 'video', byUserId: req.user._id.toString() });

    return res.status(200).json(
        new ApiResponse(200, {}, "Unliked the Video")
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid CommentId");
    }

    await DisLike.deleteOne({ comment: commentId, dislikedBy: req.user._id });

    const isLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if (!isLiked) {
        const like = await Like.create({
            comment: commentId,
            likedBy: req.user._id
        });

        if (req.io) req.io.emit("postLiked", { targetId: commentId, liked: true, type: 'comment' });

        const comment = await Comment.findById(commentId);
        if (comment) {
            await createNotification({
                recipient: comment.owner,
                sender: req.user._id,
                type: "LIKE",
                comment: commentId,
                io: req.io
            });
        }

        return res.status(200).json(
            new ApiResponse(200, like, "Liked the Comment")
        );
    }

    await isLiked.deleteOne();

    if (req.io) req.io.emit("postLiked", { targetId: commentId, liked: false, type: 'comment' });

    return res.status(200).json(
        new ApiResponse(200, {}, "Unliked the Comment")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid TweetId");
    }

    await DisLike.deleteOne({ tweet: tweetId, dislikedBy: req.user._id });

    const isLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if (!isLiked) {
        const like = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        });

        if (req.io) req.io.emit("postLiked", { targetId: tweetId, liked: true, type: 'tweet' });

        const tweet = await Tweet.findById(tweetId);
        if (tweet) {
            await createNotification({
                recipient: tweet.owner,
                sender: req.user._id,
                type: "LIKE",
                tweet: tweetId,
                io: req.io
            });
        }

        return res.status(200).json(
            new ApiResponse(200, like, "Liked the Tweet")
        );
    }

    await isLiked.deleteOne();

    if (req.io) req.io.emit("postLiked", { targetId: tweetId, liked: false, type: 'tweet' });

    return res.status(200).json(
        new ApiResponse(200, {}, "Unliked the Tweet")
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$videoDetails" },
        { $unwind: "$channel" },
        {
            $project: {
                _id: 0,
                likedAt: "$createdAt",
                videoDetails: 1,
                channel: {
                    _id: "$channel._id",
                    username: "$channel.username",
                    fullName: "$channel.fullName",
                    avatar: "$channel.avatar"
                }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            likedVideos,
            likedVideos.length ? "All Liked Videos" : "No liked videos found"
        )
    );
});

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
};