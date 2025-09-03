import { Request, Response } from "express";
import getOrdersModel from "./models/getOrders";
import getOrderModel from "./models/getOrder";
import orderCommandHandler from "./order.command";
import { createOrderValidator, updateOrderStatusValidator } from "./order.validator";
import { AddOrderDTO, OrderStatus } from "./order.types";

class OrdersController {
  /*
    |--------------------------------------------------------------------------
    | Orders Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles everything that has to do with Orders route. 
    | 
    |
    */

  /**
   * @param {Request} req this is the request coming from the client
   * @param {Response} res this is the http response given back to the client
   */
  async createOrder(req: Request, res: Response) {
    try {
      const payload: AddOrderDTO = req.body;
      createOrderValidator(payload);
      await orderCommandHandler.createOrder(payload);
      res.json({
        message: "Order successfully created",
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  /**
   * @param {Request} req this is the request coming from the client
   * @param {Response} res this is the http response given back to the client
   */
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      updateOrderStatusValidator({ status });
      await orderCommandHandler.updateOrderStatus(orderId, status);
      
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

  /**
   * @param {Request} req this is the request coming from the client
   * @param {Response} res this is the http response given back to the client
   */
  async deleteOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      await orderCommandHandler.deleteOrder(orderId);
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

  /**
   * @param {Request} req this is the request coming from the client
   * @param {Response} res this is the http response given back to the client
   */
  async getOrders(req: Request, res: Response) {
    try {
      const orders = await getOrdersModel.find();
      return res.json({
        data: orders,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  /**
   * @param {Request} req this is the request coming from the client
   * @param {Response} res this is the http response given back to the client
   */
  async getOrder(req: Request, res: Response) {
    try {
      const order = await getOrderModel.findOne({ orderId: req.params.orderId });
      if (!order) {
        return res.status(404).json({
          error: "Order not found",
        });
      }
      return res.json({
        data: order,
      });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: error?.message,
      });
    }
  }

  /**
   * @param {Request} req this is the request coming from the client
   * @param {Response} res this is the http response given back to the client
   */
  async getOrdersByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;
      const orders = await getOrderModel.find({ status });
      return res.json({
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

export default new OrdersController();
