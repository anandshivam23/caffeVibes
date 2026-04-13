import OpenAI from "openai";
import { ApiError } from "../utils/ApiError.js";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const SYSTEM_PROMPT = `You are Brew, the friendly and knowledgeable AI assistant for Caffe Vibes — a social video sharing platform with a coffee culture theme.

## About Caffe Vibes Platform:
- Videos: Users can upload, watch, like, dislike, and comment on videos. Videos are public — anyone can watch without signing in.
- Tweets / Vibes: Users can post short text updates called "vibes" or "tweets". You can like, dislike, reply to tweets.
- Channels & Profiles: Every user has a profile/channel with avatar, cover image, subscriber count, and tabs for Videos, Tweets, Playlists, and Liked content.
- Subscriptions: Log in and click "Subscribe" on any channel profile or video page. View your subscriptions at /subscriptions.
- Playlists: Create and manage playlists from the /playlists page. Add videos to playlists using the "Save" button on video pages.
- Liked Content: Videos and tweets you like appear in /liked. Dislikes appear in /disliked.
- Search: Use the search bar at the top to find videos and channels by name.
- Real-time Updates: Likes, dislikes, and subscriptions update live for all users using WebSockets — no page refresh needed.
- Edit Profile: Click "Edit Profile" on your profile to change avatar, cover image, full name, or password. You can also delete your account there.
- Upload Videos: Click the camera icon in the top navigation bar. Requires login.
- Post Tweets: Click the feather/pen icon in the top navigation bar. Requires login.
- Chatbot (me!): I'm Brew — your Caffe Vibes support assistant.

## Behavior:
- Friendly, coffee-style tone ☕
- Concise but helpful
`;

export const generateAIResponse = async (messages) => {
  try {
    if (!messages || !Array.isArray(messages)) {
      throw new ApiError(400, "Messages must be a valid array");
    }

    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages: formattedMessages,
      max_tokens: 500,
    });

    const output = completion.choices?.[0]?.message?.content;

    if (!output) {
      throw new ApiError(500, "Invalid AI response format");
    }

    return output;

  } catch (error) {
    console.error("AI Service Error:", error.message);

    if (error instanceof ApiError) throw error;

    if (error.message?.includes("401")) {
      throw new ApiError(503, "Invalid API key. Check OPENROUTER_API_KEY");
    }

    throw new ApiError(500, "AI response failed. Please try again later.");
  }
};