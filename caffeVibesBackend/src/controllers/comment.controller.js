import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { createNotification } from "../utils/notification.helper.js"

const getVideoComments = asyncHandler(async (req, res) => {
    
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page,
        limit
    }

    if (!videoId) {
        throw new ApiError(400, "VideoId is invalid");
    }
  
    const myAggregateComments = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commentor"
            }
        }, {
            $unwind: "$commentor" 
        }, {
            $project: {
                _id: 1,
                content: 1,
                parentComment: 1,
                createdAt: 1,
                "commentor._id": 1,
                "commentor.username": 1,
                "commentor.avatar": 1,
                "commentor.fullName": 1,
            }
        }
    ]);

    if (!myAggregateComments) {
        throw new ApiError(400, "Invalid comment fetching.")
    }

    Comment.aggregatePaginate(myAggregateComments, options, function (err, results) {
        if (err) {
            console.error(err);
            throw new ApiError(400, "Invalid comment fetching in aggregation pipeline.")
        } else {
            return res
                .status(200)
                .json(
                    new ApiResponse(200, results, "Got Video all comments successfully.")
                )
        }
    })

})

const addComment = asyncHandler(async (req, res) => {
   
    const { content, parentComment } = req.body;
    const videoId = req.params.videoId;
    const userId = req.user._id;

    if (!content) {
        throw new ApiError(400, "Content is invalid");
    }
    if (!videoId) {
        throw new ApiError(400, "Video Id doesn't exist")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId,
        parentComment: parentComment || null
    });
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate("owner", "username fullName avatar");

    if (req.io) {
        req.io.emit("newComment", { videoId, comment: populatedComment });
    }

    {}
    const video = await Video.findById(videoId);
    if (video) {
        await createNotification({
            recipient: video.owner,
            sender: req.user._id,
            type: "COMMENT",
            video: videoId,
            comment: comment._id,
            content: content,
            io: req.io
        });
    }

    {}
    if (parentComment) {
        const parent = await Comment.findById(parentComment);
        if (parent) {
            await createNotification({
                recipient: parent.owner,
                sender: req.user._id,
                type: "REPLY",
                video: videoId,
                comment: comment._id,
                content: content,
                io: req.io
            });
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, populatedComment, "Comment created successfully")
        )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { updatedContent, content } = req.body;
    const finalContent = updatedContent || content;

    if (!finalContent) {
        throw new ApiError(400, "Content is invalid")
    }

    if (!commentId) {
        throw new ApiError(400, "Comment Id is invalid.");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this comment");
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: finalContent,
            }
        },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updateComment, "Comment updated successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!commentId) {
        throw new ApiError(400, "Comment Id is invalid.")
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully."));
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}