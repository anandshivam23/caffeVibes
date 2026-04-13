import { Router } from "express";
import { chatWithAI } from "../controllers/chat.controller.js";
import { optionalVerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", optionalVerifyJWT, chatWithAI);


export default router;