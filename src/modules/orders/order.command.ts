import { v4 as uuid } from "uuid";
import client from "../../config/redis";
import { convertObjectToParameters } from "../app/helper";
import eventHandler from "../app/eventHandler";
import getOrderModel from "./models/getOrder";
import { AddOrderDTO, OrderStatus } from "./order.types";

class OrderCommandHandler {
  private generateOrderId() {
    return uuid();
  }

  private calculateTotalAmount(items: Array<{ quantity: number; price: number }>) {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  }

  private calculateSubtotal(quantity: number, price: number) {
    return quantity * price;
  }

  async createOrder(payload: AddOrderDTO) {
    const { customerName, customerEmail, items } = payload;
    
    // Validate that items array is not empty
    if (!items || items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    const orderId = this.generateOrderId();
    const totalAmount = this.calculateTotalAmount(items);
    
    // Calculate subtotal for each item
    const processedItems = items.map(item => ({
      ...item,
      subtotal: this.calculateSubtotal(item.quantity, item.price)
    }));

    const orderData = {
      orderId,
      customerName,
      customerEmail,
      items: processedItems,
      totalAmount,
      status: OrderStatus.PENDING,
      orderDate: new Date(),
      command: "create",
    };

    const parameters = convertObjectToParameters(orderData);
    await client.sendCommand(["XADD", "order_stream", "*", ...parameters]);
    
    // Process the event immediately
    eventHandler.orderHandler(orderData);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await getOrderModel.findOne({ orderId }).lean();
    if (!order) throw new Error("Order not found");

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: []
    };

    if (!validTransitions[order.status].includes(status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    }

    const orderData = {
      orderId,
      status,
      updatedAt: new Date(),
      command: "update-status",
    };

    const parameters = convertObjectToParameters(orderData);
    await client.sendCommand(["XADD", "order_stream", "*", ...parameters]);
    
    eventHandler.orderHandler(orderData);
  }

  async deleteOrder(orderId: string) {
    const order = await getOrderModel.findOne({ orderId }).lean();
    if (!order) throw new Error("Order not found");

    // Only allow deletion of pending or cancelled orders
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CANCELLED) {
      throw new Error("Only pending or cancelled orders can be deleted");
    }

    const orderData = {
      orderId,
      command: "delete",
    };

    const parameters = convertObjectToParameters(orderData);
    await client.sendCommand(["XADD", "order_stream", "*", ...parameters]);
    
    eventHandler.orderHandler(orderData);
  }
}

export default new OrderCommandHandler();
