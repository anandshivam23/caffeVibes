import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Subscription } from "../models/subscription.model.js";
import { createNotification } from "../utils/notification.helper.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content, type, parentTweet } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        type: type || 'tweet',
        owner: req.user._id,
        parentTweet: parentTweet || null
    });

    const populatedTweet = await Tweet.findById(tweet._id).populate("owner", "username fullName avatar");

    const formattedTweet = {
        ...populatedTweet.toObject(),
        ownerDetails: populatedTweet.owner,
        likesCount: 0,
        likes: []
    };

    if (req.io) {
        req.io.emit("newPost", formattedTweet);
    }

    {}
    const subscribers = await Subscription.find({ channel: req.user._id });
    for (const sub of subscribers) {
        await createNotification({
            recipient: sub.subscriber,
            sender: req.user._id,
            type: "TWEET_POST",
            tweet: tweet._id,
            content: content,
            io: req.io
        });
    }

    {}
    if (parentTweet) {
        const parent = await Tweet.findById(parentTweet);
        if (parent) {
            await createNotification({
                recipient: parent.owner,
                sender: req.user._id,
                type: "REPLY",
                tweet: tweet._id,
                content: content,
                io: req.io
            });
        }
    }

    return res
        .status(201)
        .json(new ApiResponse(201, formattedTweet, "Tweet Created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid UserId");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                $or: [
                    { parentTweet: null },
                    { parentTweet: { $exists: false } }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                likes: "$likes",
                isLiked: {
                    $cond: [
                        { $in: [req.user?._id, "$likes.likedBy"] },
                        true,
                        false
                    ]
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                type: 1,
                owner: 1,
                likesCount: 1,
                likes: 1,
                isLiked: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, { 
            fullName: user.fullName,
            username: user.username,
            avatar: user.avatar,
            tweets: tweets || [] 
        }, "User tweets fetched successfully")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    tweet.content = content.trim();
    await tweet.save();

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet Updated Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    await tweet.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet Deleted Successfully"));
});

const getAllTweets = asyncHandler(async (req, res) => {
    const { type = 'tweet' } = req.query;

    const aggregatePipeline = [
        {
            $match: {
                type: type,
                $or: [
                    { parentTweet: null },
                    { parentTweet: { $exists: false } }
                ]
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                likes: {
                    $ifNull: ["$likes", []]
                }
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                type: 1,
                createdAt: 1,
                likesCount: 1,
                "ownerDetails._id": 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
                "likes.likedBy": 1
            }
        }
    ];

    const tweets = await Tweet.aggregate(aggregatePipeline);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets Fetched Successfully"));
});

const getTweetReplies = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }

    const replies = await Tweet.aggregate([
        {
            $match: { parentTweet: new mongoose.Types.ObjectId(tweetId) }
        },
        { $sort: { createdAt: 1 } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" }
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                type: 1,
                parentTweet: 1,
                createdAt: 1,
                likesCount: 1,
                "ownerDetails._id": 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, replies, "Replies Fetched Successfully"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    getAllTweets,
    getTweetReplies
};