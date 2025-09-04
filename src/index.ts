import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

// configurations
dotenv.config();
import "./config/mongoose";
import "./config/redis";
import AppRoutes from "./modules/app/app.route";
import { orderService } from "./modules/orders/application/order-service";

// Boot express
const app: Application = express();
const port = process.env.PORT || 3000;
const base: string = process.env.base_url ?? "/api/v1";

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Application routing
app.get("/", (req: Request, res: Response) => {
  res.status(200).send({ data: "Order Management System with CQRS + Event Sourcing" });
});
app.use(base, AppRoutes);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize order service (CQRS + Event Sourcing)
    await orderService.initialize();
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server is listening on port ${port}!`);
      console.log(`📊 Order Management System with CQRS + Event Sourcing is ready!`);
      console.log(`🔗 API Base URL: http://localhost:${port}${base}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle unhandled promise rejections and exceptions
process.on("unhandledRejection", (err: any) => {
  console.log(err);
});

process.on("uncaughtException", (err: any) => {
  console.log(err.message);
});
