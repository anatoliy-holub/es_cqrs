import mongoose, { Schema, Document } from "mongoose";

// Summary Read Model - For dashboard and analytics
export interface IOrderSummaryReadModel extends Document {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  revenueByStatus: Record<string, number>;
  ordersByMonth: Array<{
    month: string;
    year: number;
    count: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerEmail: string;
    customerName: string;
    orderCount: number;
    totalSpent: number;
  }>;
  lastUpdated: Date;
}

const OrderSummaryReadModelSchema = new Schema<IOrderSummaryReadModel>(
  {
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    ordersByStatus: {
      type: Map,
      of: Number,
      default: {},
    },
    revenueByStatus: {
      type: Map,
      of: Number,
      default: {},
    },
    ordersByMonth: [
      {
        _id: false,
        month: String,
        year: Number,
        count: Number,
        revenue: Number,
      },
    ],
    topCustomers: [
      {
        _id: false,
        customerEmail: String,
        customerName: String,
        orderCount: Number,
        totalSpent: Number,
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrderSummaryReadModel>("OrderSummaryReadModel", OrderSummaryReadModelSchema);
