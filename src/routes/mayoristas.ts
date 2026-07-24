import { Router } from "express";
import { submitPostulacionMayorista } from "../controllers/mayoristasController.js";

const router = Router();

router.post("/", submitPostulacionMayorista);

export default router;
