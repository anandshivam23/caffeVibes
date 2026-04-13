import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAIResponse } from "../services/ai.service.js";

export const chatWithAI = asyncHandler(async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new ApiError(400, "Messages must be a non-empty array");
    }

    for (const msg of messages) {
        if (!msg.role || !msg.content) {
            throw new ApiError(400, "Each message must have role and content");
        }
    }

    const reply = await generateAIResponse(messages);
    console.log("Chats replies are here.. ",reply);
    if (req.io) {
        req.io.emit("ai:response", {
            message: reply,
        });
    }

    return res.status(200).json(
        new ApiResponse(200, reply, "AI response generated successfully")
    );
});