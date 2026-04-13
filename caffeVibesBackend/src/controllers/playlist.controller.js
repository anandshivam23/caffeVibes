import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, isPublic } = req.body    

    if (!name) {
        throw new ApiError(400, "Name is required.")
    }

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: req.user._id,
        isPublic: isPublic !== undefined ? isPublic : true
    })

    if (!playlist) {
        throw new ApiError(400, "Playlist Creation Failed")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Playlist Created Successfully")
        )
})

const getUserPlaylists = asyncHandler(async (req, res) => {

    let { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid UserId");
    }

    const query = { owner: userId };
    
    if (req.user?._id.toString() !== userId.toString()) {
        query.$or = [
            { isPublic: true },
            { isPublic: { $exists: false } }
        ];
    }

    const userPlaylists = await Playlist.find(query)
    .populate({
        path: "videos",
        select: "thumbnail"
    });

    if (!userPlaylists) {
        throw new ApiError(400, "Playlists not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, userPlaylists, "User Playlists Fetched Successfully")
        )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist Id");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
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
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    ]);

    const playlistData = playlist[0];

    if (playlistData.isPublic === false && playlistData.owner._id.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "This is a private playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlistData, "Playlist Fetched Successfully")
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID");
    }

    const targetPlaylist = await Playlist.findById(playlistId);
    if (!targetPlaylist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (targetPlaylist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to modify this playlist");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { 
                videos: videoId
            }
        },
        { new: true }
    )

    if (!playlist) {
        throw new ApiError(400, "Adding Video Failed")
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Video added to playlist."));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID");
    }

    const targetPlaylist = await Playlist.findById(playlistId);
    if (!targetPlaylist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (targetPlaylist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to modify this playlist");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        { new: true }
    )

    if (!playlist) {
        throw new ApiError(400, "Removing Video Failed")
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Video removed from playlist."));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId")
    }

    const targetPlaylist = await Playlist.findById(playlistId);
    if (!targetPlaylist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (targetPlaylist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this playlist");
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Removing Playlist Failed")
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist removed successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description, isPublic } = req.body;
   
   if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId")
    }

    if (!name) {
        throw new ApiError(400, "Name is required.")
    }

    const targetPlaylist = await Playlist.findById(playlistId);
    if (!targetPlaylist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (targetPlaylist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this playlist");
    }

    const updateFields = {
        name,
        description
    };

    if (isPublic !== undefined) {
        updateFields.isPublic = isPublic;
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: updateFields
        },
        { new: true }
    );

    if (!playlist) {
        throw new ApiError(400, "Updating Playlist Failed")
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist updated successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}