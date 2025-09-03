import client from "../../config/redis";
import orderEventHandler from "../orders/order.events";
import { IOrder, IOrderCommand, IUpdateOrderStatusDTO, OrderStatus } from "../orders/order.types";
import { convertArrayParametersToObject } from "./helper";


enum Commands {
  create = "create",
  "update-status" = "update-status",
  delete = "delete",
}

const orderEvent = new orderEventHandler();

class EventHandler {
  async computeOrderRecord(): Promise<Array<IOrder>> {
    //XREAD records
    const events: any = await client.sendCommand([
      "XREAD",
      "STREAMS",
      "order_stream",
      "0-0",
    ]);
    if (!events) return [];
    const [_, records] = events[0];
    let orders: Array<IOrder> = [];
    for (const record of records) {
      let [__, orderData] = record;
      orderData = convertArrayParametersToObject(orderData);
      switch (orderData.command) {
        case Commands.create:
          orders.push({
            orderId: orderData.orderId,
            customerName: orderData.customerName,
            customerEmail: orderData.customerEmail,
            items: orderData.items,
            totalAmount: orderData.totalAmount,
            status: orderData.status,
            orderDate: orderData.orderDate,
          });
          break;
        case Commands["update-status"]:
          const orderIndex = orders.findIndex(order => order.orderId === orderData.orderId);
          if (orderIndex !== -1) {
            orders[orderIndex].status = orderData.status;
          }
          break;
        case Commands.delete:
          orders = orders.filter(
            (order) => order.orderId !== orderData.orderId
          );
          break;
      }
    }
    return orders;
  }

  async orderHandler(record: IOrderCommand) {
    try {
      await orderEvent.processOrder(record);
      const orders = await this.computeOrderRecord();
      await orderEvent.updateOrders(orders);
    } catch (error) {
      console.log(error);
    }
  }
}

export default new EventHandler();
