import { Request, Response } from "express";
import { orderCommandHandler } from "./command-handler";
import { orderQueryHandler } from "./query-handler";
import { createOrderValidator, updateOrderStatusValidator } from "../order.validator";
import { AddOrderDTO, OrderStatus } from "../order.types";
import { 
  CreateOrderCommand, 
  ChangeOrderStatusCommand, 
  CancelOrderCommand, 
  DeleteOrderCommand 
} from "../domain/commands";

class OrderController {
  /*
    |--------------------------------------------------------------------------
    | Order Controller - Proper CQRS Implementation
    |--------------------------------------------------------------------------
    |
    | This controller properly separates commands and queries following CQRS pattern.
    | Commands are handled by CommandHandler, queries by QueryHandler.
    | 
    */

  // COMMAND ENDPOINTS - Handle write operations
  async createOrder(req: Request, res: Response) {
    try {
      const payload: AddOrderDTO = req.body;
      createOrderValidator(payload);
      
      const command = new CreateOrderCommand(
        payload.customerName,
        payload.customerEmail,
        payload.items
      );
      
      const orderId = await orderCommandHandler.handleCreateOrder(command);
      
      res.json({
        message: "Order successfully created",
        orderId: orderId
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      updateOrderStatusValidator({ status });
      
      const command = new ChangeOrderStatusCommand(orderId, status);
      await orderCommandHandler.handleChangeOrderStatus(command);
      
      res.json({
        message: "Order status successfully updated",
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async cancelOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      
      const command = new CancelOrderCommand(orderId, reason || "Cancelled by user");
      await orderCommandHandler.handleCancelOrder(command);
      
      res.json({
        message: "Order successfully cancelled",
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async deleteOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      
      const command = new DeleteOrderCommand(orderId);
      await orderCommandHandler.handleDeleteOrder(command);
      
      res.json({
        message: "Order successfully deleted",
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  // QUERY ENDPOINTS - Handle read operations
  async getOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const order = await orderQueryHandler.getOrderById(orderId);
      
      res.json({
        data: order,
      });
    } catch (error: any) {
      console.log(error);
      if (error.message.includes("not found")) {
        res.status(404).json({
          error: error.message,
        });
      } else {
        res.status(500).json({
          error: error?.message,
        });
      }
    }
  }

  async getOrders(req: Request, res: Response) {
    try {
      const query = {
        status: req.query.status as string,
        customerEmail: req.query.customerEmail as string,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await orderQueryHandler.getOrders(query);
      
      res.json({
        data: result.orders,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total
        }
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async getOrdersByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;
      const orders = await orderQueryHandler.getOrdersByStatus(status);
      
      res.json({
        data: orders,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async getOrdersByCustomer(req: Request, res: Response) {
    try {
      const { customerEmail } = req.params;
      const orders = await orderQueryHandler.getOrdersByCustomer(customerEmail);
      
      res.json({
        data: orders,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async getOrderSummary(req: Request, res: Response) {
    try {
      const summary = await orderQueryHandler.getOrderSummary();
      
      res.json({
        data: summary,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async getTopCustomers(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const customers = await orderQueryHandler.getTopCustomers(limit);
      
      res.json({
        data: customers,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  async searchOrders(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({
          error: "Search query parameter 'q' is required",
        });
      }
      
      const orders = await orderQueryHandler.searchOrders(q as string);
      
      res.json({
        data: orders,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }
}

export default new OrderController();
