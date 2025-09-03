export interface IOrder {
    orderId: string;
    customerName?: string;
    customerEmail?: string;
    items?: Array<IOrderItem>;
    totalAmount?: number;
    status?: OrderStatus;
    orderDate?: Date;
}

export interface IOrderItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface AddOrderDTO {
    customerName: string;
    customerEmail: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
    }>;
}

export interface IUpdateOrderStatusDTO {
    status: OrderStatus;
    updatedAt: Date;
}

export interface IOrderCommand extends IOrder {
    command: string;
    updatedAt?: Date;
}

export interface IOrderStatusCommand {
    orderId: string;
    status?: OrderStatus;
}

export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}
