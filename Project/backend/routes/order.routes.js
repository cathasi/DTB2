// routes/order.routes.js
import { Router } from "express";
import { createOrder } from "../controllers/order.controller.js";

const router = Router();

// CheckoutPage
router.post("/orders", createOrder);

export default router;
