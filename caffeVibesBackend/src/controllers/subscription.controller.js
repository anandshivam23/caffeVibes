import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { createNotification } from "../utils/notification.helper.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID")
    }

    if (req.user._id.toString() === channelId.toString()) {
        throw new ApiError(400, "You can't subscribe your own channel.")
    }

    const existingSubscription = await Subscription.findOne({ channel: channelId, subscriber: req.user._id });

    let nowSubscribed;
    if (!existingSubscription) {
        await Subscription.create({ subscriber: req.user._id, channel: channelId });
        nowSubscribed = true;
    } else {
        await existingSubscription.deleteOne();
        nowSubscribed = false;
    }

    const subscribersCount = await Subscription.countDocuments({ channel: channelId });

    if (req.io) {
        req.io.emit("subscriptionUpdate", {
            channelId,
            subscribersCount,
            isSubscribed: nowSubscribed,
            byUserId: req.user._id
        });
    }

    if (nowSubscribed) {
        await createNotification({
            recipient: channelId,
            sender: req.user._id,
            type: "SUBSCRIPTION",
            io: req.io
        });
    }

    return res.status(200).json(
        new ApiResponse(200, { isSubscribed: nowSubscribed, subscribersCount }, nowSubscribed ? "Channel Subscribed" : "Unsubscribed channel")
    )
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;    

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel Id")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        }, {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        }, {
            $unwind: "$subscriberDetails"
        }, {
            $project: {
                _id: 0,
                username: "$subscriberDetails.username",
                avatar: "$subscriberDetails.avatar"
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(400, "Fetching Subscriber Failed");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribers, "Channel Subscribers fetched successfully")
    )

})

const getSubscribedChannels = asyncHandler(async (req, res) => {
   
    const subscriberId = req.params.channelId || req.params.subscriberId;

        if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriberId")
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        }, {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        }, 
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscriberDetails" }
            }
        },
        {
            $unwind: "$channelDetails"
        }, {
            $project: {
                _id: "$channelDetails._id",
                username: "$channelDetails.username",
                avatar: "$channelDetails.avatar",
                fullName: "$channelDetails.fullName",
                subscriberCount: 1
            }
        }
    ])

    if(!channels){
        throw new ApiError(400, "Fetching Channel Failed");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channels, "User Subscribed Channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}