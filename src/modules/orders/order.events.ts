import client from "../../config/redis";
import getOrderModel from "./models/getOrder";
import getOrdersModel from "./models/getOrders";
import { IOrder, IOrderCommand, IUpdateOrderStatusDTO, OrderStatus } from "./order.types";

enum Commands {
  create = "create",
  "update-status" = "update-status",
  delete = "delete",
}

class orderEventHandler {
  async processOrder(record: IOrderCommand) {
    switch (record.command) {
      case Commands.create:
        await new getOrderModel({
          orderId: record.orderId,
          customerName: record.customerName,
          customerEmail: record.customerEmail,
          items: record.items,
          totalAmount: record.totalAmount,
          status: record.status,
          orderDate: record.orderDate,
        }).save();
        break;
      case Commands["update-status"]:
        await getOrderModel.updateOne(
          { orderId: record.orderId },
          { 
            status: record.status,
            updatedAt: record.updatedAt || new Date()
          }
        );
        break;
      case Commands.delete:
        await getOrderModel.deleteOne({ orderId: record.orderId });
        break;
    }
  }

  async updateOrder(orderId: string, orderData: IUpdateOrderStatusDTO) {
    await getOrderModel.updateOne(
      { orderId },
      { ...orderData }
    );
  }

  async updateOrders(orders: Array<IOrder>) {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const allOrders = await getOrdersModel.findOne({});
    if (allOrders) {
      allOrders.orders = orders;
      allOrders.totalOrders = orders.length;
      allOrders.totalRevenue = totalRevenue;
      await allOrders.save();
    } else {
      await new getOrdersModel({
        orders,
        totalOrders: orders.length,
        totalRevenue,
      }).save();
    }
  }
}

export default orderEventHandler;
