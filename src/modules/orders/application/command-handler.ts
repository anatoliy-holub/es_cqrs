import { OrderAggregate } from "../domain/order-aggregate";
import { eventStore } from "../infrastructure/event-store";
import { 
  CreateOrderCommand, 
  ChangeOrderStatusCommand, 
  CancelOrderCommand, 
  DeleteOrderCommand 
} from "../domain/commands";
import { eventBus } from "../infrastructure/event-bus";

export class OrderCommandHandler {
  async handleCreateOrder(command: CreateOrderCommand): Promise<string> {
    const orderId = this.generateOrderId();
    const aggregate = new OrderAggregate(orderId);
    
    try {
      aggregate.createOrder(command);
      
      // Save events to event store
      await eventStore.saveEvents(orderId, aggregate.uncommittedEvents, 0);
      
      // Publish events to event bus
      await eventBus.publishEvents(aggregate.uncommittedEvents);
      
      // Mark events as committed
      aggregate.markEventsAsCommitted();
      
      return orderId;
    } catch (error: any) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async handleChangeOrderStatus(command: ChangeOrderStatusCommand): Promise<void> {
    try {
      // Load aggregate from events
      const aggregate = await this.loadAggregate(command.orderId);
      
      // Apply command
      aggregate.changeStatus(command);
      
      // Save events to event store
      await eventStore.saveEvents(
        command.orderId, 
        aggregate.uncommittedEvents, 
        aggregate.version - aggregate.uncommittedEvents.length
      );
      
      // Publish events to event bus
      await eventBus.publishEvents(aggregate.uncommittedEvents);
      
      // Mark events as committed
      aggregate.markEventsAsCommitted();
    } catch (error: any) {
      throw new Error(`Failed to change order status: ${error.message}`);
    }
  }

  async handleCancelOrder(command: CancelOrderCommand): Promise<void> {
    try {
      // Load aggregate from events
      const aggregate = await this.loadAggregate(command.orderId);
      
      // Apply command
      aggregate.cancelOrder(command);
      
      // Save events to event store
      await eventStore.saveEvents(
        command.orderId, 
        aggregate.uncommittedEvents, 
        aggregate.version - aggregate.uncommittedEvents.length
      );
      
      // Publish events to event bus
      await eventBus.publishEvents(aggregate.uncommittedEvents);
      
      // Mark events as committed
      aggregate.markEventsAsCommitted();
    } catch (error: any) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  async handleDeleteOrder(command: DeleteOrderCommand): Promise<void> {
    try {
      // Load aggregate from events
      const aggregate = await this.loadAggregate(command.orderId);
      
      // Apply command
      aggregate.deleteOrder(command);
      
      // Save events to event store
      await eventStore.saveEvents(
        command.orderId, 
        aggregate.uncommittedEvents, 
        aggregate.version - aggregate.uncommittedEvents.length
      );
      
      // Publish events to event bus
      await eventBus.publishEvents(aggregate.uncommittedEvents);
      
      // Mark events as committed
      aggregate.markEventsAsCommitted();
    } catch (error: any) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  private async loadAggregate(orderId: string): Promise<OrderAggregate> {
    // Try to load from snapshot first
    const snapshot = await eventStore.getLatestSnapshot(orderId);
    let fromVersion = 0;
    
    if (snapshot) {
      fromVersion = snapshot.version;
    }

    // Load events from snapshot version
    const events = await eventStore.getEvents(orderId, fromVersion);
    
    if (events.length === 0) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Rebuild aggregate from events
    const aggregate = OrderAggregate.fromEvents(events.map(e => e.eventData));
    
    return aggregate;
  }

  private generateOrderId(): string {
    return `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const orderCommandHandler = new OrderCommandHandler();
