// Domain Events - These represent what happened in the business
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly eventType: string;
  public readonly version: number;

  constructor(aggregateId: string, version: number) {
    this.aggregateId = aggregateId;
    this.version = version;
    this.occurredOn = new Date();
    this.eventId = this.generateEventId();
    this.eventType = this.constructor.name;
  }

  private generateEventId(): string {
    return `${this.eventType}-${this.aggregateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerName: string,
    public readonly customerEmail: string,
    public readonly items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>,
    public readonly totalAmount: number,
    public readonly orderDate: Date,
    version: number = 1
  ) {
    super(orderId, version);
  }
}

export class OrderStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly changedAt: Date,
    version: number
  ) {
    super(orderId, version);
  }
}

export class OrderCancelledEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
    public readonly cancelledAt: Date,
    version: number
  ) {
    super(orderId, version);
  }
}

export class OrderDeletedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly deletedAt: Date,
    version: number
  ) {
    super(orderId, version);
  }
}
