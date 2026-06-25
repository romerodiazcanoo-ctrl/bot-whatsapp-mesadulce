import { Router } from "express";
import {
  verifyWebhook,
  handleIncomingMessage,
} from "../controllers/webhookController.js";

const router = Router();

// Meta llama GET para verificar el webhook al configurarlo
router.get("/", verifyWebhook);

// Meta llama POST para enviar mensajes entrantes
router.post("/", handleIncomingMessage);

export default router;
