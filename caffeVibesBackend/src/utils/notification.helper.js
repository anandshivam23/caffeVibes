import { Notification } from "../models/notification.model.js";

/**
 * Helper to create a notification and emit via Socket.io
 * @param {Object} data - { recipient, sender, type, video, tweet, comment, content, io }
 */
export const createNotification = async ({ recipient, sender, type, video, tweet, comment, content, io }) => {
    try {
        if (recipient.toString() === sender.toString()) return; // Don't notify self

        const notification = await Notification.create({
            recipient,
            sender,
            type,
            video,
            tweet,
            comment,
            content
        });

        const populatedNotification = await Notification.findById(notification._id)
            .populate("sender", "username avatar fullName")
            .lean();

        if (io) {
            io.emit(`notification:${recipient}`, populatedNotification);
            io.emit("newNotification", populatedNotification); // Global fallback if needed
        }

        return populatedNotification;
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};
