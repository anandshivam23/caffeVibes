import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const getUserNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.aggregate([
        {
            $match: {
                recipient: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderDetails"
            }
        },
        { $unwind: "$senderDetails" },
        {
            $project: {
                _id: 1,
                type: 1,
                isRead: 1,
                createdAt: 1,
                video: 1,
                tweet: 1,
                content: 1,
                "senderDetails._id": 1,
                "senderDetails.username": 1,
                "senderDetails.avatar": 1,
                "senderDetails.fullName": 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, notification, "Notification marked as read"));
});

const clearNotifications = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ recipient: req.user._id });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "All notifications cleared"));
});

export {
    getUserNotifications,
    markNotificationAsRead,
    clearNotifications
};
