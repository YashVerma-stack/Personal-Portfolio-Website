import express from "express";
import { getAllMessage, sendMessage } from "../controller/messageController.js";

const router = express.Router();

router.post("/send", sendMessage);
router.get("/send", getAllMessage);

export default router;