import { DomainEvent, OrderCreatedEvent, OrderStatusChangedEvent, OrderCancelledEvent, OrderDeletedEvent } from "../domain/events";
import OrderReadModel from "../read-models/order-read-model";
import OrderSummaryReadModel from "../read-models/order-summary-read-model";
import { EventHandler } from "../infrastructure/event-bus";

export class OrderProjectionHandler implements EventHandler {
  async handle(event: DomainEvent): Promise<void> {
    switch (event.constructor.name) {
      case 'OrderCreatedEvent':
        await this.handleOrderCreated(event as OrderCreatedEvent);
        break;
      case 'OrderStatusChangedEvent':
        await this.handleOrderStatusChanged(event as OrderStatusChangedEvent);
        break;
      case 'OrderCancelledEvent':
        await this.handleOrderCancelled(event as OrderCancelledEvent);
        break;
      case 'OrderDeletedEvent':
        await this.handleOrderDeleted(event as OrderDeletedEvent);
        break;
    }
  }

  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      // Create read model
      await new OrderReadModel({
        orderId: event.orderId,
        customerName: event.customerName,
        customerEmail: event.customerEmail,
        items: event.items,
        totalAmount: event.totalAmount,
        status: 'pending',
        orderDate: event.orderDate,
        statusHistory: [{
          status: 'pending',
          changedAt: event.occurredOn
        }],
        customerInfo: {
          name: event.customerName,
          email: event.customerEmail
        }
      }).save();

      // Update summary
      await this.updateOrderSummary();
    } catch (error) {
      console.error('Error handling OrderCreatedEvent:', error);
      throw error;
    }
  }

  private async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    try {
      const order = await OrderReadModel.findOne({ orderId: event.orderId });
      if (!order) {
        console.error(`Order not found for status change: ${event.orderId}`);
        return;
      }

      // Update status and add to history
      order.status = event.newStatus;
      order.statusHistory.push({
        status: event.newStatus,
        changedAt: event.changedAt
      });

      await order.save();

      // Update summary
      await this.updateOrderSummary();
    } catch (error) {
      console.error('Error handling OrderStatusChangedEvent:', error);
      throw error;
    }
  }

  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    try {
      const order = await OrderReadModel.findOne({ orderId: event.orderId });
      if (!order) {
        console.error(`Order not found for cancellation: ${event.orderId}`);
        return;
      }

      // Update status and add to history
      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        changedAt: event.cancelledAt
      });

      await order.save();

      // Update summary
      await this.updateOrderSummary();
    } catch (error) {
      console.error('Error handling OrderCancelledEvent:', error);
      throw error;
    }
  }

  private async handleOrderDeleted(event: OrderDeletedEvent): Promise<void> {
    try {
      // Remove from read model
      await OrderReadModel.deleteOne({ orderId: event.orderId });

      // Update summary
      await this.updateOrderSummary();
    } catch (error) {
      console.error('Error handling OrderDeletedEvent:', error);
      throw error;
    }
  }

  private async updateOrderSummary(): Promise<void> {
    try {
      // Aggregate data from all orders
      const orders = await OrderReadModel.find();
      
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      // Count orders by status
      const ordersByStatus: Record<string, number> = {};
      const revenueByStatus: Record<string, number> = {};
      
      orders.forEach(order => {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
        revenueByStatus[order.status] = (revenueByStatus[order.status] || 0) + order.totalAmount;
      });

      // Group by month
      const ordersByMonth: Array<{ month: string; year: number; count: number; revenue: number }> = [];
      const monthGroups: Record<string, { count: number; revenue: number }> = {};
      
      orders.forEach(order => {
        const date = new Date(order.orderDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = { count: 0, revenue: 0 };
        }
        
        monthGroups[monthKey].count++;
        monthGroups[monthKey].revenue += order.totalAmount;
      });

      Object.entries(monthGroups).forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        ordersByMonth.push({
          month: month,
          year: parseInt(year),
          count: data.count,
          revenue: data.revenue
        });
      });

      // Top customers
      const customerStats: Record<string, { name: string; count: number; total: number }> = {};
      
      orders.forEach(order => {
        if (!customerStats[order.customerEmail]) {
          customerStats[order.customerEmail] = {
            name: order.customerName,
            count: 0,
            total: 0
          };
        }
        
        customerStats[order.customerEmail].count++;
        customerStats[order.customerEmail].total += order.totalAmount;
      });

      const topCustomers = Object.entries(customerStats)
        .map(([email, stats]) => ({
          customerEmail: email,
          customerName: stats.name,
          orderCount: stats.count,
          totalSpent: stats.total
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Update or create summary
      const existingSummary = await OrderSummaryReadModel.findOne();
      
      if (existingSummary) {
        existingSummary.totalOrders = totalOrders;
        existingSummary.totalRevenue = totalRevenue;
        existingSummary.ordersByStatus = ordersByStatus;
        existingSummary.revenueByStatus = revenueByStatus;
        existingSummary.ordersByMonth = ordersByMonth;
        existingSummary.topCustomers = topCustomers;
        existingSummary.lastUpdated = new Date();
        await existingSummary.save();
      } else {
        await new OrderSummaryReadModel({
          totalOrders,
          totalRevenue,
          ordersByStatus,
          revenueByStatus,
          ordersByMonth,
          topCustomers,
          lastUpdated: new Date()
        }).save();
      }
    } catch (error) {
      console.error('Error updating order summary:', error);
      throw error;
    }
  }
}

export const orderProjectionHandler = new OrderProjectionHandler();
