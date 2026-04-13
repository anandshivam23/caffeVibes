import mongoose, { isValidObjectId } from "mongoose";
import { DisLike } from "../models/dislike.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoDislike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoID");

    await Like.deleteOne({ video: videoId, likedBy: req.user._id });
    const existing = await DisLike.findOne({ video: videoId, dislikedBy: req.user._id });

    let nowDisliked;
    if (!existing) {
        await DisLike.create({ video: videoId, dislikedBy: req.user._id });
        nowDisliked = true;
    } else {
        await existing.deleteOne();
        nowDisliked = false;
    }

    if (req.io) req.io.emit("postDisliked", { targetId: videoId, disliked: nowDisliked, type: "video" });

    return res.status(200).json(new ApiResponse(200, { isDisliked: nowDisliked }, nowDisliked ? "Disliked the Video" : "Removed Dislike from Video"));
});

const toggleCommentDislike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid CommentId");

    await Like.deleteOne({ comment: commentId, likedBy: req.user._id });
    const existing = await DisLike.findOne({ comment: commentId, dislikedBy: req.user._id });

    let nowDisliked;
    if (!existing) {
        await DisLike.create({ comment: commentId, dislikedBy: req.user._id });
        nowDisliked = true;
    } else {
        await existing.deleteOne();
        nowDisliked = false;
    }

    if (req.io) req.io.emit("postDisliked", { targetId: commentId, disliked: nowDisliked, type: "comment" });

    return res.status(200).json(new ApiResponse(200, { isDisliked: nowDisliked }, nowDisliked ? "Disliked the Comment" : "Removed Dislike"));
});

const toggleTweetDislike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid TweetId");

    await Like.deleteOne({ tweet: tweetId, likedBy: req.user._id });
    const existing = await DisLike.findOne({ tweet: tweetId, dislikedBy: req.user._id });

    let nowDisliked;
    if (!existing) {
        await DisLike.create({ tweet: tweetId, dislikedBy: req.user._id });
        nowDisliked = true;
    } else {
        await existing.deleteOne();
        nowDisliked = false;
    }

    if (req.io) req.io.emit("postDisliked", { targetId: tweetId, disliked: nowDisliked, type: "tweet" });

    return res.status(200).json(new ApiResponse(200, { isDisliked: nowDisliked }, nowDisliked ? "Disliked the Tweet" : "Removed Dislike"));
});

const getDislikedVideos = asyncHandler(async (req, res) => {
    const dislikedVideos = await DisLike.aggregate([
        {
            $match: {
                dislikedBy: new mongoose.Types.ObjectId(req.user._id),
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
                dislikedAt: "$createdAt",
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
        new ApiResponse(200, dislikedVideos, dislikedVideos.length ? "All Disliked Videos" : "No disliked videos found")
    );
});

export {
    toggleVideoDislike,
    toggleCommentDislike,
    toggleTweetDislike,
    getDislikedVideos
};