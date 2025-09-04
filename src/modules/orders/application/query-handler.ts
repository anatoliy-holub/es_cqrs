import OrderReadModel from "../read-models/order-read-model";
import OrderSummaryReadModel from "../read-models/order-summary-read-model";

export interface OrderQuery {
  orderId?: string;
  status?: string;
  customerEmail?: string;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export interface OrderListResult {
  orders: any[];
  total: number;
  limit: number;
  offset: number;
}

export class OrderQueryHandler {
  async getOrderById(orderId: string): Promise<any> {
    const order = await OrderReadModel.findOne({ orderId });
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    return order;
  }

  async getOrders(query: OrderQuery): Promise<OrderListResult> {
    const filter: any = {};

    // Build filter based on query parameters
    if (query.status) {
      filter.status = query.status;
    }

    if (query.customerEmail) {
      filter.customerEmail = query.customerEmail;
    }

    if (query.fromDate || query.toDate) {
      filter.orderDate = {};
      if (query.fromDate) {
        filter.orderDate.$gte = query.fromDate;
      }
      if (query.toDate) {
        filter.orderDate.$lte = query.toDate;
      }
    }

    if (query.minAmount || query.maxAmount) {
      filter.totalAmount = {};
      if (query.minAmount) {
        filter.totalAmount.$gte = query.minAmount;
      }
      if (query.maxAmount) {
        filter.totalAmount.$lte = query.maxAmount;
      }
    }

    // Get total count
    const total = await OrderReadModel.countDocuments(filter);

    // Get orders with pagination
    const limit = query.limit || 10;
    const offset = query.offset || 0;

    const orders = await OrderReadModel.find(filter)
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip(offset);

    return {
      orders,
      total,
      limit,
      offset
    };
  }

  async getOrdersByStatus(status: string): Promise<any[]> {
    return await OrderReadModel.find({ status }).sort({ orderDate: -1 });
  }

  async getOrdersByCustomer(customerEmail: string): Promise<any[]> {
    return await OrderReadModel.find({ customerEmail }).sort({ orderDate: -1 });
  }

  async getOrderSummary(): Promise<any> {
    const summary = await OrderSummaryReadModel.findOne();
    if (!summary) {
      // If no summary exists, create a basic one
      return {
        totalOrders: 0,
        totalRevenue: 0,
        ordersByStatus: {},
        revenueByStatus: {},
        ordersByMonth: [],
        topCustomers: [],
        lastUpdated: new Date()
      };
    }
    return summary;
  }

  async getOrdersByDateRange(fromDate: Date, toDate: Date): Promise<any[]> {
    return await OrderReadModel.find({
      orderDate: {
        $gte: fromDate,
        $lte: toDate
      }
    }).sort({ orderDate: -1 });
  }

  async getTopCustomers(limit: number = 10): Promise<any[]> {
    const summary = await this.getOrderSummary();
    return summary.topCustomers.slice(0, limit);
  }

  async getRevenueByStatus(): Promise<Record<string, number>> {
    const summary = await this.getOrderSummary();
    return summary.revenueByStatus;
  }

  async getOrdersByMonth(year: number, month: number): Promise<any[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return await OrderReadModel.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ orderDate: -1 });
  }

  async searchOrders(searchTerm: string): Promise<any[]> {
    // Search by customer name or email
    return await OrderReadModel.find({
      $or: [
        { customerName: { $regex: searchTerm, $options: 'i' } },
        { customerEmail: { $regex: searchTerm, $options: 'i' } },
        { 'items.productName': { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ orderDate: -1 });
  }
}

export const orderQueryHandler = new OrderQueryHandler();
