import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["LIKE", "COMMENT", "REPLY", "SUBSCRIPTION", "VIDEO_UPLOAD", "TWEET_POST"],
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        content: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export const Notification = mongoose.model("Notification", notificationSchema);
