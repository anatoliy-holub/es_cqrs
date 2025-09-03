import mongoose, { Schema, Document } from "mongoose";
import { IOrder } from "../order.types";

interface IGetOrdersDocument extends Document {
  orders: Array<IOrder>;
  totalOrders: number;
  totalRevenue: number;
}

const GetOrdersSchema = new Schema<IGetOrdersDocument>(
  {
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    orders: [
      {
        _id: false,
        orderId: String,
        customerName: String,
        customerEmail: String,
        totalAmount: Number,
        status: String,
        orderDate: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IGetOrdersDocument>(
  "AllOrders",
  GetOrdersSchema
);
