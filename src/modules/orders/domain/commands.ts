// Commands - These represent what the user wants to do
export abstract class Command {
  public readonly commandId: string;
  public readonly timestamp: Date;

  constructor() {
    this.commandId = this.generateCommandId();
    this.timestamp = new Date();
  }

  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class CreateOrderCommand extends Command {
  constructor(
    public readonly customerName: string,
    public readonly customerEmail: string,
    public readonly items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>
  ) {
    super();
  }
}

export class ChangeOrderStatusCommand extends Command {
  constructor(
    public readonly orderId: string,
    public readonly newStatus: string
  ) {
    super();
  }
}

export class CancelOrderCommand extends Command {
  constructor(
    public readonly orderId: string,
    public readonly reason: string
  ) {
    super();
  }
}

export class DeleteOrderCommand extends Command {
  constructor(
    public readonly orderId: string
  ) {
    super();
  }
}
