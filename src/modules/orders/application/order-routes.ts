import express from "express";
import orderController from "./order-controller";

const router = express.Router();

// QUERY ROUTES - Read operations
router.get("/", orderController.getOrders);
router.get("/summary", orderController.getOrderSummary);
router.get("/top-customers", orderController.getTopCustomers);
router.get("/search", orderController.searchOrders);
router.get("/order/:orderId", orderController.getOrder);
router.get("/status/:status", orderController.getOrdersByStatus);
router.get("/customer/:customerEmail", orderController.getOrdersByCustomer);

// COMMAND ROUTES - Write operations
router.post("/order", orderController.createOrder);
router.put("/order/:orderId/status", orderController.updateOrderStatus);
router.put("/order/:orderId/cancel", orderController.cancelOrder);
router.delete("/order/:orderId", orderController.deleteOrder);

export default router;
