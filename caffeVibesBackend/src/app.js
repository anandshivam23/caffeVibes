import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { createServer } from "http"
import { Server } from "socket.io"

const app = express()
const server = createServer(app)

const io = new Server(server, {
    cors: {
        origin: "https://caffevibes.vercel.app",
        credentials: true
    }
})


app.use((req, res, next) => {
    req.io = io
    next()
})

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id)
    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id)
    })
})

app.use(cors({
    origin: "https://caffevibes.vercel.app",
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
//routes import
import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import dislikeRouter from "./routes/dislike.routes.js"
import chatRouter from "./routes/chat.routes.js"
import notificationRouter from "./routes/notification.routes.js"

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/dislikes", dislikeRouter)
app.use("/api/v1/chat", chatRouter)
app.use("/api/v1/notifications", notificationRouter)

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500
    const message = err.message || "Internal Server Error"
    return res.status(statusCode).json({
        success: false,
        message,
        errors: err.errors || [],
    })
})

export { app, server, io }