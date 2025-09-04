import { v4 as uuid } from "uuid";
import { OrderStatus } from "../order.types";
import { 
  CreateOrderCommand, 
  ChangeOrderStatusCommand, 
  CancelOrderCommand, 
  DeleteOrderCommand 
} from "./commands";
import { 
  OrderCreatedEvent, 
  OrderStatusChangedEvent, 
  OrderCancelledEvent, 
  OrderDeletedEvent 
} from "./events";

export class OrderAggregate {
  private _id: string;
  private _version: number = 0;
  private _uncommittedEvents: any[] = [];
  private _status: OrderStatus = OrderStatus.PENDING;
  private _customerName: string = "";
  private _customerEmail: string = "";
  private _items: any[] = [];
  private _totalAmount: number = 0;
  private _orderDate: Date = new Date();
  private _isDeleted: boolean = false;

  constructor(id?: string) {
    this._id = id || uuid();
  }

  // Getters
  get id(): string { return this._id; }
  get version(): number { return this._version; }
  get status(): OrderStatus { return this._status; }
  get customerName(): string { return this._customerName; }
  get customerEmail(): string { return this._customerEmail; }
  get items(): any[] { return this._items; }
  get totalAmount(): number { return this._totalAmount; }
  get orderDate(): Date { return this._orderDate; }
  get isDeleted(): boolean { return this._isDeleted; }
  get uncommittedEvents(): any[] { return this._uncommittedEvents; }

  // Command handlers
  createOrder(command: CreateOrderCommand): void {
    if (this._version > 0) {
      throw new Error("Order already exists");
    }

    if (!command.items || command.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    const totalAmount = command.items.reduce((total, item) => total + (item.quantity * item.price), 0);
    const processedItems = command.items.map(item => ({
      ...item,
      subtotal: item.quantity * item.price
    }));

    const event = new OrderCreatedEvent(
      this._id,
      command.customerName,
      command.customerEmail,
      processedItems,
      totalAmount,
      new Date(),
      this._version + 1
    );

    this.applyEvent(event);
  }

  changeStatus(command: ChangeOrderStatusCommand): void {
    if (this._isDeleted) {
      throw new Error("Cannot change status of deleted order");
    }

    if (this._id !== command.orderId) {
      throw new Error("Order ID mismatch");
    }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: []
    };

    if (!validTransitions[this._status].includes(command.newStatus as OrderStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${command.newStatus}`);
    }

    const event = new OrderStatusChangedEvent(
      this._id,
      this._status,
      command.newStatus,
      new Date(),
      this._version + 1
    );

    this.applyEvent(event);
  }

  cancelOrder(command: CancelOrderCommand): void {
    if (this._isDeleted) {
      throw new Error("Cannot cancel deleted order");
    }

    if (this._id !== command.orderId) {
      throw new Error("Order ID mismatch");
    }

    if (this._status === OrderStatus.DELIVERED) {
      throw new Error("Cannot cancel delivered order");
    }

    const event = new OrderCancelledEvent(
      this._id,
      command.reason,
      new Date(),
      this._version + 1
    );

    this.applyEvent(event);
  }

  deleteOrder(command: DeleteOrderCommand): void {
    if (this._isDeleted) {
      throw new Error("Order already deleted");
    }

    if (this._id !== command.orderId) {
      throw new Error("Order ID mismatch");
    }

    if (this._status !== OrderStatus.PENDING && this._status !== OrderStatus.CANCELLED) {
      throw new Error("Only pending or cancelled orders can be deleted");
    }

    const event = new OrderDeletedEvent(
      this._id,
      new Date(),
      this._version + 1
    );

    this.applyEvent(event);
  }

  // Event application
  private applyEvent(event: any): void {
    this._uncommittedEvents.push(event);
    this.applyEventToState(event);
  }

  private applyEventToState(event: any): void {
    switch (event.constructor.name) {
      case 'OrderCreatedEvent':
        this._status = OrderStatus.PENDING;
        this._customerName = event.customerName;
        this._customerEmail = event.customerEmail;
        this._items = event.items;
        this._totalAmount = event.totalAmount;
        this._orderDate = event.orderDate;
        break;
      case 'OrderStatusChangedEvent':
        this._status = event.newStatus as OrderStatus;
        break;
      case 'OrderCancelledEvent':
        this._status = OrderStatus.CANCELLED;
        break;
      case 'OrderDeletedEvent':
        this._isDeleted = true;
        break;
    }
    this._version = event.version;
  }

  // Replay events (for rebuilding from event store)
  static fromEvents(events: any[]): OrderAggregate {
    const aggregate = new OrderAggregate();
    events.forEach(event => {
      aggregate.applyEventToState(event);
    });
    return aggregate;
  }

  // Mark events as committed
  markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }
}
