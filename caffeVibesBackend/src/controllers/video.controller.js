import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { Subscription } from "../models/subscription.model.js"
import { createNotification } from "../utils/notification.helper.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const sortDirection = sortType === "asc" ? 1 : -1;

    const matchStage = { isPublished: true };
    if (query) matchStage.title = { $regex: query, $options: "i" };
    if (userId && isValidObjectId(userId)) matchStage.owner = new mongoose.Types.ObjectId(userId);

    const sortStage = { [sortBy]: sortDirection };

    const aggregatePipeline = [
        { $match: matchStage },
        { $sort: sortStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: { $cond: { if: { $isArray: "$views" }, then: { $size: "$views" }, else: { $ifNull: ["$views", 0] } } },
                isPublished: 1,
                "owner._id": 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar": 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ];

    const options = { page: pageNumber, limit: limitNumber };
    const aggregate = Video.aggregate(aggregatePipeline);

    Video.aggregatePaginate(aggregate, options, (err, result) => {
        if (err) {
            throw new ApiError(400, err.message || "Failed to fetch videos");
        } else {
            return res.status(200).json(
                new ApiResponse(200, result, "All Videos Fetched Successfully.")
            );
        }
    });
});

const getAllUserVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    if (!userId) {
        throw new ApiError(400, "userId is required");
    }
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const myAggregateVideos = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel",
            },
        },
        { $unwind: "$channel" },
        {
            $match: {
                ...(query && { title: { $regex: query, $options: "i" } }),
            },
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1,
            },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
            $addFields: {
                views: {
                    $cond: {
                        if: { $isArray: "$views" },
                        then: { $size: "$views" },
                        else: { $ifNull: ["$views", 0] }
                    }
                }
            }
        },
        {
            $project: {
                "channel.email": 0,
                "channel.password": 0,
                "channel.refreshToken": 0,
                "channel.updatedAt": 0,
            }
        }
    ]);

    const result = await Video.aggregatePaginate(myAggregateVideos, { page, limit });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "All User Videos with Channel Info"));
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!(title || description)) {
        throw new ApiError(400, "Title or Description is invalid")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video path is required")
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!(videoFile || thumbnail)) {
        throw new ApiError("Error while uploading file on cloudinary")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        title,
        description,
        duration: videoFile.duration
    })
    await video.save();

    const populatedVideo = await Video.findById(video._id).populate("owner", "username fullName avatar");

    if (req.io) {
        req.io.emit("newVideo", populatedVideo);
    }

    {}
    const subscribers = await Subscription.find({ channel: req.user._id });
    for (const sub of subscribers) {
        await createNotification({
            recipient: sub.subscriber,
            sender: req.user._id,
            type: "VIDEO_UPLOAD",
            video: video._id,
            content: title,
            io: req.io
        });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, populatedVideo, "Video published successfully")
        )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video Id is invalid");
    }

    
    if (req.user?._id) {
        try {
            await Promise.all([
                Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }),
                User.findByIdAndUpdate(req.user._id, { $addToSet: { watchHistory: videoId } })
            ]);
        } catch (viewErr) {
            console.warn('View update skipped:', viewErr.message);
        }
    }

    const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

    const video = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "video",
                as: "dislikes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        { $unwind: "$owner" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: { $and: [{ $ne: [userId, null] }, { $in: [userId, "$likes.likedBy"] }] },
                        then: true,
                        else: false
                    }
                },
                isDisliked: {
                    $cond: {
                        if: { $and: [{ $ne: [userId, null] }, { $in: [userId, "$dislikes.dislikedBy"] }] },
                        then: true,
                        else: false
                    }
                },
                views: { $cond: { if: { $isArray: "$views" }, then: { $size: "$views" }, else: { $ifNull: ["$views", 0] } } },
                "owner.subscribersCount": { $size: "$subscribers" },
                "owner.isSubscribed": {
                    $cond: {
                        if: { $and: [{ $ne: [userId, null] }, { $in: [userId, "$subscribers.subscriber"] }] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "owner._id": 1,
                "owner.avatar": 1,
                "owner.fullName": 1,
                "owner.subscribersCount": 1,
                "owner.username": 1,
                "owner.isSubscribed": 1,
                createdAt: 1,
                description: 1,
                duration: 1,
                likesCount: 1,
                isLiked: 1,
                isDisliked: 1,
                title: 1,
                videoFile: 1,
                thumbnail: 1,
                views: 1,
                isPublished: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0] || null, "Video Details Fetched Successfully")
        )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video Id is invalid")
    }

    const { title, description } = req.body;

    if (!(title || description)) {
        throw new ApiError(400, "Title or Description is invalid")
    }

    const oldVideo = await Video.findById(videoId);

    if (!oldVideo) {
        throw new ApiError(404, "Video not found");
    }

    if (oldVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this video");
    }

    const thumbnailLocalPath = req.file?.path;
    let thumbnailUrl = oldVideo.thumbnail;

    if (thumbnailLocalPath) {
        
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (thumbnail) {
            thumbnailUrl = thumbnail.url;
        }
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title || oldVideo.title,
                description: description || oldVideo.description,
                thumbnail: thumbnailUrl
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video Id is invalid")
    }

    const oldVideo = await Video.findById(videoId);

    if (!oldVideo) {
        throw new ApiError(404, "Video not found");
    }

    if (oldVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this video");
    }

    const video = await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, video, "Video is deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video Id is invalid")
    }
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to toggle publish status");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !(video.isPublished)
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Publish status toggled successfully")
        );

})

export {
    getAllVideos,
    getAllUserVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}