import path from "path";
import express from "express";
import webhookRouter from "./routes/webhook.js";
import mayoristasRouter from "./routes/mayoristas.js";
import { logger } from "./utils/logger.js";

export function createApp(): express.Application {
  const app = express();

  // Parseamos el body como JSON (necesario para los webhooks de Meta)
  app.use(express.json());

  // Archivos estáticos (formularios, landing pages, etc.)
  app.use(express.static(path.join(__dirname, "..", "public")));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Webhook de WhatsApp
  app.use("/webhook", webhookRouter);

  // Postulaciones de mayoristas (formulario web)
  app.use("/api/mayoristas", mayoristasRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler global
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error("Unhandled error", { message: err.message, stack: err.stack });
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
