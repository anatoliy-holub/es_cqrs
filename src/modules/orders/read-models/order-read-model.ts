import mongoose, { Schema, Document } from "mongoose";

// Read Model - Optimized for queries, separate from write model
export interface IOrderReadModel extends Document {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  totalAmount: number;
  status: string;
  orderDate: Date;
  updatedAt: Date;
  // Additional fields for query optimization
  statusHistory: Array<{
    status: string;
    changedAt: Date;
  }>;
  customerInfo: {
    name: string;
    email: string;
  };
}

const OrderReadModelSchema = new Schema<IOrderReadModel>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      index: true,
    },
    items: [
      {
        _id: false,
        productId: {
          type: String,
          required: true,
          index: true,
        },
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      index: true,
    },
    orderDate: {
      type: Date,
      required: true,
      index: true,
    },
    statusHistory: [
      {
        _id: false,
        status: String,
        changedAt: Date,
      },
    ],
    customerInfo: {
      _id: false,
      name: String,
      email: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
OrderReadModelSchema.index({ status: 1, orderDate: -1 });
OrderReadModelSchema.index({ customerEmail: 1, orderDate: -1 });
OrderReadModelSchema.index({ totalAmount: 1 });
OrderReadModelSchema.index({ orderDate: -1 });

export default mongoose.model<IOrderReadModel>("OrderReadModel", OrderReadModelSchema);
