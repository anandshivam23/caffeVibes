import mongoose, {Schema} from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['tweet', 'joke'],
        default: 'tweet'
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    parentTweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet",
        default: null
    }
}, {timestamps: true})

export const Tweet = mongoose.model("Tweet", tweetSchema)