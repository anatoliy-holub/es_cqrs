import express from "express";
import orderController from "./order.controller";

const router = express.Router();

//GET
router.get("/", orderController.getOrders);
router.get("/order/:orderId", orderController.getOrder);
router.get("/status/:status", orderController.getOrdersByStatus);

//POST
router.post("/order", orderController.createOrder);

//PUT
router.put("/order/:orderId/status", orderController.updateOrderStatus);

//DELETE
router.delete("/order/:orderId", orderController.deleteOrder);

export default router;
